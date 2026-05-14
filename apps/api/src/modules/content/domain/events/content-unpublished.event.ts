import { ContentId } from '../value-objects/content-id.vo';
import { DomainEvent } from './domain-event';

export class ContentUnpublished implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    readonly contentId: ContentId,
    readonly actorId: string,
    now: Date,
  ) {
    this.occurredAt = now;
  }
}
