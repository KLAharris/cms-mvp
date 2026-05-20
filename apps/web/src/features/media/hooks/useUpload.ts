import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { finalizeMedia, presignMedia, uploadToStorage } from '../api/media.api';
import {
  ALLOWED_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  type MediaItem,
  type UploadState,
} from '../types/media.types';
import { MEDIA_QUERY_KEY } from './useMedia';

interface UploadOptions {
  altText?: string;
}

export function useUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>({ status: 'idle', progress: 0 });

  const upload = useCallback(
    async (file: File, opts?: UploadOptions): Promise<MediaItem> => {
      if (!(ALLOWED_MEDIA_TYPES as string[]).includes(file.type)) {
        const err = `Unsupported file type: ${file.type}`;
        setState({ status: 'error', progress: 0, error: err });
        throw new Error(err);
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        const err = 'File exceeds 20 MB limit';
        setState({ status: 'error', progress: 0, error: err });
        throw new Error(err);
      }

      setState({ status: 'uploading', progress: 0 });

      try {
        const { uploadUrl, mediaId } = await presignMedia({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });

        setState({ status: 'uploading', progress: 30 });

        await uploadToStorage(uploadUrl, file);

        setState({ status: 'uploading', progress: 80 });

        const item = await finalizeMedia({ mediaId });

        setState({ status: 'done', progress: 100 });
        await queryClient.invalidateQueries({ queryKey: [MEDIA_QUERY_KEY] });

        return item;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setState({ status: 'error', progress: 0, error: msg });
        throw err;
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0 });
  }, []);

  return { upload, reset, ...state };
}
