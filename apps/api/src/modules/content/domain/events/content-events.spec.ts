import { describe, expect, it } from 'vitest';

import { ContentId } from '../value-objects/content-id.vo';
import { ContentDeleted } from './content-deleted.event';
import { ContentPublished } from './content-published.event';
import { ContentUnpublished } from './content-unpublished.event';

describe('content events', () => {
  const contentId = ContentId.create('123e4567-e89b-42d3-a456-426614174000');
  const now = new Date('2026-05-14T00:00:00.000Z');

  it('ContentPublished sets occurredAt to publishedAt', () => {
    const event = new ContentPublished(contentId, now, 'actor-1');

    expect(event.contentId).toBe(contentId);
    expect(event.publishedAt).toBe(now);
    expect(event.actorId).toBe('actor-1');
    expect(event.occurredAt).toBe(now);
  });

  it('ContentUnpublished sets occurredAt to now', () => {
    const event = new ContentUnpublished(contentId, 'actor-1', now);

    expect(event.contentId).toBe(contentId);
    expect(event.actorId).toBe('actor-1');
    expect(event.occurredAt).toBe(now);
  });

  it('ContentDeleted sets occurredAt to now', () => {
    const event = new ContentDeleted(contentId, 'actor-1', now);

    expect(event.contentId).toBe(contentId);
    expect(event.actorId).toBe('actor-1');
    expect(event.occurredAt).toBe(now);
  });
});
