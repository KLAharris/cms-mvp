import { Clock } from '@shared/ports/clock.port';
import { IdGenerator } from '@shared/ports/id-generator.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { SlugConflictError } from '../../domain/errors/slug-conflict.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  UpdateContentCommand,
  UpdateContentResult,
  UpdateContentUseCase as UpdateContentPort,
} from '../ports/in/update-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';
import { contentSnapshot, updateFieldsFromCommand } from './content-mappers';

export class UpdateContentUseCase implements UpdateContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly versions: ContentVersionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: UpdateContentCommand): Promise<UpdateContentResult> {
    return this.tx.run(async () => {
      const contentId = ContentId.create(command.contentId);
      const content = await this.contents.findById(contentId);

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
        throw new ContentForbiddenError('Cannot edit content');
      }

      const fields = updateFieldsFromCommand(command);
      if (fields.slug !== undefined) {
        const existing = await this.contents.findBySlug(content.type, fields.slug);
        if (existing !== null && !existing.id.equals(content.id)) {
          throw new SlugConflictError(content.type, fields.slug.value);
        }
      }

      const now = this.clock.now();
      content.update(fields, now);
      const versionNo = await this.versions.nextVersionNo(content.id);
      const version = ContentVersion.create({
        id: this.idGenerator.generate(),
        contentId: content.id,
        versionNo,
        snapshot: contentSnapshot(content),
        editorId: command.actorId,
        createdAt: now,
      });

      await this.contents.save(content);
      await this.versions.save(version);

      return {
        contentId: content.id.value,
        status: content.status,
        updatedAt: content.updatedAt,
      };
    });
  }
}
