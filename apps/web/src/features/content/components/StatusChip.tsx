import { Chip } from '@mui/material';
import type { ReactElement } from 'react';
import type { ContentStatus } from '../types/content.types';

interface StatusChipProps {
  status: ContentStatus;
}

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  draft: {
    label: 'Draft',
    backgroundColor: '#E7E0EC',
    color: '#49454F',
  },
  in_review: {
    label: 'In Review',
    backgroundColor: '#F3E5F5',
    color: '#4A148C',
  },
  published: {
    label: 'Published',
    backgroundColor: '#C8E6C9',
    color: '#1B5E20',
  },
  unpublished: {
    label: 'Unpublished',
    backgroundColor: '#E7E0EC',
    color: '#49454F',
  },
  archived: {
    label: 'Archived',
    backgroundColor: '#F3EDF7',
    color: '#49454F',
  },
};

export function StatusChip({ status }: StatusChipProps): ReactElement {
  const config = STATUS_CONFIG[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontWeight: 500,
      }}
    />
  );
}
