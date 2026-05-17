import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContentPublished } from '../../modules/content/domain/events/content-published.event';
import { ContentUnpublished } from '../../modules/content/domain/events/content-unpublished.event';
import { DomainEvent, DomainEventPublisher } from '../ports/event-publisher.port';

@Injectable()
export class InProcessEventPublisher implements DomainEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      console.log(`[DomainEvent] ${event.constructor.name}`, event);
      this.emitNestEvent(event);
    }
    return Promise.resolve();
  }

  private emitNestEvent(event: DomainEvent): void {
    if (event instanceof ContentPublished) {
      this.eventEmitter.emit('content.published', event);
      return;
    }

    if (event instanceof ContentUnpublished) {
      this.eventEmitter.emit('content.unpublished', event);
    }
  }
}
