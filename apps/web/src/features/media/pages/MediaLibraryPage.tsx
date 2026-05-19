import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
  useCallback,
  useDeferredValue,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useBulkDeleteMedia,
  useDeleteMedia,
  useMedia,
  useUpdateMedia,
  MEDIA_QUERY_KEY,
} from '../hooks/useMedia';
import { useUpload } from '../hooks/useUpload';
import type { MediaFilterType, MediaItem } from '../types/media.types';
import { useUiStore } from '../../../shared/store/ui.store';

type ViewMode = 'grid' | 'list';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaDrawerProps {
  item: MediaItem;
  onClose: () => void;
  onDelete: () => void;
}

function MediaDetailDrawer({ item, onClose, onDelete }: MediaDrawerProps): ReactElement {
  const [altText, setAltText] = useState(item.altText ?? '');
  const [caption, setCaption] = useState(item.caption ?? '');
  const updateMedia = useUpdateMedia();
  const showSnack = useUiStore((s) => s.showSnack);

  const handleSave = () => {
    updateMedia.mutate(
      { id: item.id, data: { altText, caption } },
      {
        onSuccess: () => { showSnack('Saved'); },
        onError: () => { showSnack('Failed to save', 'error'); },
      },
    );
  };

  return (
    <Box sx={{ width: 360, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="labelLarge" sx={{ flex: 1 }}>
          {item.filename}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close drawer">
          <span className="material-symbols-rounded">close</span>
        </IconButton>
      </Box>

      {item.mimeType.startsWith('image/') && (
        <Box
          component="img"
          src={item.url}
          alt={item.altText ?? item.filename}
          sx={{ width: '100%', borderRadius: 1, mb: 2 }}
        />
      )}

      <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1 }}>
        Size: {formatBytes(item.size)}
      </Typography>
      {item.width !== undefined && item.height !== undefined && (
        <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1 }}>
          Dimensions: {item.width}×{item.height}
        </Typography>
      )}
      <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1 }}>
        Uploaded by: {item.uploadedBy.name}
      </Typography>
      <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 2 }}>
        Used in {item.usedInCount} {item.usedInCount === 1 ? 'piece' : 'pieces'} of content
      </Typography>

      <TextField
        label="Alt text"
        value={altText}
        onChange={(e) => { setAltText(e.target.value); }}
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Caption"
        value={caption}
        onChange={(e) => { setCaption(e.target.value); }}
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateMedia.isPending}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={onDelete}
          disabled={item.usedInCount > 0}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

