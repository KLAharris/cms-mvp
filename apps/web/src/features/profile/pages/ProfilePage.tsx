import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { type ReactElement, useState } from 'react';

import { useAuthStore } from '../../auth/store/auth.store';
import { useUiStore, type ThemeMode } from '../../../shared/store/ui.store';
import { api } from '../../../shared/api/api';

export function ProfilePage(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const showSnack = useUiStore((s) => s.showSnack);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/admin/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showSnack('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      showSnack('Failed to change password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="headlineLarge" sx={{ mb: 3 }}>
        Profile &amp; Settings
      </Typography>

      {/* Account info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
          Account
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          <TextField
            label="Name"
            value={user?.name ?? ''}
            fullWidth
            disabled
          />
          <TextField
            label="Email"
            value={user?.email ?? ''}
            fullWidth
            disabled
          />
          <TextField
            label="Role"
            value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            fullWidth
            disabled
          />
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Change password */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
          Change Password
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          <TextField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); }}
            fullWidth
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); }}
            fullWidth
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); }}
            fullWidth
            error={!!passwordError}
            helperText={passwordError}
          />
          <Button
            variant="contained"
            onClick={() => { void handleChangePassword(); }}
            disabled={!currentPassword || !newPassword || !confirmPassword || isSubmitting}
            sx={{ alignSelf: 'flex-start' }}
          >
            Change password
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Theme */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
          Theme
        </Typography>
        <ToggleButtonGroup
          value={themeMode}
          exclusive
          onChange={(_e, value: ThemeMode | null) => {
            if (value) setThemeMode(value);
          }}
          aria-label="Theme"
        >
          <ToggleButton value="light" aria-label="Light theme">
            Light
          </ToggleButton>
          <ToggleButton value="dark" aria-label="Dark theme">
            Dark
          </ToggleButton>
          <ToggleButton value="system" aria-label="System theme">
            System
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>
    </Container>
  );
}
