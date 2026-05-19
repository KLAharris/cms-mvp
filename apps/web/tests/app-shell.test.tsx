import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { AppShell } from '../src/features/shell/components/AppShell';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';

// Make useMediaQuery return true for 'up md' breakpoint (wide viewport)
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return {
    ...actual,
    useMediaQuery: () => true,
  };
});

function renderShell(role: string = 'editor', initialPath: string = '/dashboard') {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'user-1', email: 'editor@example.com', role, name: 'Alice' },
    isAuthenticated: true,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  }

  render(
    <Wrapper>
      <AppShell>
        <div>Content Area</div>
      </AppShell>
    </Wrapper>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    // useMediaQuery is mocked to return true (wide viewport)
  });

  it('renders children in the content area', () => {
    renderShell();
    expect(screen.getByText('Content Area')).toBeInTheDocument();
  });

  it('renders nav rail navigation on wide viewport', () => {
    renderShell();
    // NavRail is present as a nav element
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('nav rail shows Dashboard link for all roles', () => {
    renderShell('editor');
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('nav rail shows Articles link for all roles', () => {
    renderShell('editor');
    expect(screen.getByRole('link', { name: /articles/i })).toBeInTheDocument();
  });

  it('nav rail shows Pages link for all roles', () => {
    renderShell('editor');
    expect(screen.getByRole('link', { name: /pages/i })).toBeInTheDocument();
  });

  it('nav rail shows Media Library link for all roles', () => {
    renderShell('editor');
    expect(screen.getByRole('link', { name: /media library/i })).toBeInTheDocument();
  });

  it('nav rail shows all 7 items for admin role', () => {
    renderShell('admin');

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /articles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pages/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /media library/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api keys/i })).toBeInTheDocument();
  });

  it('nav rail hides Users link for non-admin role', () => {
    renderShell('editor');
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });

  it('nav rail hides Audit Log link for non-admin role', () => {
    renderShell('editor');
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
  });

  it('nav rail hides API Keys link for non-admin role', () => {
    renderShell('editor');
    expect(screen.queryByRole('link', { name: /api keys/i })).not.toBeInTheDocument();
  });

  it('nav rail hides admin links for author role', () => {
    renderShell('author');
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /api keys/i })).not.toBeInTheDocument();
  });

  it('renders a logout button', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('dashboard link points to /dashboard', () => {
    renderShell();
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });
});
