import { z } from 'zod';

export const ScheduleContentRequestSchema = z.object({
  scheduledAt: z.coerce.date(),
});

export type ScheduleContentRequest = z.infer<typeof ScheduleContentRequestSchema>;
