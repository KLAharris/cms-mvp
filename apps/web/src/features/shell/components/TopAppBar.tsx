import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../auth/store/auth.store';
import { useUiStore } from '../../../shared/store/ui.store';

interface TopAppBarProps {
  title?: string;
}

export function TopAppBar({ title = 'CMS' }: TopAppBarProps): ReactElement {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };

  const displayName = user?.name ?? user?.email ?? '';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar>
        {/* Hamburger menu for narrow viewports */}
        <IconButton
          edge="start"
          onClick={openDrawer}
          aria-label="Open navigation menu"
          sx={{ mr: 1, display: { md: 'none' } }}
        >
          <span className="material-symbols-rounded">menu</span>
        </IconButton>

        <Typography variant="headlineLarge" sx={{ flexGrow: 1, fontSize: '1.25rem' }}>
          {title}
        </Typography>

        {/* User avatar menu */}
        <Tooltip title={displayName}>
          <IconButton onClick={handleOpenUserMenu} aria-label="User menu" size="small">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseUserMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <Typography variant="bodyMedium">{displayName}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>

        <Box />
      </Toolbar>
    </AppBar>
  );
}
