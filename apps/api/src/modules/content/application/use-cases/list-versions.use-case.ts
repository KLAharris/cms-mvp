import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  ListVersionsCommand,
  ListVersionsResult,
  ListVersionsUseCase as ListVersionsPort,
} from '../ports/in/list-versions.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';

export class ListVersionsUseCase implements ListVersionsPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly versions: ContentVersionRepository,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: ListVersionsCommand): Promise<ListVersionsResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));

      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (!ContentAccessPolicy.canView(command.actorRole, command.actorId, content)) {
        throw new ContentForbiddenError('Cannot view content versions');
      }

      const versions = await this.versions.findByContentId(content.id);

      return {
        versions: [...versions]
          .sort((left, right) => right.versionNo - left.versionNo)
          .map((version) => ({
            versionNo: version.versionNo,
            editorId: version.editorId,
            createdAt: version.createdAt,
          })),
      };
    });
  }
}
