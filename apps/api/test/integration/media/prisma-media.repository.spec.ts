import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaMediaRepository } from '../../../src/modules/media/adapters/out/persistence';
import { MediaItem } from '../../../src/modules/media/domain/entities';
import { MediaVariant, StorageKey } from '../../../src/modules/media/domain/value-objects';

const apiRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(apiRoot, '.env') });

const hasDatabase = process.env.TEST_DATABASE_URL !== undefined;
const NOW = new Date('2026-06-01T00:00:00.000Z');

describe.skipIf(!hasDatabase)('PrismaMediaRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaMediaRepository;

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
    repository = new PrismaMediaRepository(prisma);
  }, 30000);

  beforeEach(async () => {
    await prisma.contentVersion.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.contentMediaRef.deleteMany();
    await prisma.content.deleteMany();
    await prisma.mediaItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.upsert({
      where: { id: 'media-user-1' },
      update: {
        email: 'media1@cms.local',
        name: 'Media User One',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: 'media-user-1',
        email: 'media1@cms.local',
        name: 'Media User One',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.user.upsert({
      where: { id: 'media-user-2' },
      update: {
        email: 'media2@cms.local',
        name: 'Media User Two',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: 'media-user-2',
        email: 'media2@cms.local',
        name: 'Media User Two',
        passwordHash: 'hash',
        role: Role.AUTHOR,
        status: UserStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function makeMedia(
    id: string,
    filename: string,
    uploadedBy = 'media-user-1',
    uploadedAt = NOW,
  ): MediaItem {
    return MediaItem.create({
      id,
      filename,
      mimeType: 'image/jpeg',
      sizeBytes: 1234,
      maxSizeBytes: 20971520,
      storageKey: `media/${id}/${filename}`,
      uploadedBy,
      uploadedAt,
      altText: 'Alt',
      caption: 'Caption',
    });
  }

  it('save() and findById() round-trip all persisted fields', async () => {
    const media = makeMedia('123e4567-e89b-42d3-a456-426614174000', 'alpha.jpg');

    await repository.save(media);

    const found = await repository.findById(media.id);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(media.id.value);
    expect(found?.storageKey.value).toBe(media.storageKey.value);
    expect(found?.filename).toBe('alpha.jpg');
    expect(found?.mimeType).toBe('image/jpeg');
    expect(found?.size.value).toBe(1234);
    expect(found?.status).toBe('pending');
    expect(found?.uploadedBy).toBe('media-user-1');
    expect(found?.uploadedAt).toEqual(NOW);
  });

  it('save() updates an existing item through upsert', async () => {
    const media = makeMedia('223e4567-e89b-42d3-a456-426614174000', 'ready.jpg');
    await repository.save(media);

    media.markReady(
      new Map([
        [MediaVariant.ORIGINAL, media.storageKey],
        [MediaVariant.THUMBNAIL, StorageKey.create('media/ready/thumb.jpg')],
        [MediaVariant.MEDIUM, StorageKey.create('media/ready/medium.jpg')],
      ]),
      { width: 1200, height: 800 },
    );
    await repository.save(media);

    const found = await repository.findById(media.id);
    expect(found?.status).toBe('ready');
    expect(found?.variants.get(MediaVariant.THUMBNAIL)?.value).toBe('media/ready/thumb.jpg');
    expect(found?.width).toBe(1200);
    expect(found?.height).toBe(800);
  });

  it('findAll() filters by filename search', async () => {
    await repository.save(makeMedia('323e4567-e89b-42d3-a456-426614174000', 'hero-alpha.jpg'));
    await repository.save(makeMedia('423e4567-e89b-42d3-a456-426614174000', 'hero-beta.jpg'));
    await repository.save(makeMedia('523e4567-e89b-42d3-a456-426614174000', 'other.jpg'));

    const result = await repository.findAll({ search: 'hero', page: 1, pageSize: 10 });

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.filename).sort()).toEqual([
      'hero-alpha.jpg',
      'hero-beta.jpg',
    ]);
  });

  it('findAll() filters by uploadedBy', async () => {
    await repository.save(makeMedia('623e4567-e89b-42d3-a456-426614174000', 'one.jpg'));
    await repository.save(makeMedia('723e4567-e89b-42d3-a456-426614174000', 'two.jpg', 'media-user-2'));

    const result = await repository.findAll({ uploadedBy: 'media-user-2', page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.uploadedBy).toBe('media-user-2');
  });

  it('findAll() paginates results', async () => {
    for (let index = 0; index < 5; index += 1) {
      await repository.save(
        makeMedia(
          `${String(index)}23e4567-e89b-42d3-a456-426614174000`,
          `page-${String(index)}.jpg`,
          'media-user-1',
          new Date(NOW.getTime() + index * 1000),
        ),
      );
    }

    await expect(repository.findAll({ page: 1, pageSize: 2 })).resolves.toMatchObject({ total: 5, items: expect.any(Array) });
    expect((await repository.findAll({ page: 1, pageSize: 2 })).items).toHaveLength(2);
    expect((await repository.findAll({ page: 2, pageSize: 2 })).items).toHaveLength(2);
    expect((await repository.findAll({ page: 3, pageSize: 2 })).items).toHaveLength(1);
  });

  it('delete() removes an item from the database', async () => {
    const media = makeMedia('823e4567-e89b-42d3-a456-426614174000', 'delete.jpg');
    await repository.save(media);

    await repository.delete(media.id);

    await expect(repository.findById(media.id)).resolves.toBeNull();
  });
});
