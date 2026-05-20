import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { ContentEditorPage } from '../src/features/content/pages/ContentEditorPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { ContentItem } from '../src/features/content/types/content.types';

const draftItem: ContentItem = {
  id: 'content-1',
  title: 'My Draft Article',
  slug: 'my-draft-article',
  type: 'article',
  status: 'draft',
  authorId: 'user-1',
  author: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
  tags: [],
  body: { type: 'doc', content: [] },
  seo: { metaTitle: '', metaDescription: '' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

const inReviewItem: ContentItem = {
  ...draftItem,
  id: 'content-2',
  status: 'in_review',
};

const publishedItem: ContentItem = {
  ...draftItem,
  id: 'content-3',
  status: 'published',
};

function renderEditor(
  itemId: string,
  type: 'article' | 'page' = 'article',
  role: string = 'editor',
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'user-1', email: 'editor@example.com', role, name: 'Alice' },
    isAuthenticated: true,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[`/${type}s/${itemId}/edit`]}>
            <Routes>
              <Route
                path={`/${type}s/:id/edit`}
                element={children}
              />
              <Route
                path={`/${type}s/:id/versions`}
                element={<div>Version History</div>}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ContentEditorPage type={type} />
    </Wrapper>,
  );
}

describe('ContentEditorPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/admin/content/content-1', () => HttpResponse.json({ data: draftItem })),
      http.get('/api/admin/content/content-2', () => HttpResponse.json({ data: inReviewItem })),
      http.get('/api/admin/content/content-3', () => HttpResponse.json({ data: publishedItem })),
      http.patch('/api/admin/content/:id', ({ params }) => {
        const id = params['id'] as string;
        return HttpResponse.json({ data: { ...draftItem, id } });
      }),
      http.get('/api/admin/media', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 }),
      ),
    );
  });

  it('renders title input', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Draft Article')).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue('My Draft Article');
    expect(titleInput).toBeInTheDocument();
  });

  it('renders slug field', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByDisplayValue('my-draft-article')).toBeInTheDocument();
    });
  });

  it('renders TipTap editor with contenteditable', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      const editor = document.querySelector('[contenteditable]');
      expect(editor).toBeInTheDocument();
    });
  });

  it('shows autosave indicator', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      const indicator = document.querySelector('[data-testid="autosave-indicator"]');
      expect(indicator).toBeTruthy();
    });
  });

  it('shows "Save Draft" button', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });
  });

  it('shows "Submit for Review" button for draft content', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
    });
  });

  it('does not show "Submit for Review" button when content is in_review', async () => {
    renderEditor('content-2');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument();
    });
  });

  it('hides "Publish" button for Author role', async () => {
    renderEditor('content-2', 'article', 'author');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    });
  });

  it('shows "Publish" button for Editor role when content is in_review', async () => {
    renderEditor('content-2', 'article', 'editor');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
    });
  });

  it('shows "Publish" button for Admin role when content is in_review', async () => {
    renderEditor('content-2', 'article', 'admin');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
    });
  });

  it('shows "Unpublish" button when content is published', async () => {
    renderEditor('content-3', 'article', 'editor');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unpublish/i })).toBeInTheDocument();
    });
  });

  it('shows SEO meta title field with char counter "X/70"', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByText('0/70')).toBeInTheDocument();
    });
  });

  it('shows SEO meta description field with char counter "X/160"', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByText('0/160')).toBeInTheDocument();
    });
  });

  it('meta title counter updates as user types', async () => {
    const user = userEvent.setup();
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByText('0/70')).toBeInTheDocument();
    });

    const metaTitleInput = screen.getByLabelText(/meta title/i);
    await user.type(metaTitleInput, 'Hello');

    expect(screen.getByText('5/70')).toBeInTheDocument();
  });

  it('shows meta title error when over 70 chars', async () => {
    const user = userEvent.setup();
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByText('0/70')).toBeInTheDocument();
    });

    const metaTitleInput = screen.getByLabelText(/meta title/i);
    const longText = 'a'.repeat(71);
    await user.type(metaTitleInput, longText);

    expect(screen.getByText('71/70')).toBeInTheDocument();
    // Shows error
    expect(screen.getByText(/too long/i)).toBeInTheDocument();
  });

  it('has breadcrumb navigation', async () => {
    renderEditor('content-1');

    await waitFor(() => {
      expect(screen.getByText('Articles')).toBeInTheDocument();
    });
  });
});
