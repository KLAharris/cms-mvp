import { describe, expect, it } from 'vitest';

import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEvent,
  DomainEventPublisher,
} from './event-publisher.port';

describe('DomainEventPublisher port', () => {
  it('defines publisher and event contracts with token', async () => {
    const occurredAt = new Date('2026-05-14T00:00:00.000Z');
    const events: DomainEvent[] = [{ occurredAt }];
    const publisher: DomainEventPublisher = {
      publishAll: (publishedEvents) => {
        expect(publishedEvents).toBe(events);
        return Promise.resolve();
      },
    };

    await publisher.publishAll(events);

    expect(DOMAIN_EVENT_PUBLISHER.description).toBe('DomainEventPublisher');
  });
});
