import { Clock } from '@shared/ports/clock.port';
import { IdGenerator } from '@shared/ports/id-generator.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentSnapshot } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  RevertContentCommand,
  RevertContentResult,
  RevertContentUseCase as RevertContentPort,
} from '../ports/in/revert-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';
import { contentSnapshot } from './content-mappers';

export class RevertContentUseCase implements RevertContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly versions: ContentVersionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: RevertContentCommand): Promise<RevertContentResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (
        !ContentAccessPolicy.canRevert(
          command.actorRole,
          command.actorId,
          content.authorId,
        )
      ) {
        throw new ContentForbiddenError('Cannot revert content');
      }

      const version = await this.versions.findByVersionNo(
        content.id,
        command.versionNo,
      );
      if (version === null) {
        throw new ContentNotFoundError(`${command.contentId}:${String(command.versionNo)}`);
      }

      const now = this.clock.now();
      content.applyVersionSnapshot(version.snapshot as ContentSnapshot, command.actorId, now);
      const newVersionNo = await this.versions.nextVersionNo(content.id);
      await this.contents.save(content);
      await this.versions.save(
        ContentVersion.create({
          id: this.idGenerator.generate(),
          contentId: content.id,
          versionNo: newVersionNo,
          snapshot: contentSnapshot(content),
          editorId: command.actorId,
          createdAt: now,
        }),
      );

      return {
        contentId: content.id.value,
        newVersionNo,
        status: content.status,
      };
    });
  }
}
