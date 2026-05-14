import { describe, expect, it } from 'vitest';

import { DomainEvent } from './domain-event';

describe('DomainEvent', () => {
  it('accepts events with occurredAt', () => {
    const occurredAt = new Date('2026-05-14T00:00:00.000Z');
    const event: DomainEvent = { occurredAt };

    expect(event.occurredAt).toBe(occurredAt);
  });
});
