import { ApiKeyDomainError } from '../errors';

const MAX_KEY_NAME_LENGTH = 100;

export class KeyName {
  private constructor(readonly value: string) {}

  static create(name: string): KeyName {
    const value = name.trim();

    if (value.length === 0) {
      throw new ApiKeyDomainError('ApiKey name cannot be empty', 'API_KEY_INVALID');
    }

    if (value.length > MAX_KEY_NAME_LENGTH) {
      throw new ApiKeyDomainError(
        'ApiKey name cannot exceed 100 characters',
        'API_KEY_INVALID',
      );
    }

    return new KeyName(value);
  }

  equals(other: KeyName): boolean {
    return this.value === other.value;
  }
}
