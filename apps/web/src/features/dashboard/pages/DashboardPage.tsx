import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid2,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { listAuditEvents } from '../../audit/api/audit.api';
import type { AuditEvent } from '../../audit/types/audit.types';
import { listContent } from '../../content/api/content.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { StatCard } from '../components/StatCard';
import { relativeTime } from '../../../shared/utils/relative-time';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const displayName = user?.name ?? user?.email ?? '';

  // Stat queries
  const { data: totalData, isLoading: totalLoading } = useQuery({
    queryKey: ['content-stats', 'article', 'total'],
    queryFn: () => listContent({ type: 'article', pageSize: 1 }),
  });

  const { data: publishedData, isLoading: publishedLoading } = useQuery({
    queryKey: ['content-stats', 'article', 'published'],
    queryFn: () => listContent({ type: 'article', status: 'published', pageSize: 1 }),
  });

  const { data: inReviewData, isLoading: inReviewLoading } = useQuery({
    queryKey: ['content-stats', 'article', 'in_review'],
    queryFn: () => listContent({ type: 'article', status: 'in_review', pageSize: 1 }),
  });

  const { data: draftData, isLoading: draftLoading } = useQuery({
    queryKey: ['content-stats', 'article', 'draft'],
    queryFn: () => listContent({ type: 'article', status: 'draft', pageSize: 1 }),
  });

  // Recent activity
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => listAuditEvents({ pageSize: 10 }),
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Greeting */}
      <Typography component="h1" variant="headlineLarge" sx={{ mb: 3 }}>
        {getGreeting()}, {displayName}
      </Typography>

      {/* Stat cards */}
      <Grid2 container spacing={2} sx={{ mb: 4 }}>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Articles"
            value={totalData?.total}
            icon="article"
            loading={totalLoading}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Published"
            value={publishedData?.total}
            icon="check_circle"
            loading={publishedLoading}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="In Review"
            value={inReviewData?.total}
            icon="rate_review"
            loading={inReviewLoading}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Drafts"
            value={draftData?.total}
            icon="edit_note"
            loading={draftLoading}
          />
        </Grid2>
      </Grid2>

      {/* Bottom row */}
      <Grid2 container spacing={3}>
        {/* Recent activity */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
                Recent Activity
              </Typography>
              {auditLoading ? (
                <List>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <Skeleton variant="circular" width={24} height={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Skeleton />}
                        secondary={<Skeleton width="60%" />}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <List dense>
                  {(auditData?.items ?? []).map((event: AuditEvent) => (
                    <ListItem key={event.id} alignItems="flex-start">
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                          history
                        </span>
                      </ListItemIcon>
                      <ListItemText
                        primary={`${event.action}: ${event.targetTitle}`}
                        secondary={`${event.actorName} · ${relativeTime(event.createdAt)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Box sx={{ mt: 1 }}>
                <RouterLink to="/audit" style={{ textDecoration: 'none' }}>
                  <Typography variant="bodyMedium" color="primary">
                    View audit log →
                  </Typography>
                </RouterLink>
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        {/* Quick actions */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => { navigate('/articles/new'); }}
                  startIcon={<span className="material-symbols-rounded">add</span>}
                >
                  New Article
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => { navigate('/pages/new'); }}
                  startIcon={<span className="material-symbols-rounded">add</span>}
                >
                  New Page
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  disabled
                  onClick={() => { navigate('/media'); }}
                  startIcon={<span className="material-symbols-rounded">upload</span>}
                >
                  Upload Media
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  );
}
