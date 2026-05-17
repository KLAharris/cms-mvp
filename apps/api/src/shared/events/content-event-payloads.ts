export interface ContentPublishedPayload {
  contentId: string;
  actorId: string;
  occurredAt: Date;
}

export interface ContentUnpublishedPayload {
  contentId: string;
  actorId: string;
  occurredAt: Date;
}
