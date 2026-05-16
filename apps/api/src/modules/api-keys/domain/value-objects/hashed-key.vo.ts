import { ApiKeyDomainError } from '../errors';

export class HashedKey {
  private constructor(readonly value: string) {}

  static create(hash: string): HashedKey {
    const value = hash.trim();

    if (value.length === 0) {
      throw new ApiKeyDomainError('ApiKey hash cannot be empty', 'API_KEY_INVALID');
    }

    return new HashedKey(value);
  }

  equals(other: HashedKey): boolean {
    return this.value === other.value;
  }
}
