import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { type ReactElement, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { StatusChip } from '../components/StatusChip';
import { useContentList } from '../hooks/useContentList';
import { useCreateContent, useDeleteContent, useSubmitForReview, usePublishContent, useUnpublishContent } from '../hooks/useContentMutations';
import type { ContentItem, ContentStatus, ContentType } from '../types/content.types';
import type { FilterState } from '../utils/content-filters';
import { buildContentParams } from '../utils/content-filters';
import { relativeTime } from '../../../shared/utils/relative-time';
import { useAuthStore } from '../../auth/store/auth.store';

interface ContentListPageProps {
  type: ContentType;
}

const PAGE_SIZE = 20;

export function ContentListPage({ type }: ContentListPageProps): ReactElement {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'author';

  const [filters, setFilters] = useState<FilterState>({
    status: null,
    mine: false,
    lastDays: null,
    title: '',
    page: 1,
  });

  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; item: ContentItem }>(null);

  const params = buildContentParams(type, filters);
  const { data, isLoading } = useContentList(params);

  const createMutation = useCreateContent();
  const deleteMutation = useDeleteContent();

  const pageTitle = type === 'article' ? 'Articles' : 'Pages';

  const handleNew = useCallback(() => {
    createMutation.mutate(
      { type, title: 'Untitled' },
      {
        onSuccess: (item) => {
          navigate(`/${type}s/${item.id}/edit`);
        },
      },
    );
  }, [createMutation, navigate, type]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      // Debounce: simple setState for now, will settle on next render cycle
      setTimeout(() => {
        setFilters((prev) => ({ ...prev, title: value, page: 1 }));
      }, 300);
    },
    [],
  );

  const setStatusFilter = useCallback((status: ContentStatus | null) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const toggleMine = useCallback(() => {
    setFilters((prev) => ({ ...prev, mine: !prev.mine, page: 1 }));
  }, []);

  const toggleLastDays = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      lastDays: prev.lastDays === null ? 30 : null,
      page: 1,
    }));
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleRowClick = (item: ContentItem) => {
    navigate(`/${type}s/${item.id}/edit`);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>, item: ContentItem) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, item });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const submitForReviewMutation = useSubmitForReview(menuAnchor?.item.id ?? '');
  const publishMutation = usePublishContent(menuAnchor?.item.id ?? '');
  const unpublishMutation = useUnpublishContent(menuAnchor?.item.id ?? '');

  const handleSubmitForReview = () => {
    if (menuAnchor) {
      submitForReviewMutation.mutate();
      handleMenuClose();
    }
  };

  const handlePublish = () => {
    if (menuAnchor) {
      publishMutation.mutate();
      handleMenuClose();
    }
  };

  const handleUnpublish = () => {
    if (menuAnchor) {
      unpublishMutation.mutate();
      handleMenuClose();
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const SKELETON_ROWS = 5;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography component="h1" variant="headlineLarge" sx={{ flexGrow: 1 }}>
          {pageTitle}
        </Typography>
        <Button
          variant="contained"
          onClick={handleNew}
          disabled={createMutation.isPending}
          startIcon={
            createMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <span className="material-symbols-rounded">add</span>
            )
          }
        >
          New
        </Button>
      </Box>

      {/* Search */}
      <TextField
        placeholder="Search..."
        value={searchInput}
        onChange={handleSearchChange}
        size="small"
        sx={{ mb: 2, width: 320 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                  search
                </span>
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          clickable
          onClick={() => {
            setStatusFilter(null);
            setFilters((prev) => ({ ...prev, mine: false, lastDays: null }));
          }}
          color={filters.status === null && !filters.mine && filters.lastDays === null ? 'primary' : 'default'}
          component="button"
        />
        <Chip
          label="Draft"
          clickable
          onClick={() => { setStatusFilter('draft'); }}
          color={filters.status === 'draft' ? 'primary' : 'default'}
          component="button"
        />
        <Chip
          label="In Review"
          clickable
          onClick={() => { setStatusFilter('in_review'); }}
          color={filters.status === 'in_review' ? 'primary' : 'default'}
          component="button"
        />
        <Chip
          label="Published"
          clickable
          onClick={() => { setStatusFilter('published'); }}
          color={filters.status === 'published' ? 'primary' : 'default'}
          component="button"
        />
        <Chip
          label="Mine"
          clickable
          onClick={toggleMine}
          color={filters.mine ? 'primary' : 'default'}
          component="button"
        />
        <Chip
          label="Last 30 days"
          clickable
          onClick={toggleLastDays}
          color={filters.lastDays !== null ? 'primary' : 'default'}
          component="button"
        />
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={40} /></TableCell>
                  </TableRow>
                ))
              : data && data.items.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">
                          No {pageTitle.toLowerCase()} found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                : (data?.items ?? []).map((item) => (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => { handleRowClick(item); }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={item.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.author?.name ?? item.authorId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {relativeTime(item.updatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => { e.stopPropagation(); }}>
                        <IconButton
                          size="small"
                          onClick={(e) => { handleMenuOpen(e, item); }}
                          aria-label="row actions"
                        >
                          <span className="material-symbols-rounded">more_vert</span>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!isLoading && data && data.total > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Page {filters.page} of {totalPages}
          </Typography>
          <Button
            size="small"
            disabled={filters.page <= 1}
            onClick={() => { setFilters((prev) => ({ ...prev, page: prev.page - 1 })); }}
          >
            Prev
          </Button>
          <Button
            size="small"
            disabled={filters.page >= totalPages}
            onClick={() => { setFilters((prev) => ({ ...prev, page: prev.page + 1 })); }}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Row action menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              navigate(`/${type}s/${menuAnchor.item.id}/edit`);
              handleMenuClose();
            }
          }}
        >
          Edit
        </MenuItem>
        {menuAnchor?.item.status === 'draft' && (
          <MenuItem onClick={handleSubmitForReview}>Submit for Review</MenuItem>
        )}
        {menuAnchor?.item.status === 'in_review' && (role === 'editor' || role === 'admin') && (
          <MenuItem onClick={handlePublish}>Publish</MenuItem>
        )}
        {menuAnchor?.item.status === 'published' && (
          <MenuItem onClick={handleUnpublish}>Unpublish</MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              setDeleteTarget(menuAnchor.item);
              handleMenuClose();
            }
          }}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => { setDeleteTarget(null); }}>
        <DialogTitle>Delete {pageTitle.slice(0, -1)}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); }}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
