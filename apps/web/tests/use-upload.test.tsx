import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { useUpload } from '../src/features/media/hooks/useUpload';
import type { MediaItem } from '../src/features/media/types/media.types';

const mockUploader = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };

const mockMediaItem: MediaItem = {
  id: 'media-new',
  filename: 'test.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  url: 'https://cdn.example.com/test.jpg',
  uploadedBy: mockUploader,
  usedInCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpload', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
  });

  it('rejects unsupported file types', async () => {
    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });

    await act(async () => {
      await expect(
        result.current.upload(new File([''], 'test.txt', { type: 'text/plain' })),
      ).rejects.toThrow(/unsupported file type/i);
    });

    expect(result.current.status).toBe('error');
  });

  it('rejects files larger than 20 MB', async () => {
    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });
    const bigContent = new Uint8Array(21 * 1024 * 1024);
    const bigFile = new File([bigContent], 'big.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await expect(result.current.upload(bigFile)).rejects.toThrow(/20 MB/i);
    });

    expect(result.current.status).toBe('error');
  });

  it('completes presign → upload → finalize flow', async () => {
    server.use(
      http.post('/api/admin/media/presign', () =>
        HttpResponse.json({ uploadUrl: 'http://localhost/s3/upload', key: 'media/test.jpg' }),
      ),
      http.put('http://localhost/s3/upload', () => new HttpResponse(null, { status: 200 })),
      http.post('/api/admin/media', () => HttpResponse.json(mockMediaItem)),
    );

    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    let returned: MediaItem | undefined;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(returned).toEqual(mockMediaItem);
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toBe(100);
  });

  it('sets status to error when presign fails', async () => {
    server.use(
      http.post('/api/admin/media/presign', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await expect(result.current.upload(file)).rejects.toThrow();
    });

    await waitFor(() => { expect(result.current.status).toBe('error'); });
  });

  it('sets status to error when S3 upload fails', async () => {
    server.use(
      http.post('/api/admin/media/presign', () =>
        HttpResponse.json({ uploadUrl: 'http://localhost/s3/upload', key: 'media/test.jpg' }),
      ),
      http.put('http://localhost/s3/upload', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useUpload(), { wrapper: makeWrapper() });
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await expect(result.current.upload(file)).rejects.toThrow();
    });

    await waitFor(() => { expect(result.current.status).toBe('error'); });
  });

  it('accepts allowed MIME types (image/png, image/webp, image/gif, image/svg+xml, application/pdf)', async () => {
    const allowedTypes = [
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
    ];

    for (const mimeType of allowedTypes) {
      server.use(
        http.post('/api/admin/media/presign', () =>
          HttpResponse.json({ uploadUrl: 'http://localhost/s3/upload', key: `media/file` }),
        ),
        http.put('http://localhost/s3/upload', () => new HttpResponse(null, { status: 200 })),
        http.post('/api/admin/media', () => HttpResponse.json(mockMediaItem)),
      );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
      });
      const { result } = renderHook(() => useUpload(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      const file = new File(['content'], 'file', { type: mimeType });
      await act(async () => {
        await result.current.upload(file);
      });

      expect(result.current.status).toBe('done');
    }
  });
});
