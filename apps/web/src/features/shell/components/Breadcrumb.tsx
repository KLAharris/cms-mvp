import { Box, Typography } from '@mui/material';
import { type ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
}

export function Breadcrumb({ crumbs }: BreadcrumbProps): ReactElement {
  return (
    <Box
      component="nav"
      aria-label="breadcrumb"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}
    >
      {crumbs.map((crumb, index) => (
        <Box key={crumb.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {index > 0 && (
            <Typography variant="bodyMedium" color="text.secondary">
              /
            </Typography>
          )}
          {crumb.href ? (
            <RouterLink to={crumb.href} style={{ textDecoration: 'none' }}>
              <Typography variant="bodyMedium" color="text.secondary">
                {crumb.label}
              </Typography>
            </RouterLink>
          ) : (
            <Typography variant="bodyMedium">{crumb.label}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
