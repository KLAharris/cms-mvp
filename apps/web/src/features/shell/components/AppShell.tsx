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
      <TopAppBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isWide && <NavRail />}
        <NavDrawer />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
