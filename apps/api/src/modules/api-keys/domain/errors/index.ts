export class ApiKeyDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ApiKeyNotFoundError extends ApiKeyDomainError {
  constructor() {
    super('ApiKey not found', 'API_KEY_NOT_FOUND');
  }
}

export class ApiKeyAlreadyRevokedError extends ApiKeyDomainError {
  constructor() {
    super('ApiKey has already been revoked', 'API_KEY_ALREADY_REVOKED');
  }
}

export class ApiKeyInvalidError extends ApiKeyDomainError {
  constructor() {
    super('ApiKey is invalid or revoked', 'API_KEY_INVALID');
  }
}
