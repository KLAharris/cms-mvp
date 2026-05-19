import { Box, Card, CardContent, Typography } from '@mui/material';
import { ReactElement, ReactNode } from 'react';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps): ReactElement {
  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        bgcolor: 'background.default',
        display: 'flex',
        minHeight: '100vh',
        px: 2,
        py: 4,
      }}
    >
      <Card
        elevation={1}
        sx={{
          borderRadius: 3,
          maxWidth: 400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
          <Box
            aria-hidden="true"
            sx={{
              alignItems: 'center',
              bgcolor: 'primaryContainer.main',
              borderRadius: '50%',
              color: 'onPrimaryContainer.main',
              display: 'flex',
              height: 64,
              justifyContent: 'center',
              mb: 3,
              mx: 'auto',
              width: 64,
            }}
          >
            <span className="material-symbols-rounded">dashboard</span>
          </Box>
          <Typography align="center" component="h1" variant="displayMedium">
            {title}
          </Typography>
          <Typography
            align="center"
            color="text.secondary"
            sx={{ mb: 3, mt: 1 }}
            variant="bodyMedium"
          >
            {subtitle}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
