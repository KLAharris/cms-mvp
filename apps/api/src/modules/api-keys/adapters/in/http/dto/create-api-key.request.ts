import { z } from 'zod';

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
