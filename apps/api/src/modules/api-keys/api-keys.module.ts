import { Module } from '@nestjs/common';

import { InProcessEventPublisher } from '../../shared/adapters/in-process-event-publisher.adapter';
import { UuidV4Generator } from '../../shared/adapters/uuid-v4-generator.adapter';
import { CLOCK, Clock } from '../../shared/ports/clock.port';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../shared/ports/event-publisher.port';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ID_GENERATOR, IdGenerator } from '../../shared/ports/id-generator.port';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SystemClock } from '../auth/adapters/out/system-clock.adapter';
import {
  ApiKeyGuard,
  ApiKeysController,
} from './adapters/in/http';
import { PrismaApiKeyRepository } from './adapters/out/persistence';
import {
  CreateApiKeyUseCase,
  ListApiKeysUseCase,
  LookupApiKeyUseCase,
  RevokeApiKeyUseCase,
} from './application/use-cases';
import { IApiKeyRepository } from './application/ports/out';
import {
  API_KEY_REPOSITORY,
  CREATE_API_KEY,
  LIST_API_KEYS,
  LOOKUP_API_KEY,
  REVOKE_API_KEY,
} from './application/ports/tokens';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ApiKeysController],
  providers: [
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
    { provide: ID_GENERATOR, useClass: UuidV4Generator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: InProcessEventPublisher },
    {
      provide: CREATE_API_KEY,
      inject: [API_KEY_REPOSITORY, ID_GENERATOR, CLOCK, DOMAIN_EVENT_PUBLISHER],
      useFactory: (
        apiKeys: IApiKeyRepository,
        ids: IdGenerator,
        clock: Clock,
        events: DomainEventPublisher,
      ): CreateApiKeyUseCase =>
        new CreateApiKeyUseCase(apiKeys, ids, clock, events),
    },
    {
      provide: REVOKE_API_KEY,
      inject: [API_KEY_REPOSITORY, CLOCK, DOMAIN_EVENT_PUBLISHER],
      useFactory: (
        apiKeys: IApiKeyRepository,
        clock: Clock,
        events: DomainEventPublisher,
      ): RevokeApiKeyUseCase => new RevokeApiKeyUseCase(apiKeys, clock, events),
    },
    {
      provide: LIST_API_KEYS,
      inject: [API_KEY_REPOSITORY],
      useFactory: (apiKeys: IApiKeyRepository): ListApiKeysUseCase =>
        new ListApiKeysUseCase(apiKeys),
    },
    {
      provide: LOOKUP_API_KEY,
      inject: [API_KEY_REPOSITORY, CLOCK],
      useFactory: (
        apiKeys: IApiKeyRepository,
        clock: Clock,
      ): LookupApiKeyUseCase => new LookupApiKeyUseCase(apiKeys, clock),
    },
    ApiKeyGuard,
    RolesGuard,
  ],
  exports: [LOOKUP_API_KEY, ApiKeyGuard],
})
export class ApiKeysModule {}
