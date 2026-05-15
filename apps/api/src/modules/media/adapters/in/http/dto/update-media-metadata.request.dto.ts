import { z } from 'zod';

export const UpdateMediaMetadataRequestSchema = z.object({
  altText: z.string().max(500).optional(),
  caption: z.string().max(1000).optional(),
});

export type UpdateMediaMetadataRequest = z.infer<
  typeof UpdateMediaMetadataRequestSchema
>;
