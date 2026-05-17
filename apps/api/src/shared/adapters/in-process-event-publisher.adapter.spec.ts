import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContentPublished } from '../../modules/content/domain/events/content-published.event';
import { ContentUnpublished } from '../../modules/content/domain/events/content-unpublished.event';
import { ContentId } from '../../modules/content/domain/value-objects/content-id.vo';
import { InProcessEventPublisher } from './in-process-event-publisher.adapter';

describe('InProcessEventPublisher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs each published event', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const eventEmitter = { emit: vi.fn() };
    const event = { occurredAt: new Date('2026-06-01T00:00:00.000Z') };

    await new InProcessEventPublisher(eventEmitter as never).publishAll([event]);

    expect(log).toHaveBeenCalledWith('[DomainEvent] Object', event);
  });

  it('emits content.published for ContentPublished events', async () => {
    const eventEmitter = { emit: vi.fn() };
    const event = new ContentPublished(
      ContentId.create('11111111-1111-4111-8111-111111111111'),
      new Date('2026-06-01T00:00:00.000Z'),
      'actor-1',
    );
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await new InProcessEventPublisher(eventEmitter as never).publishAll([event]);

    expect(eventEmitter.emit).toHaveBeenCalledWith('content.published', event);
  });

  it('emits content.unpublished for ContentUnpublished events', async () => {
    const eventEmitter = { emit: vi.fn() };
    const event = new ContentUnpublished(
      ContentId.create('11111111-1111-4111-8111-111111111111'),
      'actor-1',
      new Date('2026-06-01T00:00:00.000Z'),
    );
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await new InProcessEventPublisher(eventEmitter as never).publishAll([event]);

    expect(eventEmitter.emit).toHaveBeenCalledWith('content.unpublished', event);
  });
});
