import { ApiKey } from '../../../domain/entities';

export interface IApiKeyRepository {
  save(apiKey: ApiKey): Promise<void>;
  findById(id: string): Promise<ApiKey | null>;
  findByKeyHash(hash: string): Promise<ApiKey | null>;
  findAll(): Promise<ApiKey[]>;
  update(apiKey: ApiKey): Promise<void>;
}
