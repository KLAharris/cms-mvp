import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { AppShell } from '../features/shell/components/AppShell';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { ContentListPage } from '../features/content/pages/ContentListPage';
import { ContentEditorPage } from '../features/content/pages/ContentEditorPage';
import { VersionHistoryPage } from '../features/content/pages/VersionHistoryPage';
import { MediaLibraryPage } from '../features/media/pages/MediaLibraryPage';
import { UsersPage } from '../features/users/pages/UsersPage';
import { AuditLogPage } from '../features/audit/pages/AuditLogPage';
import { ApiKeysPage } from '../features/api-keys/pages/ApiKeysPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell>
          <Navigate replace to="/dashboard" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/articles',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentListPage type="article" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/articles/new',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentEditorPage type="article" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/articles/:id/edit',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentEditorPage type="article" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/articles/:id/versions',
    element: (
      <ProtectedRoute>
        <AppShell>
          <VersionHistoryPage type="article" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pages',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentListPage type="page" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pages/new',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentEditorPage type="page" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pages/:id/edit',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ContentEditorPage type="page" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pages/:id/versions',
    element: (
      <ProtectedRoute>
        <AppShell>
          <VersionHistoryPage type="page" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/media',
    element: (
      <ProtectedRoute>
        <AppShell>
          <MediaLibraryPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <AppShell>
          <UsersPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/audit',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AuditLogPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/api-keys',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ApiKeysPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
