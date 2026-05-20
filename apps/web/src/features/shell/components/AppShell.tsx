import { Box, useMediaQuery, useTheme } from '@mui/material';
import { type PropsWithChildren, type ReactElement } from 'react';

import { NavDrawer } from './NavDrawer';
import { NavRail } from './NavRail';
import { TopAppBar } from './TopAppBar';

export function AppShell({ children }: PropsWithChildren): ReactElement {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          '&:focus': {
            position: 'fixed',
            top: 8,
            left: 8,
            width: 'auto',
            height: 'auto',
            overflow: 'visible',
            zIndex: 9999,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: 2,
            py: 1,
            borderRadius: 1,
            fontWeight: 600,
          },
        }}
      >
        Skip to main content
      </Box>
      <TopAppBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isWide && <NavRail />}
        <NavDrawer />
        <Box
          id="main-content"
          component="main"
          tabIndex={-1}
          sx={{
            flex: 1,
            overflowY: 'auto',
            '&:focus': { outline: 'none' },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
