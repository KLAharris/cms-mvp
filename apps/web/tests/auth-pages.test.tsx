import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../src/features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../src/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../src/features/auth/pages/ResetPasswordPage';
import { useAuthStore } from '../src/features/auth/store/auth.store';
import { theme } from '../src/shared/theme/theme';
import {
  forgotPassword,
  loginWithPassword,
  resetPassword,
} from '../src/features/auth/api/auth.api';

vi.mock('../src/features/auth/api/auth.api', () => ({
  forgotPassword: vi.fn(),
  loginWithPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

const mockedLoginWithPassword = vi.mocked(loginWithPassword);
const mockedForgotPassword = vi.mocked(forgotPassword);
const mockedResetPassword = vi.mocked(resetPassword);

function renderWithApp(ui: ReactElement, initialEntry = '/login'): void {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={initialEntry === '/login' ? ui : <LoginPage />} />
          <Route
            path="/forgot-password"
            element={initialEntry === '/forgot-password' ? ui : <ForgotPasswordPage />}
          />
          <Route
            path="/reset-password"
            element={initialEntry.startsWith('/reset-password') ? ui : <ResetPasswordPage />}
          />
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  it('stores the session and redirects to dashboard on successful login', async () => {
    mockedLoginWithPassword.mockResolvedValue({
      accessToken: 'access-token',
      user: { id: 'user-1', email: 'editor@example.com', role: 'editor' },
    });
    renderWithApp(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'editor@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'CorrectPassword1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(mockedLoginWithPassword).toHaveBeenCalledWith({
      email: 'editor@example.com',
      password: 'CorrectPassword1',
    });
    expect(useAuthStore.getState().accessToken).toBe('access-token');
  });

  it('shows an error banner and focuses email when credentials are invalid', async () => {
    mockedLoginWithPassword.mockRejectedValue(new Error('Unauthorized'));
    renderWithApp(<LoginPage />);

    const email = screen.getByLabelText('Email');
    await userEvent.type(email, 'editor@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
    await waitFor(() => {
      expect(email).toHaveFocus();
    });
  });

  it('disables submit and shows loading feedback while login is pending', async () => {
    mockedLoginWithPassword.mockReturnValue(new Promise(() => undefined));
    renderWithApp(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'editor@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'CorrectPassword1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('links to forgot password', () => {
    renderWithApp(<LoginPage />);

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always shows the non-enumerating success message after submit', async () => {
    mockedForgotPassword.mockResolvedValue();
    renderWithApp(<ForgotPasswordPage />, '/forgot-password');

    await userEvent.type(screen.getByLabelText('Email'), 'missing@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText(
        'If that email is registered you will receive a reset link shortly.',
      ),
    ).toBeInTheDocument();
    expect(mockedForgotPassword).toHaveBeenCalledWith({ email: 'missing@example.com' });
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates password strength and matching confirmation', async () => {
    renderWithApp(<ResetPasswordPage />, '/reset-password?token=reset-token');

    await userEvent.type(screen.getByLabelText('New password'), 'short1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText('Password must be at least 12 characters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Passwords must match.')).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('shows confirmation and redirects to login after a successful reset', async () => {
    mockedResetPassword.mockResolvedValue();
    renderWithApp(<ResetPasswordPage />, '/reset-password?token=reset-token');

    await userEvent.type(screen.getByLabelText('New password'), 'CorrectPassword1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'CorrectPassword1');

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Your password has been reset.')).toBeInTheDocument();
    expect(mockedResetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'CorrectPassword1',
    });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByRole('heading', { name: 'Sign in to CMS' })).toBeInTheDocument();
  });

  it('shows an invalid or expired token error', async () => {
    mockedResetPassword.mockRejectedValue(new Error('Invalid token'));
    renderWithApp(<ResetPasswordPage />, '/reset-password?token=expired-token');

    await userEvent.type(screen.getByLabelText('New password'), 'CorrectPassword1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'CorrectPassword1');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText('This reset link is invalid or has expired.'),
    ).toBeInTheDocument();
  });
});
