import { Prisma, Content as PrismaContent, ContentVersion as PrismaContentVersion } from '@prisma/client';

import {
  Content,
  ContentSnapshot,
} from '../../../domain/entities/content.entity';
import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';

type JsonRecord = Record<string, Prisma.JsonValue>;

function isJsonRecord(value: Prisma.JsonValue): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: JsonRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function nullableStringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function nullableDateField(record: JsonRecord, key: string): Date | null {
  const value = record[key];
  return typeof value === 'string' ? new Date(value) : null;
}

function richTextFromJson(value: Prisma.JsonValue | undefined): RichTextBody | null {
  return value !== undefined && isJsonRecord(value) ? RichTextBody.create(value) : null;
}

function tagsFromJson(value: Prisma.JsonValue | undefined): Tag[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string').map((t) => Tag.create(t))
    : [];
}

function seoFromJson(value: Prisma.JsonValue | undefined): SeoMetadata {
  const record = value ?? null;
  if (!isJsonRecord(record)) {
    return SeoMetadata.create('', '');
  }

  return SeoMetadata.create(
    stringField(record, 'title'),
    stringField(record, 'description'),
  );
}

function jsonField(record: JsonRecord, key: string): Prisma.JsonValue | null {
  return record[key] ?? null;
}

function snapshotToDomain(snapshot: Prisma.JsonValue): ContentSnapshot {
  if (!isJsonRecord(snapshot)) {
    throw new Error('Invalid content version snapshot');
  }

  return {
    title: stringField(snapshot, 'title'),
    slug: Slug.create(
      isJsonRecord(jsonField(snapshot, 'slug'))
        ? stringField(jsonField(snapshot, 'slug') as JsonRecord, 'value')
        : stringField(snapshot, 'slug'),
    ),
    body: richTextFromJson(
      isJsonRecord(jsonField(snapshot, 'body')) &&
        isJsonRecord(jsonField(jsonField(snapshot, 'body') as JsonRecord, 'nodes'))
        ? jsonField(jsonField(snapshot, 'body') as JsonRecord, 'nodes')
        : jsonField(snapshot, 'body'),
    ),
    featuredImageId: nullableStringField(snapshot, 'featuredImageId'),
    socialImageId: nullableStringField(snapshot, 'socialImageId'),
    seoMetadata: seoFromJson(jsonField(snapshot, 'seoMetadata')),
    tags: tagsFromJson(jsonField(snapshot, 'tags')),
    category: nullableStringField(snapshot, 'category'),
    parentId: nullableStringField(snapshot, 'parentId'),
    scheduledAt: nullableDateField(snapshot, 'scheduledAt'),
  };
}

function snapshotToPersistence(snapshot: object): Prisma.InputJsonObject {
  const contentSnapshot = snapshot as ContentSnapshot;

  return {
    title: contentSnapshot.title,
    slug: contentSnapshot.slug.value,
    body: contentSnapshot.body?.nodes as Prisma.InputJsonObject | null,
    featuredImageId: contentSnapshot.featuredImageId,
    socialImageId: contentSnapshot.socialImageId,
    seoMetadata: {
      title: contentSnapshot.seoMetadata.title,
      description: contentSnapshot.seoMetadata.description,
    },
    tags: contentSnapshot.tags.map((tag) => tag.value),
    category: contentSnapshot.category,
    parentId: contentSnapshot.parentId,
    scheduledAt: contentSnapshot.scheduledAt?.toISOString() ?? null,
  };
}

export const ContentPersistenceMapper = {
  toDomain(row: PrismaContent): Content {
    return Content.reconstitute({
      id: ContentId.create(row.id),
      type: row.type as ContentType,
      title: row.title,
      slug: Slug.create(row.slug),
      body: row.body !== null && isJsonRecord(row.body) ? RichTextBody.create(row.body) : null,
      status: row.status as ContentStatus,
      authorId: row.authorId,
      featuredImageId: row.featuredImageId,
      socialImageId: row.socialImageId,
      seoMetadata: SeoMetadata.create(row.seoTitle, row.seoDescription),
      tags: row.tags.map((t) => Tag.create(t)),
      category: row.category,
      parentId: row.parentId,
      scheduledAt: row.scheduledAt,
      publishedAt: row.publishedAt,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(content: Content): Prisma.ContentUncheckedCreateInput {
    return {
      id: content.id.value,
      type: content.type,
      title: content.title,
      slug: content.slug.value,
      body:
        content.body === null
          ? Prisma.JsonNull
          : (content.body.nodes as Prisma.InputJsonObject),
      status: content.status,
      authorId: content.authorId,
      featuredImageId: content.featuredImageId,
      socialImageId: content.socialImageId,
      seoTitle: content.seoMetadata.title,
      seoDescription: content.seoMetadata.description,
      tags: content.tags.map((tag) => tag.value),
      category: content.category,
      parentId: content.parentId,
      scheduledAt: content.scheduledAt,
      publishedAt: content.publishedAt,
      deletedAt: content.deletedAt,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  },
};

export const ContentVersionPersistenceMapper = {
  toDomain(row: PrismaContentVersion): ContentVersion {
    return ContentVersion.create({
      id: row.id,
      contentId: ContentId.create(row.contentId),
      versionNo: row.versionNo,
      snapshot: snapshotToDomain(row.snapshot),
      editorId: row.editorId,
      createdAt: row.createdAt,
    });
  },

  toPersistence(
    version: ContentVersion,
  ): Prisma.ContentVersionUncheckedCreateInput {
    return {
      id: version.id,
      contentId: version.contentId.value,
      versionNo: version.versionNo,
      snapshot: snapshotToPersistence(version.snapshot),
      editorId: version.editorId,
      createdAt: version.createdAt,
    };
  },
};
