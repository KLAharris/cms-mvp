import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { type ReactElement, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { getAuditExportUrl, listAuditEvents } from '../api/audit.api';
import type { AuditListParams } from '../types/audit.types';
import { useAuthStore } from '../../auth/store/auth.store';

const ACTION_OPTIONS = ['content.created', 'content.updated', 'content.published', 'content.deleted',
  'user.invited', 'user.deactivated', 'media.uploaded', 'media.deleted', 'api_key.created', 'api_key.revoked'];

const TARGET_TYPES = ['content', 'user', 'media', 'api_key'];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AuditLogPage(): ReactElement {
  const currentUser = useAuthStore((s) => s.user);
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuditLogContent />;
}

function AuditLogContent(): ReactElement {
  const [params, setParams] = useState<AuditListParams>({
    page: 1,
    pageSize: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => listAuditEvents(params),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = params.pageSize ?? 20;
  const page = params.page ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const handleExport = () => {
    window.location.href = getAuditExportUrl();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography component="h1" variant="headlineLarge" sx={{ flex: 1 }}>
          Audit Log
        </Typography>
        <Button
          variant="outlined"
          onClick={handleExport}
          startIcon={<span className="material-symbols-rounded">download</span>}
        >
          Export CSV
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Actor"
          size="small"
          value={params.actorId ?? ''}
          onChange={(e) => {
            setParams((p) => ({ ...p, actorId: e.target.value || undefined, page: 1 }));
          }}
          sx={{ minWidth: 160 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="audit-action-label">Action</InputLabel>
          <Select
            labelId="audit-action-label"
            value={params.action ?? ''}
            label="Action"
            onChange={(e) => {
              setParams((p) => ({ ...p, action: e.target.value || undefined, page: 1 }));
            }}
          >
            <MenuItem value="">All actions</MenuItem>
            {ACTION_OPTIONS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="audit-target-label">Target type</InputLabel>
          <Select
            labelId="audit-target-label"
            value={params.targetType ?? ''}
            label="Target type"
            onChange={(e) => {
              setParams((p) => ({ ...p, targetType: e.target.value || undefined, page: 1 }));
            }}
          >
            <MenuItem value="">All types</MenuItem>
            {TARGET_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="From"
          type="date"
          size="small"
          value={params.dateFrom ?? ''}
          onChange={(e) => {
            setParams((p) => ({ ...p, dateFrom: e.target.value || undefined, page: 1 }));
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={params.dateTo ?? ''}
          onChange={(e) => {
            setParams((p) => ({ ...p, dateTo: e.target.value || undefined, page: 1 }));
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target type</TableCell>
              <TableCell>Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">No audit events found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatTimestamp(event.timestamp)}
                  </TableCell>
                  <TableCell>{event.actorId}</TableCell>
                  <TableCell>
                    <Chip label={event.action} size="small" />
                  </TableCell>
                  <TableCell>{event.targetType}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.summary}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {!isLoading && items.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={page <= 1}
            onClick={() => { setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 })); }}
          >
            Previous
          </Button>
          <Typography variant="bodyMedium">
            Page {page} of {pageCount}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={page >= pageCount}
            onClick={() => { setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 })); }}
          >
            Next
          </Button>
        </Box>
      )}
    </Container>
  );
}
