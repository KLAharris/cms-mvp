import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { type ReactElement, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { deactivateUser, inviteUser, listUsers, updateUser } from '../api/users.api';
import type { UserItem, UserRole, UserStatus } from '../types/user.types';
import { useUiStore } from '../../../shared/store/ui.store';
import { useAuthStore } from '../../auth/store/auth.store';
import { Navigate } from 'react-router-dom';

function statusColor(status: UserStatus): 'primary' | 'secondary' | 'error' {
  if (status === 'active') return 'primary';
  if (status === 'invited') return 'secondary';
  return 'error';
}

function roleLabel(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatLastLogin(date?: string): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface UserRowMenuProps {
  user: UserItem;
  onEditRole: (user: UserItem) => void;
  onDeactivate: (user: UserItem) => void;
  onResendInvite: (user: UserItem) => void;
}

function UserRowMenu({ user, onEditRole, onDeactivate, onResendInvite }: UserRowMenuProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => { setAnchorEl(e.currentTarget); };
  const handleClose = () => { setAnchorEl(null); };

  return (
    <>
      <IconButton size="small" onClick={handleOpen} aria-label={`Actions for ${user.name}`}>
        <span className="material-symbols-rounded">more_vert</span>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            handleClose();
            onEditRole(user);
          }}
        >
          Edit role
        </MenuItem>
        {user.status === 'invited' && (
          <MenuItem
            onClick={() => {
              handleClose();
              onResendInvite(user);
            }}
          >
            Resend invite
          </MenuItem>
        )}
        {user.status !== 'deactivated' && (
          <MenuItem
            onClick={() => {
              handleClose();
              onDeactivate(user);
            }}
            sx={{ color: 'error.main' }}
          >
            Deactivate
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export function UsersPage(): ReactElement {
  const currentUser = useAuthStore((s) => s.user);
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <UsersPageContent />;
}

function UsersPageContent(): ReactElement {
  const queryClient = useQueryClient();
  const showSnack = useUiStore((s) => s.showSnack);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers(),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      showSnack('Invitation sent');
      setInviteOpen(false);
    },
    onError: () => { showSnack('Failed to send invite', 'error'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUser(id, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      showSnack('Role updated');
      setEditRoleUser(null);
    },
    onError: () => { showSnack('Failed to update role', 'error'); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      showSnack('User deactivated');
      setUserToDeactivate(null);
    },
    onError: () => { showSnack('Failed to deactivate user', 'error'); },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('author');

  const [editRoleUser, setEditRoleUser] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('author');

  const [userToDeactivate, setUserToDeactivate] = useState<UserItem | null>(null);

  const handleInvite = () => {
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleEditRole = (user: UserItem) => {
    setEditRoleUser(user);
    setNewRole(user.role);
  };

  const handleUpdateRole = () => {
    if (editRoleUser) {
      updateMutation.mutate({ id: editRoleUser.id, role: newRole });
    }
  };

  const handleDeactivate = () => {
    if (userToDeactivate) {
      deactivateMutation.mutate(userToDeactivate.id);
    }
  };

  const handleResendInvite = () => {
    showSnack('Invite resent');
  };

  const items = data?.items ?? [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography component="h1" variant="headlineLarge" sx={{ flex: 1 }}>
          Users
        </Typography>
        <Button
          variant="contained"
          onClick={() => { setInviteOpen(true); }}
          startIcon={<span className="material-symbols-rounded">person_add</span>}
        >
          Invite user
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
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last login</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                      {getInitials(user.name)}
                    </Avatar>
                    {user.name}
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{roleLabel(user.role)}</TableCell>
                <TableCell>
                  <Chip
                    label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    color={statusColor(user.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatLastLogin(user.lastLoginAt)}</TableCell>
                <TableCell>
                  <UserRowMenu
                    user={user}
                    onEditRole={handleEditRole}
                    onDeactivate={(u) => { setUserToDeactivate(u); }}
                    onResendInvite={handleResendInvite}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onClose={() => { setInviteOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>Invite user</DialogTitle>
        <DialogContent>
          <TextField
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); }}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="invite-role-label">Role</InputLabel>
            <Select
              labelId="invite-role-label"
              value={inviteRole}
              label="Role"
              onChange={(e) => { setInviteRole(e.target.value as UserRole); }}
            >
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="author">Author</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setInviteOpen(false); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={!inviteEmail || inviteMutation.isPending}
          >
            Send invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog
        open={editRoleUser !== null}
        onClose={() => { setEditRoleUser(null); }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit role — {editRoleUser?.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={newRole}
              label="Role"
              onChange={(e) => { setNewRole(e.target.value as UserRole); }}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="author">Author</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditRoleUser(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateRole}
            disabled={updateMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate confirmation */}
      <Dialog
        open={userToDeactivate !== null}
        onClose={() => { setUserToDeactivate(null); }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Deactivate {userToDeactivate?.name}?</DialogTitle>
        <DialogContent>
          <Typography>
            This will prevent {userToDeactivate?.name} from logging in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setUserToDeactivate(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
