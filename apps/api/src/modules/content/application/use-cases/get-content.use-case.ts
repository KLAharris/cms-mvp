import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  GetContentCommand,
  GetContentResult,
  GetContentUseCase as GetContentPort,
} from '../ports/in/get-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';
import { toGetContentResult } from './content-mappers';

export class GetContentUseCase implements GetContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: GetContentCommand): Promise<GetContentResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null || content.deletedAt !== null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (!ContentAccessPolicy.canView(command.actorRole, command.actorId, content)) {
        throw new ContentForbiddenError('Cannot view content');
      }

      return toGetContentResult(content);
    });
  }
}
