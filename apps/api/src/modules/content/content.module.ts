import { Module } from '@nestjs/common';

import { InProcessEventPublisher } from '../../shared/adapters/in-process-event-publisher.adapter';
import { NoopTransactionRunner } from '../../shared/adapters/noop-transaction-runner.adapter';
import { UuidV4Generator } from '../../shared/adapters/uuid-v4-generator.adapter';
import { DOMAIN_EVENT_PUBLISHER, DomainEventPublisher } from '../../shared/ports/event-publisher.port';
import { ID_GENERATOR, IdGenerator } from '../../shared/ports/id-generator.port';
import { TRANSACTION_RUNNER, TransactionRunner } from '../../shared/ports/transaction-runner.port';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AUDIT_PORT } from '../audit/audit.tokens';
import { AuditPort } from '../audit/domain';
import { ContentController } from './adapters/in/http/content.controller';
import { ScheduledPublishJob } from './adapters/in/scheduler/scheduled-publish.job';
import { SoftDeleteCleanupJob } from './adapters/in/scheduler/soft-delete-cleanup.job';
import { VersionPruningJob } from './adapters/in/scheduler/version-pruning.job';
import { PrismaContentRepository } from './adapters/out/persistence/prisma-content.repository';
import { PrismaContentVersionRepository } from './adapters/out/persistence/prisma-content-version.repository';
import { ContentRepository } from './application/ports/out/content-repository.port';
import { ContentVersionRepository } from './application/ports/out/content-version-repository.port';
import { CreateContentUseCase } from './application/use-cases/create-content.use-case';
import { DeleteContentUseCase } from './application/use-cases/delete-content.use-case';
import { GetContentUseCase } from './application/use-cases/get-content.use-case';
import { ListContentUseCase } from './application/use-cases/list-content.use-case';
import { ListVersionsUseCase } from './application/use-cases/list-versions.use-case';
import { PublishContentUseCase } from './application/use-cases/publish-content.use-case';
import { RevertContentUseCase } from './application/use-cases/revert-content.use-case';
import { ScheduleContentUseCase } from './application/use-cases/schedule-content.use-case';
import { SubmitForReviewUseCase } from './application/use-cases/submit-for-review.use-case';
import { UnpublishContentUseCase } from './application/use-cases/unpublish-content.use-case';
import { UpdateContentUseCase } from './application/use-cases/update-content.use-case';

export const CONTENT_REPOSITORY = Symbol('ContentRepository');
export const CONTENT_VERSION_REPOSITORY = Symbol('ContentVersionRepository');

@Module({
  imports: [AuthModule, AuditModule, PrismaModule],
  controllers: [ContentController],
  providers: [
    {
      provide: CONTENT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): ContentRepository =>
        new PrismaContentRepository(prisma),
    },
    {
      provide: CONTENT_VERSION_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): ContentVersionRepository =>
        new PrismaContentVersionRepository(prisma),
    },
    { provide: ID_GENERATOR, useClass: UuidV4Generator },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: InProcessEventPublisher },
    { provide: TRANSACTION_RUNNER, useClass: NoopTransactionRunner },
    JwtAuthGuard,
    ScheduledPublishJob,
    SoftDeleteCleanupJob,
    VersionPruningJob,
    {
      provide: 'CREATE_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        versions: ContentVersionRepository,
        ids: IdGenerator,
        clock: { now(): Date },
        tx: TransactionRunner,
        audit: AuditPort,
      ): CreateContentUseCase => new CreateContentUseCase(contents, versions, ids, clock, tx, audit),
    },
    {
      provide: 'UPDATE_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        versions: ContentVersionRepository,
        ids: IdGenerator,
        clock: { now(): Date },
        tx: TransactionRunner,
        audit: AuditPort,
      ): UpdateContentUseCase => new UpdateContentUseCase(contents, versions, ids, clock, tx, audit),
    },
    {
      provide: 'SUBMIT_FOR_REVIEW_USE_CASE',
      inject: [CONTENT_REPOSITORY, 'CLOCK', TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        clock: { now(): Date },
        tx: TransactionRunner,
        audit: AuditPort,
      ): SubmitForReviewUseCase => new SubmitForReviewUseCase(contents, clock, tx, audit),
    },
    {
      provide: 'PUBLISH_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        clock: { now(): Date },
        events: DomainEventPublisher,
        tx: TransactionRunner,
        audit: AuditPort,
      ): PublishContentUseCase => new PublishContentUseCase(contents, clock, events, tx, audit),
    },
    {
      provide: 'UNPUBLISH_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        clock: { now(): Date },
        events: DomainEventPublisher,
        tx: TransactionRunner,
        audit: AuditPort,
      ): UnpublishContentUseCase =>
        new UnpublishContentUseCase(contents, clock, events, tx, audit),
    },
    {
      provide: 'SCHEDULE_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, 'CLOCK', TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        clock: { now(): Date },
        tx: TransactionRunner,
        audit: AuditPort,
      ): ScheduleContentUseCase => new ScheduleContentUseCase(contents, clock, tx, audit),
    },
    {
      provide: 'DELETE_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        clock: { now(): Date },
        events: DomainEventPublisher,
        tx: TransactionRunner,
        audit: AuditPort,
      ): DeleteContentUseCase => new DeleteContentUseCase(contents, clock, events, tx, audit),
    },
    {
      provide: 'LIST_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, TRANSACTION_RUNNER],
      useFactory: (
        contents: ContentRepository,
        tx: TransactionRunner,
      ): ListContentUseCase => new ListContentUseCase(contents, tx),
    },
    {
      provide: 'GET_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, TRANSACTION_RUNNER],
      useFactory: (
        contents: ContentRepository,
        tx: TransactionRunner,
      ): GetContentUseCase => new GetContentUseCase(contents, tx),
    },
    {
      provide: 'REVERT_CONTENT_USE_CASE',
      inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER, AUDIT_PORT],
      useFactory: (
        contents: ContentRepository,
        versions: ContentVersionRepository,
        ids: IdGenerator,
        clock: { now(): Date },
        tx: TransactionRunner,
        audit: AuditPort,
      ): RevertContentUseCase =>
        new RevertContentUseCase(contents, versions, ids, clock, tx, audit),
    },
    {
      provide: 'LIST_VERSIONS_USE_CASE',
      inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, TRANSACTION_RUNNER],
      useFactory: (
        contents: ContentRepository,
        versions: ContentVersionRepository,
        tx: TransactionRunner,
      ): ListVersionsUseCase => new ListVersionsUseCase(contents, versions, tx),
    },
  ],
  exports: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY],
})
export class ContentModule {}
