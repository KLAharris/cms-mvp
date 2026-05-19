import { Box, Button, Container, Typography } from '@mui/material';
import { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage(): ReactElement {
  return (
    <Box component="main" sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Typography component="h1" variant="headlineLarge">
          Page not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, mt: 1 }} variant="bodyMedium">
          The page you requested does not exist.
        </Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Go to dashboard
        </Button>
      </Container>
    </Box>
  );
}
