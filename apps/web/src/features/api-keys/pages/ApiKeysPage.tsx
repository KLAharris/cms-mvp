import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { type ReactElement, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { createApiKey, listApiKeys, revokeApiKey } from '../api/api-keys.api';
import type { ApiKey, CreateApiKeyResponse } from '../types/api-keys.types';
import { useUiStore } from '../../../shared/store/ui.store';
import { useAuthStore } from '../../auth/store/auth.store';

function statusColor(revokedAt: string | null): 'success' | 'error' {
  return revokedAt === null ? 'success' : 'error';
}

function formatLastUsed(date: string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
}

interface KeyRowMenuProps {
  apiKey: ApiKey;
  onRevoke: (apiKey: ApiKey) => void;
}

function KeyRowMenu({ apiKey, onRevoke }: KeyRowMenuProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); }} aria-label={`Actions for ${apiKey.name}`}>
        <span className="material-symbols-rounded">more_vert</span>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); }}>
        <MenuItem
          disabled={apiKey.revokedAt !== null}
          onClick={() => {
            setAnchorEl(null);
            onRevoke(apiKey);
          }}
          sx={{ color: 'error.main' }}
        >
          Revoke
        </MenuItem>
      </Menu>
    </>
  );
}

export function ApiKeysPage(): ReactElement {
  const currentUser = useAuthStore((s) => s.user);
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <ApiKeysContent />;
}

function ApiKeysContent(): ReactElement {
  const queryClient = useQueryClient();
  const showSnack = useUiStore((s) => s.showSnack);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreatedKey(result);
      setCreateOpen(false);
    },
    onError: () => { showSnack('Failed to create key', 'error'); },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      showSnack('Key revoked');
      setRevokeKey(null);
    },
    onError: () => { showSnack('Failed to revoke key', 'error'); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    createMutation.mutate({ name: newKeyName });
  };

  const handleCopyKey = () => {
    if (createdKey) {
      void navigator.clipboard.writeText(createdKey.rawKey).then(() => {
        setCopied(true);
        setTimeout(() => { setCopied(false); }, 2000);
      });
    }
  };

  const handleRevoke = () => {
    if (revokeKey) {
      revokeMutation.mutate(revokeKey.id);
    }
  };

  const items = data ?? [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography component="h1" variant="headlineLarge" sx={{ flex: 1 }}>
          API Keys
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setNewKeyName('');
            setCreateOpen(true);
          }}
          startIcon={<span className="material-symbols-rounded">add</span>}
        >
          New Key
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Last used</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary">No API keys yet</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>{formatLastUsed(key.lastUsedAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={key.revokedAt === null ? 'Active' : 'Revoked'}
                      color={statusColor(key.revokedAt)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <KeyRowMenu apiKey={key} onRevoke={(k) => { setRevokeKey(k); }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>New API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={newKeyName}
            onChange={(e) => { setNewKeyName(e.target.value); }}
            fullWidth
            sx={{ mt: 1 }}
            placeholder="e.g. Production Web"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newKeyName.trim() || createMutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show created key — once only */}
      <Dialog
        open={createdKey !== null}
        onClose={() => { setCreatedKey(null); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'warning.light',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="bodyMedium" color="warning.dark">
              You will not be able to view this key again. Store it securely.
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            <Typography
              variant="bodyMedium"
              sx={{ flex: 1, fontFamily: 'monospace' }}
              data-testid="created-key-value"
            >
              {createdKey?.rawKey}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton size="small" onClick={handleCopyKey} aria-label="Copy key">
                <span className="material-symbols-rounded">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => { setCreatedKey(null); }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog
        open={revokeKey !== null}
        onClose={() => { setRevokeKey(null); }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Revoke &ldquo;{revokeKey?.name}&rdquo;?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently revoke the key. Any services using it will lose access.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRevokeKey(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
