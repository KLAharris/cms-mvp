import { Clock } from '@shared/ports/clock.port';
import { DomainEventPublisher } from '@shared/ports/event-publisher.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { AuditAction, AuditEvent, AuditPort } from '../../../audit/domain';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { PublishRequirementsCheckerService } from '../../domain/services/publish-requirements-checker.service';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  PublishContentCommand,
  PublishContentResult,
  PublishContentUseCase as PublishContentPort,
} from '../ports/in/publish-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';

export class PublishContentUseCase implements PublishContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly clock: Clock,
    private readonly events: DomainEventPublisher,
    private readonly tx: TransactionRunner,
    private readonly audit?: AuditPort,
  ) {}

  async execute(command: PublishContentCommand): Promise<PublishContentResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (!ContentAccessPolicy.canPublish(command.actorRole)) {
        throw new ContentForbiddenError('Cannot publish content');
      }

      PublishRequirementsCheckerService.check(content);
      content.publish(command.actorId, this.clock.now());
      await this.contents.save(content);
      await this.events.publishAll(content.pullDomainEvents());
      await this.audit?.save(
        AuditEvent.create({
          actorId: command.actorId,
          actorIp: command.actorIp ?? 'unknown',
          action: AuditAction.CONTENT_STATUS_CHANGED,
          targetType: 'content',
          targetId: content.id.value,
          summary: { status: content.status },
          timestamp: content.updatedAt,
        }),
      );

      const publishedAt = content.publishedAt;
      if (publishedAt === null) throw new Error('Invariant: publishedAt is null after publish');
      return {
        contentId: content.id.value,
        status: content.status,
        publishedAt,
      };
    });
  }
}
