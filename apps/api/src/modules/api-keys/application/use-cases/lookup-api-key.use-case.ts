import { createHash } from 'crypto';

import { Clock } from '../../../../shared/ports/clock.port';

import { ApiKey } from '../../domain/entities';
import { ApiKeyInvalidError } from '../../domain/errors';
import { ILookupApiKey, LookupApiKeyCommand } from '../ports/in';
import { IApiKeyRepository } from '../ports/out';

export class LookupApiKeyUseCase implements ILookupApiKey {
  constructor(
    private readonly apiKeys: IApiKeyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: LookupApiKeyCommand): Promise<ApiKey> {
    const keyHash = hashApiKey(command.rawKey);
    const apiKey = await this.apiKeys.findByKeyHash(keyHash);

    if (apiKey === null || apiKey.isRevoked) {
      throw new ApiKeyInvalidError();
    }

    apiKey.recordUsage(this.clock.now());
    await this.apiKeys.update(apiKey);

    return apiKey;
  }
}

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
