import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { MediaPickerDialog } from '../src/shared/components/MediaPickerDialog';
import { lightTheme } from '../src/shared/theme/theme';
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
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 51200,
    uploadedBy: 'user-1',
    uploadedAt: '2024-01-02T00:00:00Z',
    status: 'ready',
    requiresSanitization: false,
    variants: {
      original: { url: 'https://cdn.example.com/report.pdf', expiresAt: '2025-01-01T00:00:00Z' },
    },
  },
];

const mockListResponse: MediaListResponse = {
  items: mockItems,
  total: 2,
  page: 1,
  pageSize: 50,
};

function renderPicker(open: boolean, onClose = vi.fn(), onSelect = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
      <MediaPickerDialog open={open} onClose={onClose} onSelect={onSelect} />
    </Wrapper>,
  );
}

describe('MediaPickerDialog', () => {
  it('does not render content when closed', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/select media/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(true);
    expect(screen.getByLabelText(/search media/i)).toBeInTheDocument();
  });

  it('renders type filter', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(true);
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
  });

  it('renders media items', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hero\.jpg/i })).toBeInTheDocument();
    });
  });

  it('confirm button is disabled when no item selected', () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    renderPicker(true);
    const selectBtn = screen.getByRole('button', { name: /^select$/i });
    expect(selectBtn).toBeDisabled();
  });

  it('selecting a tile enables confirm button', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    const user = userEvent.setup();
    renderPicker(true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hero\.jpg/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /hero\.jpg/i }));

    const selectBtn = screen.getByRole('button', { name: /^select$/i });
    expect(selectBtn).not.toBeDisabled();
  });

  it('calls onSelect with selected item and closes on confirm', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelect = vi.fn();
    renderPicker(true, onClose, onSelect);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hero\.jpg/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /hero\.jpg/i }));
    await user.click(screen.getByRole('button', { name: /^select$/i }));

    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked without calling onSelect', async () => {
    server.use(http.get('/api/admin/media', () => HttpResponse.json(mockListResponse)));
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSelect = vi.fn();
    renderPicker(true, onClose, onSelect);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows empty state when no media', async () => {
    server.use(
      http.get('/api/admin/media', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 50 }),
      ),
    );
    renderPicker(true);

    await waitFor(() => {
      expect(screen.getByText(/no media found/i)).toBeInTheDocument();
    });
  });
});
