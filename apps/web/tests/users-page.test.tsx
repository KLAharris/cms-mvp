import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { UsersPage } from '../src/features/users/pages/UsersPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { UserItem, UserListResponse } from '../src/features/users/types/user.types';

const mockUsers: UserItem[] = [
  {
    id: 'user-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'admin',
    status: 'active',
    lastLoginAt: '2024-06-01T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Bob Jones',
    email: 'bob@example.com',
    role: 'editor',
    status: 'invited',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    name: 'Carol Lee',
    email: 'carol@example.com',
    role: 'author',
    status: 'deactivated',
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const mockListResponse: UserListResponse = {
  items: mockUsers,
  total: 3,
  page: 1,
  pageSize: 20,
};

function renderUsers(role: string = 'admin') {
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
          <MemoryRouter initialEntries={['/users']}>
            <Routes>
              <Route path="/users" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <UsersPage />
    </Wrapper>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    server.use(http.get('/api/admin/users', () => HttpResponse.json(mockListResponse)));
  });

  it('redirects non-admin users to dashboard', () => {
    renderUsers('editor');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders Users heading for admin', () => {
    renderUsers('admin');
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  });

  it('renders table columns: Name, Email, Role, Status, Last login', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last login/i })).toBeInTheDocument();
  });

  it('renders user rows', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Carol Lee')).toBeInTheDocument();
    });
  });

  it('shows status chips for each user', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('renders Invite user button', () => {
    renderUsers();
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('opens invite dialog when invite button is clicked', async () => {
    const user = userEvent.setup();
    renderUsers();

    await user.click(screen.getByRole('button', { name: /invite user/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /invite user/i })).toBeInTheDocument();
  });

  it('invite dialog has email and role fields', async () => {
    const user = userEvent.setup();
    renderUsers();

    await user.click(screen.getByRole('button', { name: /invite user/i }));

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('submits invite and shows success', async () => {
    server.use(
      http.post('/api/admin/users/invite', () =>
        HttpResponse.json({
          id: 'user-new',
          name: 'New User',
          email: 'new@example.com',
          role: 'author',
          status: 'invited',
          createdAt: '2024-01-04T00:00:00Z',
        }),
      ),
    );

    const user = userEvent.setup();
    renderUsers();

    await user.click(screen.getByRole('button', { name: /invite user/i }));

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'new@example.com');

    const sendBtn = screen.getByRole('button', { name: /send invite/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens deactivate confirmation when deactivate menu item is clicked', async () => {
    const user = userEvent.setup();
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[0] as HTMLElement);

    const deactivateItem = await screen.findByRole('menuitem', { name: /^deactivate$/i });
    await user.click(deactivateItem);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
  });
});
