import {
  Content,
  ContentSnapshot,
  ContentUpdateFields,
} from '../../domain/entities/content.entity';
import { RichTextBody } from '../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import { ContentListItem } from '../ports/in/list-content.port';
import { GetContentResult } from '../ports/in/get-content.port';
import { UpdateContentCommand } from '../ports/in/update-content.port';

export function contentSnapshot(content: Content): ContentSnapshot {
  return {
    title: content.title,
    slug: content.slug,
    body: content.body,
    featuredImageId: content.featuredImageId,
    socialImageId: content.socialImageId,
    seoMetadata: content.seoMetadata,
    tags: content.tags,
    category: content.category,
    parentId: content.parentId,
    scheduledAt: content.scheduledAt,
  };
}

export function updateFieldsFromCommand(
  command: UpdateContentCommand,
): ContentUpdateFields {
  const fields: ContentUpdateFields = {};

  if (command.title !== undefined) fields.title = command.title;
  if (command.slug !== undefined) fields.slug = Slug.create(command.slug);
  if (command.body !== undefined) {
    fields.body = command.body === null ? null : RichTextBody.create(command.body);
  }
  if (command.seoMetadata !== undefined) {
    fields.seoMetadata = SeoMetadata.create(
      command.seoMetadata.title,
      command.seoMetadata.description,
    );
  }
  if (command.tags !== undefined) fields.tags = command.tags.map(Tag.create);
  if (command.category !== undefined) fields.category = command.category;
  if (command.parentId !== undefined) fields.parentId = command.parentId;
  if (command.featuredImageId !== undefined) {
    fields.featuredImageId = command.featuredImageId;
  }
  if (command.socialImageId !== undefined) {
    fields.socialImageId = command.socialImageId;
  }

  return fields;
}

export function toContentListItem(content: Content): ContentListItem {
  return {
    id: content.id.value,
    type: content.type,
    title: content.title,
    slug: content.slug.value,
    status: content.status,
    authorId: content.authorId,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export function toGetContentResult(content: Content): GetContentResult {
  return {
    contentId: content.id.value,
    type: content.type,
    title: content.title,
    slug: content.slug.value,
    status: content.status,
    authorId: content.authorId,
    body: content.body?.nodes ?? null,
    featuredImageId: content.featuredImageId,
    socialImageId: content.socialImageId,
    seoMetadata: {
      title: content.seoMetadata.title,
      description: content.seoMetadata.description,
    },
    tags: content.tags.map((tag) => tag.value),
    category: content.category,
    parentId: content.parentId,
    scheduledAt: content.scheduledAt,
    publishedAt: content.publishedAt,
    deletedAt: content.deletedAt,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}
