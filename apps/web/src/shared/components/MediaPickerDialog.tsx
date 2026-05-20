import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { type ReactElement, useState, useDeferredValue } from 'react';

import { getMediaUrl } from '../../features/media/types/media.types';
import { useMedia } from '../../features/media/hooks/useMedia';
import type { MediaFilterType, MediaItem } from '../../features/media/types/media.types';

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}

export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
}: MediaPickerDialogProps): ReactElement {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaFilterType>('all');
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useMedia({
    search: deferredSearch || undefined,
    type: typeFilter,
    pageSize: 50,
  });

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSearch('');
    setTypeFilter('all');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Media</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
          <TextField
            placeholder="Search by filename..."
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            sx={{ flex: 1 }}
            slotProps={{ htmlInput: { 'aria-label': 'search media' } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="picker-type-label">Type</InputLabel>
            <Select
              labelId="picker-type-label"
              value={typeFilter}
              label="Type"
              onChange={(e) => { setTypeFilter(e.target.value as MediaFilterType); }}
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : data?.items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No media found</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 1,
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {data?.items.map((item) => (
              <Tooltip key={item.id} title={item.filename}>
                <Box
                  onClick={() => { setSelected(item); }}
                  sx={{
                    width: 120,
                    height: 120,
                    border: '2px solid',
                    borderColor: selected?.id === item.id ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                  role="button"
                  aria-label={item.filename}
                  aria-pressed={selected?.id === item.id}
                >
                  {item.mimeType.startsWith('image/') ? (
                    <Box
                      component="img"
                      src={getMediaUrl(item)}
                      alt={item.altText ?? item.filename}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <span className="material-symbols-rounded">description</span>
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      px: 0.5,
                      py: 0.25,
                    }}
                  >
                    <Typography
                      variant="bodyMedium"
                      sx={{
                        fontSize: 10,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {item.filename}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={selected === null}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}
