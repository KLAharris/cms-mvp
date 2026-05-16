import { createHash, randomBytes } from 'crypto';

import { Clock } from '../../../../shared/ports/clock.port';
import { DomainEventPublisher } from '../../../../shared/ports/event-publisher.port';
import { IdGenerator } from '../../../../shared/ports/id-generator.port';

import { ApiKey } from '../../domain/entities';
import { ApiKeyCreatedEvent } from '../../domain/events';
import {
  CreateApiKeyCommand,
  CreateApiKeyResult,
  ICreateApiKey,
} from '../ports/in';
import { IApiKeyRepository } from '../ports/out';

export class CreateApiKeyUseCase implements ICreateApiKey {
  constructor(
    private readonly apiKeys: IApiKeyRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResult> {
    const rawKey = randomBytes(32).toString('hex');
    const keyHash = hashApiKey(rawKey);
    const apiKey = ApiKey.create({
      id: this.ids.generate(),
      name: command.name,
      keyHash,
      createdById: command.createdById,
      createdAt: this.clock.now(),
    });

    await this.apiKeys.save(apiKey);
    await this.events.publishAll([
      new ApiKeyCreatedEvent(
        apiKey.id.value,
        apiKey.name.value,
        apiKey.createdById,
      ),
    ]);

    return { apiKey, rawKey };
  }
}

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
