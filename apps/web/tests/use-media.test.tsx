import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { useMedia } from '../src/features/media/hooks/useMedia';
import type { MediaListResponse, MediaItem } from '../src/features/media/types/media.types';

const mockItems: MediaItem[] = [
  {
    id: 'media-1',
    filename: 'hero.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 102400,
    uploadedBy: 'user-1',
    uploadedAt: '2024-01-01T00:00:00Z',
    status: 'ready',
    requiresSanitization: false,
    variants: {
      original: { url: 'https://cdn.example.com/hero.jpg', expiresAt: '2025-01-01T00:00:00Z' },
    },
  },
  {
    id: 'media-2',
    filename: 'team.png',
    mimeType: 'image/png',
    sizeBytes: 204800,
    uploadedBy: 'user-1',
    uploadedAt: '2024-01-02T00:00:00Z',
    status: 'ready',
    requiresSanitization: false,
    variants: {
      original: { url: 'https://cdn.example.com/team.png', expiresAt: '2025-01-01T00:00:00Z' },
    },
  },
];

const mockListResponse: MediaListResponse = {
  items: mockItems,
  total: 2,
  page: 1,
  pageSize: 20,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMedia', () => {
  it('returns data when API responds successfully', async () => {
    server.use(
      http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)),
    );

    const { result } = renderHook(() => useMedia({}), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[0]?.filename).toBe('hero.jpg');
  });

  it('passes search param to API', async () => {
    let capturedUrl: string | undefined;
    server.use(
      http.get('/api/admin/media', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );

    const { result } = renderHook(
      () => useMedia({ search: 'hero' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => { expect(result.current.isSuccess).toBe(true); });
    expect(capturedUrl).toContain('search=hero');
  });

  it('passes type filter param to API', async () => {
    let capturedUrl: string | undefined;
    server.use(
      http.get('/api/admin/media', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );

    const { result } = renderHook(
      () => useMedia({ type: 'image' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => { expect(result.current.isSuccess).toBe(true); });
    expect(capturedUrl).toContain('type=image');
  });

  it('handles error state when API fails', async () => {
    server.use(
      http.get('/api/admin/media', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useMedia({}), { wrapper: makeWrapper() });

    await waitFor(() => { expect(result.current.isError).toBe(true); });
    expect(result.current.data).toBeUndefined();
  });

  it('returns loading state initially', () => {
    server.use(
      http.get('/api/admin/media', async () => {
        await new Promise((r) => setTimeout(r, 1000));
        return HttpResponse.json(mockListResponse);
      }),
    );

    const { result } = renderHook(() => useMedia({}), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});
