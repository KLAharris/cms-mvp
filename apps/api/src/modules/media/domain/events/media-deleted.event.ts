export class MediaDeletedEvent {
  readonly name = 'media.deleted';
  readonly occurredAt: Date;

  constructor(
    readonly mediaId: string,
    readonly storageKey: string,
    readonly deletedBy: string,
  ) {
    this.occurredAt = new Date();
  }
}
