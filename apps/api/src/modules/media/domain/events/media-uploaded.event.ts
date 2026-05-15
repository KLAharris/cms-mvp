import { DomainEvent } from '../../../../shared/ports/event-publisher.port';

export class MediaUploadedEvent implements DomainEvent {
  readonly name = 'media.uploaded';
  readonly occurredAt: Date;

  constructor(
    readonly mediaId: string,
    readonly filename: string,
    readonly mimeType: string,
    readonly uploadedBy: string,
    readonly storageKey: string,
  ) {
    this.occurredAt = new Date();
  }
}
