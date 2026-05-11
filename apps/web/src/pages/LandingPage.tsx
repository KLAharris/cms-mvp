import { Box, Container, Typography } from '@mui/material';
import { ReactElement } from 'react';

export function LandingPage(): ReactElement {
  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 9 }}>
      <Container maxWidth="lg">
        <Typography component="h1" variant="headlineLarge">
          CMS MVP — Phase 0
        </Typography>
      </Container>
    </Box>
  );
}
