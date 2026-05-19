import { api } from '../../../shared/api/api';
import type {
  ApiKey,
  ApiKeyListResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../types/api-keys.types';

export async function listApiKeys(): Promise<ApiKeyListResponse> {
  const response = await api.get<ApiKeyListResponse>('/api/admin/api-keys');
  return response.data;
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  const response = await api.post<CreateApiKeyResponse>('/api/admin/api-keys', data);
  return response.data;
}

export async function revokeApiKey(id: string): Promise<ApiKey> {
  const response = await api.delete<ApiKey>(`/api/admin/api-keys/${id}`);
  return response.data;
}
