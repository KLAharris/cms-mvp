import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import { FormEvent, ReactElement, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../api/auth.api';
import { AuthLayout } from '../components/AuthLayout';

function passwordErrors(password: string, confirmPassword: string): string[] {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters.');
  }

  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    errors.push('Password must contain at least one letter and one digit.');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords must match.');
  }

  return errors;
}

export function ResetPasswordPage(): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = passwordErrors(password, confirmPassword);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      setSuccessMessage('Your password has been reset.');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3_000);
    } catch {
      setErrors(['This reset link is invalid or has expired.']);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle="Choose a new password" title="Create new password">
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {successMessage !== null ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        ) : null}
        {errors.length > 0 ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error) => (
              <Box component="div" key={error}>
                {error}
              </Box>
            ))}
          </Alert>
        ) : null}
        <TextField
          autoComplete="new-password"
          fullWidth
          label="New password"
          margin="normal"
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          type={showPassword ? 'text' : 'password'}
          value={password}
          slotProps={{
            input: {
              endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  edge="end"
                  onClick={() => {
                    setShowPassword((value) => !value);
                  }}
                  type="button"
                >
                  <span className="material-symbols-rounded">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </IconButton>
              </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          autoComplete="new-password"
          fullWidth
          label="Confirm password"
          margin="normal"
          onChange={(event) => {
            setConfirmPassword(event.target.value);
          }}
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          slotProps={{
            input: {
              endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password confirmation'
                      : 'Show password confirmation'
                  }
                  edge="end"
                  onClick={() => {
                    setShowConfirmPassword((value) => !value);
                  }}
                  type="button"
                >
                  <span className="material-symbols-rounded">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </IconButton>
              </InputAdornment>
              ),
            },
          }}
        />
        <Button
          disabled={isSubmitting}
          fullWidth
          size="large"
          sx={{ mt: 3 }}
          type="submit"
          variant="contained"
        >
          Reset password
        </Button>
      </Box>
    </AuthLayout>
  );
}
