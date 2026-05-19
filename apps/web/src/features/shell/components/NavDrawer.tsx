import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { type ReactElement } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../auth/store/auth.store';
import { useUiStore } from '../../../shared/store/ui.store';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Articles', href: '/articles', icon: 'article' },
  { label: 'Pages', href: '/pages', icon: 'description' },
  { label: 'Media Library', href: '/media', icon: 'perm_media' },
  { label: 'Users', href: '/users', icon: 'group', adminOnly: true },
  { label: 'Audit Log', href: '/audit', icon: 'history', adminOnly: true },
  { label: 'API Keys', href: '/api-keys', icon: 'vpn_key', adminOnly: true },
];

export function NavDrawer(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const drawerOpen = useUiStore((s) => s.nav.drawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const navigate = useNavigate();

  const role = user?.role ?? 'author';
  const isAdmin = role === 'admin';

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    closeDrawer();
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      sx={{
        '& .MuiDrawer-paper': {
          width: 360,
        },
      }}
    >
      <Box sx={{ py: 2, px: 2 }}>
        <Typography variant="headlineLarge" sx={{ mb: 2 }}>
          CMS
        </Typography>
      </Box>

      <List>
        {visibleItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.href}
              onClick={closeDrawer}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.active': {
                  bgcolor: 'secondary.light',
                  color: 'secondary.contrastText',
                },
              }}
            >
              <ListItemIcon>
                <span className="material-symbols-rounded">{item.icon}</span>
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, mx: 1 }}>
            <ListItemIcon>
              <span className="material-symbols-rounded">logout</span>
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
