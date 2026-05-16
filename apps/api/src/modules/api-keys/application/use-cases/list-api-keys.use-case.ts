import { ApiKey } from '../../domain/entities';
import { IListApiKeys } from '../ports/in';
import { IApiKeyRepository } from '../ports/out';

export class ListApiKeysUseCase implements IListApiKeys {
  constructor(private readonly apiKeys: IApiKeyRepository) {}

  async execute(): Promise<ApiKey[]> {
    return this.apiKeys.findAll();
  }
}
