import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import { type ReactElement } from 'react';

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: string;
  loading?: boolean;
}

export function StatCard({ label, value, icon, loading = false }: StatCardProps): ReactElement {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              bgcolor: 'primaryContainer.main',
              color: 'onPrimaryContainer.main',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded">{icon}</span>
          </Box>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <>
                <Skeleton width={60} height={40} />
                <Skeleton width={100} />
              </>
            ) : (
              <>
                <Typography
                  variant="displayMedium"
                  color="primary"
                  sx={{ fontSize: '2rem', lineHeight: 1.2 }}
                >
                  {value ?? 0}
                </Typography>
                <Typography variant="bodyMedium" color="text.secondary">
                  {label}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
