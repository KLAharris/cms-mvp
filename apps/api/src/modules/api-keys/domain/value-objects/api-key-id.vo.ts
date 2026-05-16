import { ApiKeyDomainError } from '../errors';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApiKeyId {
  private constructor(readonly value: string) {}

  static create(id: string): ApiKeyId {
    const value = id.trim();

    if (!UUID_REGEX.test(value)) {
      throw new ApiKeyDomainError('ApiKey id must be a valid UUID', 'API_KEY_INVALID');
    }

    return new ApiKeyId(value);
  }

  equals(other: ApiKeyId): boolean {
    return this.value === other.value;
  }
}
