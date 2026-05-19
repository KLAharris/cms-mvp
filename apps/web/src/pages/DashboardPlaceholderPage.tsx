import { Box, Container, Typography } from '@mui/material';
import { ReactElement } from 'react';

export function DashboardPlaceholderPage(): ReactElement {
  return (
    <Box component="main" sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Typography component="h1" variant="headlineLarge">
          Dashboard
        </Typography>
      </Container>
    </Box>
  );
}
