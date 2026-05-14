import { DomainEvent, DomainEventPublisher } from '../ports/event-publisher.port';

export class InProcessEventPublisher implements DomainEventPublisher {
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      console.log(`[DomainEvent] ${event.constructor.name}`, event);
    }
  }
}
