import { describe, expect, it } from 'vitest';

import { CreateContentRequestSchema } from './create-content.request';
import { ScheduleContentRequestSchema } from './schedule-content.request';
import { UpdateContentRequestSchema } from './update-content.request';

describe('content request schemas', () => {
  it('validates create content requests', () => {
    expect(
      CreateContentRequestSchema.parse({
        type: 'article',
        title: 'Title',
        tags: ['tech'],
        category: null,
        parentId: null,
      }),
    ).toMatchObject({ type: 'article', title: 'Title' });
    expect(CreateContentRequestSchema.safeParse({ title: 'Title' }).success).toBe(false);
  });

  it('validates update content requests', () => {
    expect(
      UpdateContentRequestSchema.parse({
        title: 'Updated',
        slug: 'updated-title',
        body: { type: 'doc' },
        seoTitle: 'SEO',
        seoDescription: 'Description',
        tags: ['tech'],
        category: null,
        parentId: null,
        featuredImageId: null,
        socialImageId: null,
      }),
    ).toMatchObject({ slug: 'updated-title' });
    expect(UpdateContentRequestSchema.safeParse({ slug: 'Invalid Slug' }).success).toBe(false);
  });

  it('coerces schedule date requests', () => {
    expect(
      ScheduleContentRequestSchema.parse({
        scheduledAt: '2026-07-01T00:00:00.000Z',
      }).scheduledAt,
    ).toEqual(new Date('2026-07-01T00:00:00.000Z'));
  });
});
