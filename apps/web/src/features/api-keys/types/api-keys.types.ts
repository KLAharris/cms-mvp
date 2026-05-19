export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  status: ApiKeyStatus;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ApiKeyListResponse {
  items: ApiKey[];
  total: number;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key: string;
  status: 'active';
  createdAt: string;
}
