export interface DomainEvent {
  readonly occurredAt: Date;
}

export interface DomainEventPublisher {
  publishAll(events: DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');
