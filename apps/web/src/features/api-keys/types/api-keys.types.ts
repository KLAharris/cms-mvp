export interface ApiKey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdById: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  rawKey: string;
}
