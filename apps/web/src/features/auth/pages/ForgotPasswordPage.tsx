import { Alert, Box, Button, Link as MuiLink, TextField } from '@mui/material';
import { FormEvent, ReactElement, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { forgotPassword } from '../api/auth.api';
import { AuthLayout } from '../components/AuthLayout';

const successMessage =
  'If that email is registered you will receive a reset link shortly.';

export function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await forgotPassword({ email });
    } finally {
      setHasSubmitted(true);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle="Enter your account email" title="Reset password">
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {hasSubmitted ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        ) : null}
        <TextField
          autoComplete="email"
          fullWidth
          label="Email"
          margin="normal"
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          type="email"
          value={email}
        />
        <Button
          disabled={isSubmitting}
          fullWidth
          size="large"
          sx={{ mt: 3 }}
          type="submit"
          variant="contained"
        >
          Send reset link
        </Button>
        <MuiLink
          component={RouterLink}
          sx={{ display: 'inline-flex', mt: 2 }}
          to="/login"
          variant="labelLarge"
        >
          Back to login
        </MuiLink>
      </Box>
    </AuthLayout>
  );
}
