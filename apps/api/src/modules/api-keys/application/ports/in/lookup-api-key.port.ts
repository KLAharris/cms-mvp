import { ApiKey } from '../../../domain/entities';

export interface LookupApiKeyCommand {
  rawKey: string;
}

export interface ILookupApiKey {
  execute(command: LookupApiKeyCommand): Promise<ApiKey>;
}
