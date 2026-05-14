import { Clock } from '@shared/ports/clock.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  SubmitForReviewCommand,
  SubmitForReviewResult,
  SubmitForReviewUseCase as SubmitForReviewPort,
} from '../ports/in/submit-for-review.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';

export class SubmitForReviewUseCase implements SubmitForReviewPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(
    command: SubmitForReviewCommand,
  ): Promise<SubmitForReviewResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (
        !ContentAccessPolicy.canEdit(
          command.actorRole,
          command.actorId,
          content.authorId,
        )
      ) {
        throw new ContentForbiddenError('Cannot submit content for review');
      }

      content.submit(command.actorId, this.clock.now());
      await this.contents.save(content);

      return {
        contentId: content.id.value,
        status: content.status,
      };
    });
  }
}
