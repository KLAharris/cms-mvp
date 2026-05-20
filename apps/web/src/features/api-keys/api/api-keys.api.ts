import { api } from '../../../shared/api/api';
import type {
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../types/api-keys.types';

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await api.get<ApiKey[]>('/api/admin/api-keys');
  return response.data;
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  const response = await api.post<CreateApiKeyResponse>('/api/admin/api-keys', data);
  return response.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`/api/admin/api-keys/${id}`);
}
