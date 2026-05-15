import { z } from 'zod';

export const PresignUploadRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1),
});

export type PresignUploadRequest = z.infer<typeof PresignUploadRequestSchema>;
