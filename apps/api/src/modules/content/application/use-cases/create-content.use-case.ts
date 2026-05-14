import { Clock } from '@shared/ports/clock.port';
import { IdGenerator } from '@shared/ports/id-generator.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { Content } from '../../domain/entities/content.entity';
import { ContentVersion } from '../../domain/entities/content-version.entity';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import {
  CreateContentCommand,
  CreateContentResult,
  CreateContentUseCase as CreateContentPort,
} from '../ports/in/create-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentVersionRepository } from '../ports/out/content-version-repository.port';
import { contentSnapshot } from './content-mappers';

export class CreateContentUseCase implements CreateContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly versions: ContentVersionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: CreateContentCommand): Promise<CreateContentResult> {
    return this.tx.run(async () => {
      const id = ContentId.create(this.idGenerator.generate());
      const slug = await this.uniqueSlug(command);
      const now = this.clock.now();
      const content = Content.create({
        id,
        type: command.type,
        title: command.title,
        slug,
        authorId: command.actorId,
        seoMetadata: SeoMetadata.create('', ''),
        createdAt: now,
      });

      content.update(
        {
          tags: command.tags?.map(Tag.create) ?? [],
          category: command.category ?? null,
          parentId: command.parentId ?? null,
        },
        now,
      );

      await this.contents.save(content);
      await this.versions.save(
        ContentVersion.create({
          id: this.idGenerator.generate(),
          contentId: content.id,
          versionNo: 1,
          snapshot: contentSnapshot(content),
          editorId: command.actorId,
          createdAt: now,
        }),
      );

      return {
        contentId: content.id.value,
        slug: content.slug.value,
        status: content.status,
      };
    });
  }

  private async uniqueSlug(command: CreateContentCommand): Promise<Slug> {
    const base = Slug.fromTitle(command.title).value;
    let suffix = 1;

    while (true) {
      const value = suffix === 1 ? base : `${base}-${suffix}`;
      const slug = Slug.create(value);
      const existing = await this.contents.findBySlug(command.type, slug);

      if (existing === null) {
        return slug;
      }

      suffix += 1;
    }
  }
}
