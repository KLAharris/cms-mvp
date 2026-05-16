export class ApiKeyRevokedEvent {
  readonly eventName = 'api-key.revoked';
  readonly occurredAt: Date;

  constructor(
    readonly apiKeyId: string,
    readonly revokedById: string,
  ) {
    this.occurredAt = new Date();
  }
}
