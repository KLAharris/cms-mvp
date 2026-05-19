import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  TextField,
} from '@mui/material';
import { FormEvent, ReactElement, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { loginWithPassword } from '../api/auth.api';
import { AuthLayout } from '../components/AuthLayout';
import { useAuthStore } from '../store/auth.store';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await loginWithPassword({ email, password });
      login(session);
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMessage('Email or password is incorrect.');
      emailRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle="Welcome back" title="Sign in to CMS">
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {errorMessage !== null ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <TextField
          autoComplete="email"
          fullWidth
          inputRef={emailRef}
          label="Email"
          margin="normal"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          type="email"
          value={email}
        />
        <TextField
          autoComplete="current-password"
          fullWidth
          label="Password"
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
        <MuiLink
          component={RouterLink}
          sx={{ display: 'inline-flex', mt: 1 }}
          to="/forgot-password"
          variant="labelLarge"
        >
          Forgot password?
        </MuiLink>
        <Button
          disabled={isSubmitting}
          fullWidth
          size="large"
          sx={{ mt: 3 }}
          type="submit"
          variant="contained"
        >
          {isSubmitting ? (
            <>
              <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
              Signing in
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>
    </AuthLayout>
  );
}
