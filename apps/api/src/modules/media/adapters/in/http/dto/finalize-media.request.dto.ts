import { z } from 'zod';

export const FinalizeMediaRequestSchema = z.object({
  mediaId: z.string().uuid(),
});

export type FinalizeMediaRequest = z.infer<typeof FinalizeMediaRequestSchema>;
