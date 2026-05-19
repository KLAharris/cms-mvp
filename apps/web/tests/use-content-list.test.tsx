import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { useContentList } from '../src/features/content/hooks/useContentList';
import type { ContentListResponse, ContentItem } from '../src/features/content/types/content.types';

const mockItems: ContentItem[] = [
  {
    id: 'item-1',
    title: 'Article One',
    slug: 'article-one',
    type: 'article',
    status: 'published',
    author: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'item-2',
    title: 'Article Two',
    slug: 'article-two',
    type: 'article',
    status: 'draft',
    author: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    tags: ['react'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
  },
  {
    id: 'item-3',
    title: 'Article Three',
    slug: 'article-three',
    type: 'article',
    status: 'in_review',
    author: { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
    tags: [],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
  },
];

const mockListResponse: ContentListResponse = {
  items: mockItems,
  total: 3,
  page: 1,
  pageSize: 20,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useContentList', () => {
  it('returns data when API responds successfully', async () => {
    server.use(
      http.get('/api/admin/content', () => {
        return HttpResponse.json(mockListResponse);
      }),
    );

    const { result } = renderHook(
      () => useContentList({ type: 'article' }),
      { wrapper: makeWrapper() },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.data?.total).toBe(3);
    expect(result.current.data?.items[0]?.title).toBe('Article One');
  });

  it('shows loading state initially', () => {
    server.use(
      http.get('/api/admin/content', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return HttpResponse.json(mockListResponse);
      }),
    );

    const { result } = renderHook(
      () => useContentList({ type: 'article' }),
      { wrapper: makeWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state when API fails', async () => {
    server.use(
      http.get('/api/admin/content', () => {
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
      }),
    );

    const { result } = renderHook(
      () => useContentList({ type: 'article' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('passes query params to the API', async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get('/api/admin/content', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
      }),
    );

    const { result } = renderHook(
      () => useContentList({ type: 'article', status: 'draft', page: 2 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedUrl).toContain('type=article');
    expect(capturedUrl).toContain('status=draft');
    expect(capturedUrl).toContain('page=2');
  });
});
