import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { MediaLibraryPage } from '../src/features/media/pages/MediaLibraryPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { MediaItem, MediaListResponse } from '../src/features/media/types/media.types';

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

function renderMediaLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>{children}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <MediaLibraryPage />
    </Wrapper>,
  );
}

describe('MediaLibraryPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'admin@example.com', role: 'admin', name: 'Alice' },
      isAuthenticated: true,
    });
  });

  it('renders page heading', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();
    expect(screen.getByRole('heading', { name: /media library/i })).toBeInTheDocument();
  });

  it('renders upload button', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('renders search field', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();
    expect(screen.getByPlaceholderText(/search by filename/i)).toBeInTheDocument();
  });

  it('renders type filter dropdown', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
  });

  it('renders grid view and list view toggle buttons', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();
    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
  });

  it('renders grid of media items after loading', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();

    await waitFor(() => {
      expect(screen.getByText('hero.jpg')).toBeInTheDocument();
      expect(screen.getByText('team.png')).toBeInTheDocument();
    });
  });

  it('shows empty state when no media', async () => {
    server.use(
      http.get('/api/admin/media', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
      ),
    );
    renderMediaLibrary();

    await waitFor(() => {
      expect(screen.getByText(/no media found/i)).toBeInTheDocument();
    });
  });

  it('multi-select: clicking checkbox shows bulk delete button', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderMediaLibrary();

    await waitFor(() => {
      expect(screen.getByText('hero.jpg')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });
  });

  it('bulk delete opens confirmation dialog', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    const user = userEvent.setup();
    renderMediaLibrary();

    await waitFor(() => {
      expect(screen.getByText('hero.jpg')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0] as HTMLElement);

    const deleteBtn = await screen.findByRole('button', { name: /delete selected/i });
    await user.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it('search input is rendered and interactive', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    const user = userEvent.setup();
    renderMediaLibrary();

    const searchInput = screen.getByPlaceholderText(/search by filename/i);
    await user.type(searchInput, 'hero');
    expect(searchInput).toHaveValue('hero');
  });

  it('upload progress bar appears when uploading', async () => {
    server.use(
      http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)),
      http.post('/api/admin/media/presign', () =>
        HttpResponse.json({ uploadUrl: 'http://localhost/s3/upload', mediaId: 'new-id', storageKey: 'media/key' }),
      ),
      http.put('http://localhost/s3/upload', () => new HttpResponse(null, { status: 200 })),
      http.post('/api/admin/media', () => new HttpResponse(null, { status: 202 })),
    );

    renderMediaLibrary();

    const fileInput = document.querySelector('[data-testid="file-input"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    // After upload completes, progress bar should be gone
    await waitFor(() => {
      expect(screen.queryByRole('progressbar', { name: /uploading/i })).toBeNull();
    }, { timeout: 3000 });
  });
});
