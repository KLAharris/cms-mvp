import { Clock } from '../../../../shared/ports/clock.port';
import { DomainEventPublisher } from '../../../../shared/ports/event-publisher.port';

import { ApiKeyRevokedEvent } from '../../domain/events';
import { ApiKeyNotFoundError } from '../../domain/errors';
import { IRevokeApiKey, RevokeApiKeyCommand } from '../ports/in';
import { IApiKeyRepository } from '../ports/out';

export class RevokeApiKeyUseCase implements IRevokeApiKey {
  constructor(
    private readonly apiKeys: IApiKeyRepository,
    private readonly clock: Clock,
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<void> {
    const apiKey = await this.apiKeys.findById(command.id);
    if (apiKey === null) {
      throw new ApiKeyNotFoundError();
    }

    apiKey.revoke(this.clock.now());
    await this.apiKeys.update(apiKey);
    await this.events.publishAll([
      new ApiKeyRevokedEvent(apiKey.id.value, command.revokedById),
    ]);
  }
}
