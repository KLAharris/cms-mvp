import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../../../shared/api/api';
import { revertContent } from '../api/content.api';
import type { ContentType } from '../types/content.types';

interface Version {
  versionNo: number;
  createdAt: string;
  editorId: string;
}

interface VersionHistoryPageProps {
  type: ContentType;
}

export function VersionHistoryPage({ type }: VersionHistoryPageProps): ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: versions, isLoading } = useQuery<Version[]>({
    queryKey: ['versions', id],
    queryFn: async () => {
      const response = await api.get<{ data: Version[] }>(`/api/admin/content/${id}/versions`);
      return response.data.data;
    },
    enabled: Boolean(id),
  });

  const handleRevert = async (versionNo: number) => {
    await revertContent(id, versionNo);
    navigate(`/${type}s/${id}/edit`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="text"
          onClick={() => { navigate(`/${type}s/${id}/edit`); }}
          startIcon={
            <span className="material-symbols-rounded">arrow_back</span>
          }
        >
          Back to editor
        </Button>
        <Typography component="h1" variant="headlineLarge" sx={{ flexGrow: 1 }}>
          Version History
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Editor</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : versions && versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No versions found
                </TableCell>
              </TableRow>
            ) : (
              versions?.map((version) => (
                <TableRow key={version.versionNo}>
                  <TableCell>v{version.versionNo}</TableCell>
                  <TableCell>
                    {new Date(version.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{version.editorId}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => { void handleRevert(version.versionNo); }}
                    >
                      Revert
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
