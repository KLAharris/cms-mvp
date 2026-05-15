export class MediaUploadedEvent {
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