export function MediaLibraryPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaFilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<MediaItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useMedia({
    search: deferredSearch || undefined,
    type: typeFilter,
    page,
    pageSize: 20,
  });

  const { upload, status: uploadStatus, progress: uploadProgress } = useUpload();
  const deleteMedia = useDeleteMedia();
  const bulkDelete = useBulkDeleteMedia();
  const showSnack = useUiStore((s) => s.showSnack);
  const queryClient = useQueryClient();

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      list.forEach((file) => {
        void upload(file)
          .then(() => { showSnack(`${file.name} uploaded`); })
          .catch((err: unknown) => {
            showSnack(err instanceof Error ? err.message : 'Upload failed', 'error');
          });
      });
    },
    [upload, showSnack],
  );

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteItem = (id: string) => {
    deleteMedia.mutate(id, {
      onSuccess: () => {
        setSingleDeleteId(null);
        if (drawerItem?.id === id) setDrawerItem(null);
        showSnack('Deleted');
        void queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] });
      },
      onError: () => { showSnack('Failed to delete', 'error'); },
    });
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
        showSnack('Deleted');
      },
      onError: () => { showSnack('Failed to delete', 'error'); },
    });
  };

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => { showSnack('URL copied'); });
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Container
      maxWidth={false}
      sx={{ py: 3 }}
      onDragEnter={handleDragEnter}
    >
      {/* Drop zone overlay */}
      {isDragOver && (
        <Box
          onDragLeave={handleDragLeave}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={handleDrop}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(103, 80, 164, 0.15)',
            border: '3px dashed',
            borderColor: 'primary.main',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid="drop-zone"
        >
          <Typography variant="headlineLarge" color="primary">
            Drop files to upload
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography component="h1" variant="headlineLarge" sx={{ flex: 1 }}>
          Media Library
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileInput}
          data-testid="file-input"
        />
        <Button
          variant="contained"
          onClick={() => { fileInputRef.current?.click(); }}
          startIcon={<span className="material-symbols-rounded">upload</span>}
        >
          Upload
        </Button>
      </Box>

      {/* Upload progress */}
      {uploadStatus === 'uploading' && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="bodyMedium" color="text.secondary">
            Uploading... {String(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by filename or alt text"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { 'aria-label': 'search media' } }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="media-type-label">Type</InputLabel>
          <Select
            labelId="media-type-label"
            value={typeFilter}
            label="Type"
            onChange={(e) => {
              setTypeFilter(e.target.value as MediaFilterType);
              setPage(1);
            }}
          >
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
          </Select>
        </FormControl>
        <IconButton
          size="small"
          onClick={() => { setViewMode('grid'); }}
          color={viewMode === 'grid' ? 'primary' : 'default'}
          aria-label="Grid view"
        >
          <span className="material-symbols-rounded">grid_view</span>
        </IconButton>
        <IconButton
          size="small"
          onClick={() => { setViewMode('list'); }}
          color={viewMode === 'list' ? 'primary' : 'default'}
          aria-label="List view"
        >
          <span className="material-symbols-rounded">view_list</span>
        </IconButton>

        {selectedIds.size > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => { setBulkDeleteOpen(true); }}
          >
            Delete selected ({selectedIds.size})
          </Button>
        )}
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 80, opacity: 0.3 }}>
            perm_media
          </span>
          <Typography variant="headlineLarge" color="text.secondary" sx={{ mt: 2 }}>
            No media found
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary">
            Upload files to get started
          </Typography>
        </Box>
      ) : viewMode === 'grid' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 2,
          }}
        >
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                position: 'relative',
                width: 160,
                height: 160,
                border: '1px solid',
                borderColor: selectedIds.has(item.id) ? 'primary.main' : 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover .tile-actions': { opacity: 1 },
                '&:hover .tile-checkbox': { opacity: 1 },
              }}
              onClick={() => { setDrawerItem(item); }}
            >
              {item.mimeType.startsWith('image/') ? (
                <Box
                  component="img"
                  src={item.url}
                  alt={item.altText ?? item.filename}
                  sx={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 48 }}>
                    description
                  </span>
                </Box>
              )}
              <Tooltip title={item.filename}>
                <Typography
                  variant="bodyMedium"
                  sx={{
                    fontSize: 11,
                    px: 1,
                    py: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.filename}
                </Typography>
              </Tooltip>

              {/* Checkbox (always in DOM, CSS opacity) */}
              <Box
                className="tile-checkbox"
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  opacity: selectedIds.has(item.id) ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              >
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  size="small"
                  sx={{ p: 0, bgcolor: 'background.paper', borderRadius: 0.5 }}
                  slotProps={{ input: { 'aria-label': `Select ${item.filename}` } }}
                />
              </Box>

              {/* Hover actions */}
              <Box
                className="tile-actions"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  opacity: 0,
                  transition: 'opacity 0.1s',
                  display: 'flex',
                  gap: 0.5,
                }}
                onClick={(e) => { e.stopPropagation(); }}
              >
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                    onClick={() => { copyUrl(item.url); }}
                    aria-label="Copy URL"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                      link
                    </span>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                    onClick={() => { setSingleDeleteId(item.id); }}
                    aria-label="Delete"
                    disabled={item.usedInCount > 0}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                      delete
                    </span>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        /* List view */
        <Box>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => { setDrawerItem(item); }}
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                size="small"
                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                slotProps={{ input: { 'aria-label': `Select ${item.filename}` } }}
              />
              {item.mimeType.startsWith('image/') ? (
                <Box
                  component="img"
                  src={item.url}
                  alt={item.altText ?? item.filename}
                  sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 0.5 }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    borderRadius: 0.5,
                  }}
                >
                  <span className="material-symbols-rounded">description</span>
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="labelLarge" sx={{ display: 'block' }}>
                  {item.filename}
                </Typography>
                <Typography variant="bodyMedium" color="text.secondary">
                  {formatBytes(item.size)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {!isLoading && items.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={page <= 1}
            onClick={() => { setPage((p) => p - 1); }}
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
            onClick={() => { setPage((p) => p + 1); }}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Detail drawer */}
      <Drawer anchor="right" open={drawerItem !== null} onClose={() => { setDrawerItem(null); }}>
        {drawerItem && (
          <MediaDetailDrawer
            item={drawerItem}
            onClose={() => { setDrawerItem(null); }}
            onDelete={() => { setSingleDeleteId(drawerItem.id); }}
          />
        )}
      </Drawer>

      {/* Single delete confirmation */}
      <Dialog
        open={singleDeleteId !== null}
        onClose={() => { setSingleDeleteId(null); }}
      >
        <DialogTitle>Delete media?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the file.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSingleDeleteId(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => { if (singleDeleteId) handleDeleteItem(singleDeleteId); }}
            disabled={deleteMedia.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onClose={() => { setBulkDeleteOpen(false); }}>
        <DialogTitle>Delete {selectedIds.size} files?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the selected files.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBulkDeleteOpen(false); }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={bulkDelete.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
