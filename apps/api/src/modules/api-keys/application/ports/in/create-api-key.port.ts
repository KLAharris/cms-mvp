import { ApiKey } from '../../../domain/entities';

export interface CreateApiKeyCommand {
  name: string;
  createdById: string;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

export interface ICreateApiKey {
  execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResult>;
}
