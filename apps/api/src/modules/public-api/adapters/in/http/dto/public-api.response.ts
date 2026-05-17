import { createHash } from 'node:crypto';

import type { PaginatedResult } from '../../../../application/public-content.read-model';

export function toETag(data: unknown): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);

  return `"${hash}"`;
}

export function toLastModified(date: Date): string {
  return date.toUTCString();
}

export function wrapList<T>(result: PaginatedResult<T>) {
  return {
    data: result.data,
    page: result.page,
    page_size: result.pageSize,
    total: result.total,
    total_pages: result.totalPages,
  };
}
