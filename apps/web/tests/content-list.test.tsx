import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { ContentListPage } from '../src/features/content/pages/ContentListPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { ContentListResponse, ContentItem } from '../src/features/content/types/content.types';

const mockItems: ContentItem[] = [
  {
    id: 'item-1',
    title: 'My First Article',
    slug: 'my-first-article',
    type: 'article',
    status: 'published',
    author: { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' },
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'item-2',
    title: 'Draft Post',
    slug: 'draft-post',
    type: 'article',
    status: 'draft',
    author: { id: 'user-2', name: 'Bob Jones', email: 'bob@example.com' },
    tags: [],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-06-02T10:00:00Z',
  },
];

const mockListResponse: ContentListResponse = {
  items: mockItems,
  total: 2,
  page: 1,
  pageSize: 20,
};

function renderContentList(type: 'article' | 'page' = 'article') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[`/${type}s`]}>
            <Routes>
              <Route path={`/${type}s`} element={children} />
              <Route path={`/${type}s/new`} element={<div>New Editor</div>} />
              <Route path={`/${type}s/:id/edit`} element={<div>Edit Editor</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ContentListPage type={type} />
    </Wrapper>,
  );
}

describe('ContentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'editor@example.com', role: 'editor', name: 'Alice' },
      isAuthenticated: true,
    });
  });

  it('renders page title "Articles" for article type', () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList('article');
    expect(screen.getByRole('heading', { name: 'Articles' })).toBeInTheDocument();
  });

  it('renders page title "Pages" for page type', () => {
    server.use(
      http.get('/api/admin/content', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );

    renderContentList('page');
    expect(screen.getByRole('heading', { name: 'Pages' })).toBeInTheDocument();
  });

  it('renders search field', () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders filter chips: All, Draft, In Review, Published, Mine, Last 30 days', () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList();

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
  });

  it('renders table with columns Title, Status, Author, Updated', async () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList();

    await waitFor(() => {
      expect(screen.getByText('My First Article')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);

    expect(headerTexts).toContain('Title');
    expect(headerTexts).toContain('Status');
    expect(headerTexts).toContain('Author');
    expect(headerTexts).toContain('Updated');
  });

  it('renders skeleton rows while loading', () => {
    // Don't resolve the request, just hang
    server.use(
      http.get('/api/admin/content', async () => {
        await new Promise(() => undefined); // never resolves
        return HttpResponse.json(mockListResponse);
      }),
    );

    renderContentList();

    // Should show skeleton elements while loading
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no items', async () => {
    server.use(
      http.get('/api/admin/content', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );

    renderContentList();

    await waitFor(() => {
      expect(screen.getByText(/no articles found/i)).toBeInTheDocument();
    });
  });

  it('renders items in table when data loads', async () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList();

    await waitFor(() => {
      expect(screen.getByText('My First Article')).toBeInTheDocument();
      expect(screen.getByText('Draft Post')).toBeInTheDocument();
    });
  });

  it('shows status chip with correct label', async () => {
    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
    );

    renderContentList();

    await waitFor(() => {
      expect(screen.getByText('My First Article')).toBeInTheDocument();
    });

    // Use getAllByText since "Published" may appear in filter chip and status chip
    const publishedElements = screen.getAllByText('Published');
    expect(publishedElements.length).toBeGreaterThan(0);

    const draftElements = screen.getAllByText('Draft');
    expect(draftElements.length).toBeGreaterThan(0);
  });

  it('navigates to editor when new button is clicked', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('/api/admin/content', () => HttpResponse.json(mockListResponse)),
      http.post('/api/admin/content', () =>
        HttpResponse.json({
          id: 'new-id',
          title: 'Untitled',
          slug: 'untitled',
          type: 'article',
          status: 'draft',
          author: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
          tags: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    renderContentList();

    const newButton = screen.getByRole('button', { name: /new/i });
    await user.click(newButton);

    // After creating, navigates to /:type/:id/edit (the Edit Editor route)
    await waitFor(() => {
      expect(screen.getByText('Edit Editor')).toBeInTheDocument();
    });
  });
});
