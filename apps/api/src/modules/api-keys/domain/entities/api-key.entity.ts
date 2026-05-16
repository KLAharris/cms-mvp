import { ApiKeyAlreadyRevokedError, ApiKeyDomainError } from '../errors';
import { ApiKeyId, HashedKey, KeyName } from '../value-objects';

export type ApiKeyCreateProps = {
  id: string;
  name: string;
  keyHash: string;
  createdById: string;
  createdAt: Date;
};

export class ApiKey {
  readonly id: ApiKeyId;
  name: KeyName;
  readonly keyHash: HashedKey;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  readonly createdById: string;
  readonly createdAt: Date;

  private constructor(props: {
    id: ApiKeyId;
    name: KeyName;
    keyHash: HashedKey;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdById: string;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.keyHash = props.keyHash;
    this.lastUsedAt = props.lastUsedAt;
    this.revokedAt = props.revokedAt;
    this.createdById = props.createdById;
    this.createdAt = props.createdAt;
  }

  static create(props: ApiKeyCreateProps): ApiKey {
    const createdById = props.createdById.trim();

    if (createdById.length === 0) {
      throw new ApiKeyDomainError('ApiKey creator id cannot be empty', 'API_KEY_INVALID');
    }

    return new ApiKey({
      id: ApiKeyId.create(props.id),
      name: KeyName.create(props.name),
      keyHash: HashedKey.create(props.keyHash),
      lastUsedAt: null,
      revokedAt: null,
      createdById,
      createdAt: props.createdAt,
    });
  }

  revoke(now: Date): void {
    if (this.revokedAt !== null) {
      throw new ApiKeyAlreadyRevokedError();
    }

    this.revokedAt = now;
  }

  recordUsage(now: Date): void {
    this.lastUsedAt = now;
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }
}
