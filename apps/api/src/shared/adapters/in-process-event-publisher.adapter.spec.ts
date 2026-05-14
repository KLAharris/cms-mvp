import { afterEach, describe, expect, it, vi } from 'vitest';

import { InProcessEventPublisher } from './in-process-event-publisher.adapter';

describe('InProcessEventPublisher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs each published event', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const event = { occurredAt: new Date('2026-06-01T00:00:00.000Z') };

    await new InProcessEventPublisher().publishAll([event]);

    expect(log).toHaveBeenCalledWith('[DomainEvent] Object', event);
  });
});
