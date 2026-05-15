import { z } from 'zod';

export const ListMediaQuerySchema = z.object({
  search: z.string().optional(),
  uploadedBy: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;
