import { ContentStatus, ContentType, PrismaClient, Role, UserStatus } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ContentMediaRefAdapter } from '../../../src/modules/media/adapters/out/persistence';
import { MediaId } from '../../../src/modules/media/domain/value-objects';

const apiRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(apiRoot, '.env') });

const hasDatabase = process.env.TEST_DATABASE_URL !== undefined;
const MEDIA_ID = '123e4567-e89b-42d3-a456-426614174000';
const NOW = new Date('2026-06-01T00:00:00.000Z');

describe.skipIf(!hasDatabase)('ContentMediaRefAdapter', () => {
  let prisma: PrismaClient;
  let adapter: ContentMediaRefAdapter;

  beforeAll(() => {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    adapter = new ContentMediaRefAdapter(prisma);
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.contentMediaRef.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        id: 'media-ref-author',
        email: 'media-ref-author@cms.local',
        name: 'Author',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.mediaItem.create({
      data: {
        id: MEDIA_ID,
        storageKey: 'media/ref/original.jpg',
        filename: 'original.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000n,
        status: 'ready',
        uploadedBy: 'media-ref-author',
        uploadedAt: NOW,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createContent(
    id: string,
    fields: {
      featuredImageId?: string | null;
      socialImageId?: string | null;
      deletedAt?: Date | null;
    } = {},
  ): Promise<void> {
    await prisma.content.create({
      data: {
        id,
        type: ContentType.article,
        title: id,
        slug: id,
        status: ContentStatus.draft,
        authorId: 'media-ref-author',
        featuredImageId: fields.featuredImageId ?? null,
        socialImageId: fields.socialImageId ?? null,
        seoTitle: '',
        seoDescription: '',
        tags: [],
        deletedAt: fields.deletedAt ?? null,
      },
    });
  }

  it('returns 0 when no references exist', async () => {
    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(0);
  });

  it('counts ContentMediaRef embed references', async () => {
    await createContent('embed-content');
    await prisma.contentMediaRef.create({
      data: { contentId: 'embed-content', mediaItemId: MEDIA_ID },
    });

    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(1);
  });

  it('counts featuredImage references from Content', async () => {
    await createContent('featured-content', { featuredImageId: MEDIA_ID });

    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(1);
  });

  it('counts socialImage references from Content', async () => {
    await createContent('social-content', { socialImageId: MEDIA_ID });

    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(1);
  });

  it('excludes soft-deleted content', async () => {
    await createContent('deleted-content', {
      featuredImageId: MEDIA_ID,
      socialImageId: MEDIA_ID,
      deletedAt: NOW,
    });
    await prisma.contentMediaRef.create({
      data: { contentId: 'deleted-content', mediaItemId: MEDIA_ID },
    });

    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(0);
  });

  it('sums all reference types', async () => {
    await createContent('embed-sum');
    await createContent('featured-sum', { featuredImageId: MEDIA_ID });
    await createContent('social-sum', { socialImageId: MEDIA_ID });
    await prisma.contentMediaRef.create({
      data: { contentId: 'embed-sum', mediaItemId: MEDIA_ID },
    });

    await expect(adapter.countReferences(MediaId.create(MEDIA_ID))).resolves.toBe(3);
  });
});
