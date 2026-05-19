import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { DashboardPlaceholderPage } from '../pages/DashboardPlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Navigate replace to="/dashboard" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPlaceholderPage />
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
