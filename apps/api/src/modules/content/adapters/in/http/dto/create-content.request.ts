import { z } from 'zod';

import { ContentType } from '../../../../domain/value-objects/content-type.vo';

export const CreateContentRequestSchema = z.object({
  type: z.nativeEnum(ContentType),
  title: z.string().min(1).max(200),
  tags: z.array(z.string().max(40)).optional(),
  category: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

export type CreateContentRequest = z.infer<typeof CreateContentRequestSchema>;
