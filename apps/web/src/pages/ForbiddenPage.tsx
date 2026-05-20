import { Box, Button, Container, Typography } from '@mui/material';
import { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function ForbiddenPage(): ReactElement {
  return (
    <Box component="main" sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Typography component="h1" variant="headlineLarge">
          Access denied
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, mt: 1 }} variant="bodyMedium">
          You don&apos;t have permission to view this.
        </Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Go to dashboard
        </Button>
      </Container>
    </Box>
  );
}
