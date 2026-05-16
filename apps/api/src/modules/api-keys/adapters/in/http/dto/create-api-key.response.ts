import { ApiKeyResponse } from './api-key.response';

export type CreateApiKeyResponse = ApiKeyResponse & {
  rawKey: string;
};
