import { Clock } from '@shared/ports/clock.port';
import { DomainEventPublisher } from '@shared/ports/event-publisher.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  DeleteContentCommand,
  DeleteContentResult,
  DeleteContentUseCase as DeleteContentPort,
} from '../ports/in/delete-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';

export class DeleteContentUseCase implements DeleteContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly clock: Clock,
    private readonly events: DomainEventPublisher,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: DeleteContentCommand): Promise<DeleteContentResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (!ContentAccessPolicy.canDelete(command.actorRole)) {
        throw new ContentForbiddenError('Cannot delete content');
      }

      content.softDelete(command.actorId, this.clock.now());
      await this.contents.save(content);
      await this.events.publishAll(content.pullDomainEvents());

      const deletedAt = content.deletedAt;
      if (deletedAt === null) throw new Error('Invariant: deletedAt is null after softDelete');
      return {
        contentId: content.id.value,
        deletedAt,
      };
    });
  }
}
