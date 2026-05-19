import { Box, Tooltip, Typography } from '@mui/material';
import { type ReactElement } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../auth/store/auth.store';

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

export function NavRail(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const role = user?.role ?? 'author';
  const isAdmin = role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Box
      component="nav"
      aria-label="main navigation"
      sx={{
        width: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        gap: 1,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      {visibleItems.map((item) => (
        <Tooltip key={item.href} title={item.label} placement="right">
          <Box
            component={NavLink}
            to={item.href}
            aria-label={item.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              width: '100%',
              px: 1,
              py: 0.75,
              textDecoration: 'none',
              color: 'text.secondary',
              borderRadius: 2,
              '&.active': {
                bgcolor: 'secondary.light',
                color: 'secondary.contrastText',
                '& .rail-icon': {
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                },
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Box
              className="rail-icon"
              sx={{
                width: 56,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
              }}
            >
              <span className="material-symbols-rounded">{item.icon}</span>
            </Box>
            <Typography
              variant="labelLarge"
              sx={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}
            >
              {item.label}
            </Typography>
          </Box>
        </Tooltip>
      ))}

      <Box sx={{ flexGrow: 1 }} />

      {/* Logout */}
      <Tooltip title="Logout" placement="right">
        <Box
          component="button"
          onClick={handleLogout}
          aria-label="Logout"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            width: '100%',
            px: 1,
            py: 0.75,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'text.secondary',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <span className="material-symbols-rounded">logout</span>
          <Typography variant="labelLarge" sx={{ fontSize: 10 }}>
            Logout
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}
