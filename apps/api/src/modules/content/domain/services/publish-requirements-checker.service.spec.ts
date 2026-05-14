import { describe, expect, it } from 'vitest';

import { Content } from '../entities/content.entity';
import { PublishValidationError } from '../errors/publish-validation.error';
import { ContentId } from '../value-objects/content-id.vo';
import { ContentStatus } from '../value-objects/content-status.vo';
import { ContentType } from '../value-objects/content-type.vo';
import { RichTextBody } from '../value-objects/rich-text-body.vo';
import { SeoMetadata } from '../value-objects/seo-metadata.vo';
import { Slug } from '../value-objects/slug.vo';
import { PublishRequirementsCheckerService } from './publish-requirements-checker.service';

function content(overrides: {
  title?: string;
  body?: RichTextBody | null;
  seoMetadata?: SeoMetadata;
} = {}): Content {
  return Content.reconstitute({
    id: ContentId.create('123e4567-e89b-42d3-a456-426614174000'),
    type: ContentType.Article,
    title: overrides.title ?? 'Title',
    slug: Slug.create('title'),
    body: 'body' in overrides ? overrides.body ?? null : RichTextBody.create({ type: 'doc' }),
    status: ContentStatus.Draft,
    authorId: 'author-1',
    featuredImageId: null,
    socialImageId: null,
    seoMetadata: overrides.seoMetadata ?? SeoMetadata.create('', 'Description'),
    tags: [],
    category: null,
    parentId: null,
    scheduledAt: null,
    publishedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  });
}

describe('PublishRequirementsCheckerService', () => {
  it('passes valid content ready for publish', () => {
    expect(() => PublishRequirementsCheckerService.check(content())).not.toThrow();
  });

  it.each(['', '   '])('throws if title is blank', (title) => {
    expect(() => PublishRequirementsCheckerService.check(content({ title }))).toThrow(
      PublishValidationError,
    );
  });

  it('throws if body is null', () => {
    expect(() =>
      PublishRequirementsCheckerService.check(content({ body: null })),
    ).toThrow(PublishValidationError);
  });

  it('throws if body is empty', () => {
    expect(() =>
      PublishRequirementsCheckerService.check(
        content({ body: RichTextBody.create({}) }),
      ),
    ).toThrow(PublishValidationError);
  });

  it('throws if slug is invalid at publish time', () => {
    expect(() =>
      PublishRequirementsCheckerService.check({
        ...content(),
        slug: { value: 'invalid slug' },
      } as Content),
    ).toThrow(PublishValidationError);
  });

  it.each(['', '   '])('throws if seo description is blank', (description) => {
    expect(() =>
      PublishRequirementsCheckerService.check({
        ...content(),
        seoMetadata: { title: '', description },
      } as Content),
    ).toThrow(PublishValidationError);
  });

  it('throws if seo description is longer than 160 chars', () => {
    expect(() =>
      PublishRequirementsCheckerService.check({
        ...content(),
        seoMetadata: { title: '', description: 'a'.repeat(161) },
      } as Content),
    ).toThrow(PublishValidationError);
  });
});
