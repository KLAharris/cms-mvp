import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { ApiKeysPage } from '../src/features/api-keys/pages/ApiKeysPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { ApiKey, ApiKeyListResponse } from '../src/features/api-keys/types/api-keys.types';

const mockKeys: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Web',
    prefix: 'cmsk_a1b2c3',
    status: 'active',
    lastUsedAt: '2024-06-01T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'key-2',
    name: 'Legacy v0',
    prefix: 'cmsk_x7y8z9',
    status: 'revoked',
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockListResponse: ApiKeyListResponse = {
  items: mockKeys,
  total: 2,
};

function renderApiKeys(role: string = 'admin') {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'user-1', email: 'admin@example.com', role, name: 'Alice' },
    isAuthenticated: true,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={['/api-keys']}>
            <Routes>
              <Route path="/api-keys" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ApiKeysPage />
    </Wrapper>,
  );
}

describe('ApiKeysPage', () => {
  beforeEach(() => {
    server.use(http.get('/api/admin/api-keys', () => HttpResponse.json(mockListResponse)));
  });

  it('redirects non-admin users to dashboard', () => {
    renderApiKeys('editor');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders API Keys heading', () => {
    renderApiKeys();
    expect(screen.getByRole('heading', { name: /api keys/i })).toBeInTheDocument();
  });

  it('renders table columns: Name, Prefix, Last used, Status', async () => {
    renderApiKeys();

    await waitFor(() => {
      expect(screen.getByText('Production Web')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /prefix/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last used/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
  });

  it('renders key rows', async () => {
    renderApiKeys();

    await waitFor(() => {
      expect(screen.getByText('Production Web')).toBeInTheDocument();
      expect(screen.getByText('Legacy v0')).toBeInTheDocument();
    });
  });

  it('shows prefix in monospace', async () => {
    renderApiKeys();

    await waitFor(() => {
      expect(screen.getByText('cmsk_a1b2c3')).toBeInTheDocument();
    });
  });

  it('shows status chips', async () => {
    renderApiKeys();

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Revoked')).toBeInTheDocument();
    });
  });

  it('renders New Key button', () => {
    renderApiKeys();
    expect(screen.getByRole('button', { name: /new key/i })).toBeInTheDocument();
  });

  it('opens create dialog when New Key is clicked', async () => {
    const user = userEvent.setup();
    renderApiKeys();

    await user.click(screen.getByRole('button', { name: /new key/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /new api key/i })).toBeInTheDocument();
  });

  it('shows full key once after creation', async () => {
    const createdKey = {
      id: 'key-new',
      name: 'Test Key',
      prefix: 'cmsk_new1',
      key: 'cmsk_new1_secretfullkey1234567890',
      status: 'active' as const,
      createdAt: '2024-06-01T00:00:00Z',
    };

    server.use(
      http.post('/api/admin/api-keys', () => HttpResponse.json(createdKey)),
    );

    const user = userEvent.setup();
    renderApiKeys();

    await user.click(screen.getByRole('button', { name: /new key/i }));

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Key');

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('created-key-value')).toBeInTheDocument();
    });

    expect(screen.getByTestId('created-key-value')).toHaveTextContent(
      'cmsk_new1_secretfullkey1234567890',
    );

    expect(screen.getByText(/you will not be able to view this key again/i)).toBeInTheDocument();
  });

  it('key is not shown after closing the creation dialog', async () => {
    const createdKey = {
      id: 'key-new',
      name: 'Test Key',
      prefix: 'cmsk_new1',
      key: 'cmsk_new1_secretfullkey1234567890',
      status: 'active' as const,
      createdAt: '2024-06-01T00:00:00Z',
    };

    server.use(
      http.post('/api/admin/api-keys', () => HttpResponse.json(createdKey)),
    );

    const user = userEvent.setup();
    renderApiKeys();

    await user.click(screen.getByRole('button', { name: /new key/i }));
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Key');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('created-key-value')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^done$/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('created-key-value')).not.toBeInTheDocument();
    });
  });

  it('opens revoke confirmation dialog', async () => {
    const user = userEvent.setup();
    renderApiKeys();

    await waitFor(() => {
      expect(screen.getByText('Production Web')).toBeInTheDocument();
    });

    const menuBtns = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuBtns[0] as HTMLElement);

    const revokeItem = await screen.findByRole('menuitem', { name: /^revoke$/i });
    await user.click(revokeItem);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^revoke$/i })).toBeInTheDocument();
  });
});
