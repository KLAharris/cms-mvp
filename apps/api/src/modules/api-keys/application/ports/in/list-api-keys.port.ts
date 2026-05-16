import { ApiKey } from '../../../domain/entities';

export interface IListApiKeys {
  execute(): Promise<ApiKey[]>;
}
