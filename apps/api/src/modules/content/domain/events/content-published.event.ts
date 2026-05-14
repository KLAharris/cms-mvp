import { ContentId } from '../value-objects/content-id.vo';
import { DomainEvent } from './domain-event';

export class ContentPublished implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    readonly contentId: ContentId,
    readonly publishedAt: Date,
    readonly actorId: string,
  ) {
    this.occurredAt = publishedAt;
  }
}
