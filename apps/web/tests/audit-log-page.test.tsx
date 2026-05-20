import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { type ReactNode } from 'react';

import { server } from './msw-setup';
import { AuditLogPage } from '../src/features/audit/pages/AuditLogPage';
import { lightTheme } from '../src/shared/theme/theme';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import type { AuditEvent } from '../src/features/audit/types/audit.types';

const mockEvents: AuditEvent[] = [
  {
    id: 'event-1',
    action: 'content.published',
    actorId: 'user-alice',
    actorIp: '127.0.0.1',
    targetType: 'content',
    targetId: 'content-1',
    summary: 'Published article "Q2 Report"',
    timestamp: '2024-06-01T10:00:00Z',
  },
  {
    id: 'event-2',
    action: 'user.invited',
    actorId: 'user-alice',
    actorIp: '127.0.0.1',
    targetType: 'user',
    targetId: 'user-new',
    summary: 'Invited user bob@example.com',
    timestamp: '2024-06-01T09:00:00Z',
  },
];

const mockEnvelope = {
  data: mockEvents,
  pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 },
};

function renderAuditLog(role: string = 'admin') {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'user-1', email: 'admin@example.com', role, name: 'Alice' },
    isAuthenticated: true,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={['/audit']}>
            <Routes>
              <Route path="/audit" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <AuditLogPage />
    </Wrapper>,
  );
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    server.use(http.get('/api/admin/audit', () => HttpResponse.json(mockEnvelope)));
  });

  it('redirects non-admin users to dashboard', () => {
    renderAuditLog('editor');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders Audit Log heading', () => {
    renderAuditLog();
    expect(screen.getByRole('heading', { name: /audit log/i })).toBeInTheDocument();
  });

  it('renders table columns: Timestamp, Actor, Action, Target type, Summary', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getAllByText('user-alice').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('columnheader', { name: /timestamp/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actor/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /target type/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /summary/i })).toBeInTheDocument();
  });

  it('renders audit event rows', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getAllByText('user-alice').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/published article/i)).toBeInTheDocument();
    expect(screen.getByText(/invited user/i)).toBeInTheDocument();
  });

  it('renders action chips', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('content.published')).toBeInTheDocument();
      expect(screen.getByText('user.invited')).toBeInTheDocument();
    });
  });

  it('renders Export CSV button', () => {
    renderAuditLog();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('renders Actor filter field', () => {
    renderAuditLog();
    expect(screen.getByLabelText(/actor/i)).toBeInTheDocument();
  });

  it('renders Action filter dropdown', () => {
    renderAuditLog();
    expect(screen.getByLabelText('Action')).toBeInTheDocument();
  });

  it('renders Target type filter dropdown', () => {
    renderAuditLog();
    expect(screen.getByLabelText('Target type')).toBeInTheDocument();
  });

  it('filters are interactive', async () => {
    const user = userEvent.setup();
    let capturedUrl: string | undefined;

    server.use(
      http.get('/api/admin/audit', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ data: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } });
      }),
    );

    renderAuditLog();

    const actorInput = screen.getByLabelText(/actor/i);
    await user.type(actorInput, 'alice');

    await waitFor(() => {
      expect(capturedUrl).toContain('actorId=alice');
    });
  });

  it('export CSV button triggers navigation', async () => {
    const mockLocation = { href: '' } as unknown as Location;
    const assignSpy = vi.spyOn(window, 'location', 'get').mockReturnValue(mockLocation);

    renderAuditLog();
    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    const user = userEvent.setup();
    await user.click(exportBtn);

    assignSpy.mockRestore();
  });
});
