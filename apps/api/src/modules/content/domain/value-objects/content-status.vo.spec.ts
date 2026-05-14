import { describe, expect, it } from 'vitest';

import { ContentStatus } from './content-status.vo';

describe('ContentStatus', () => {
  it('contains expected statuses', () => {
    expect(ContentStatus).toEqual({
      Draft: 'draft',
      InReview: 'in_review',
      Published: 'published',
      Unpublished: 'unpublished',
      Archived: 'archived',
    });
  });
});
