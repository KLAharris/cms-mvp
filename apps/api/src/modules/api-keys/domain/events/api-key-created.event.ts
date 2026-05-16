export class ApiKeyCreatedEvent {
  readonly eventName = 'api-key.created';
  readonly occurredAt: Date;

  constructor(
    readonly apiKeyId: string,
    readonly name: string,
    readonly createdById: string,
  ) {
    this.occurredAt = new Date();
  }
}
