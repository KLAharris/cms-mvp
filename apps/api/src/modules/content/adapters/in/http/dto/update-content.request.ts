import { z } from 'zod';

export const UpdateContentRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  body: z.object({}).passthrough().optional().nullable(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  tags: z.array(z.string().max(40)).optional(),
  category: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  featuredImageId: z.string().uuid().optional().nullable(),
  socialImageId: z.string().uuid().optional().nullable(),
});

export type UpdateContentRequest = z.infer<typeof UpdateContentRequestSchema>;
