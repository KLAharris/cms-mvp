import type { Server } from 'http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../../shared/ports/event-publisher.port';
import { ID_GENERATOR } from '../../../../../shared/ports/id-generator.port';
import { TRANSACTION_RUNNER } from '../../../../../shared/ports/transaction-runner.port';
import { Content } from '../../../domain/entities/content.entity';
import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { RichTextBody } from '../../../domain/value-objects/rich-text-body.vo';
import { SeoMetadata } from '../../../domain/value-objects/seo-metadata.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';
import { ContentRepository, ContentSearchCriteria, PagedResult } from '../../../application/ports/out/content-repository.port';
import { ContentVersionRepository } from '../../../application/ports/out/content-version-repository.port';
import { CreateContentUseCase } from '../../../application/use-cases/create-content.use-case';
import { DeleteContentUseCase } from '../../../application/use-cases/delete-content.use-case';
import { GetContentUseCase } from '../../../application/use-cases/get-content.use-case';
import { ListContentUseCase } from '../../../application/use-cases/list-content.use-case';
import { ListVersionsUseCase } from '../../../application/use-cases/list-versions.use-case';
import { PublishContentUseCase } from '../../../application/use-cases/publish-content.use-case';
import { RevertContentUseCase } from '../../../application/use-cases/revert-content.use-case';
import { ScheduleContentUseCase } from '../../../application/use-cases/schedule-content.use-case';
import { SubmitForReviewUseCase } from '../../../application/use-cases/submit-for-review.use-case';
import { UnpublishContentUseCase } from '../../../application/use-cases/unpublish-content.use-case';
import { UpdateContentUseCase } from '../../../application/use-cases/update-content.use-case';
import { CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY } from '../../../content.module';
import { ContentController } from './content.controller';
import { ContentDomainExceptionFilter } from './content-domain-exception.filter';

const JWT_SECRET = 'content-controller-secret';
const NOW = new Date('2026-06-01T00:00:00.000Z');
const FUTURE = new Date('2026-07-01T00:00:00.000Z');
const IDS = [
  '123e4567-e89b-42d3-a456-426614174000',
  '223e4567-e89b-42d3-a456-426614174000',
  '323e4567-e89b-42d3-a456-426614174000',
  '423e4567-e89b-42d3-a456-426614174000',
  '523e4567-e89b-42d3-a456-426614174000',
  '623e4567-e89b-42d3-a456-426614174000',
] as const;

class InMemoryContentRepository implements ContentRepository {
  readonly rows = new Map<string, Content>();

  save(content: Content): Promise<void> {
    this.rows.set(content.id.value, content);
    return Promise.resolve();
  }

  findById(id: ContentId): Promise<Content | null> {
    return Promise.resolve(this.rows.get(id.value) ?? null);
  }

  findBySlug(type: ContentType, slug: Slug): Promise<Content | null> {
    return Promise.resolve(
      [...this.rows.values()].find(
        (content) => content.type === type && content.slug.equals(slug),
      ) ?? null,
    );
  }

  findMany(criteria: ContentSearchCriteria): Promise<PagedResult<Content>> {
    const filtered = [...this.rows.values()]
      .filter((content) => content.deletedAt === null)
      .filter((content) => criteria.status === undefined || content.status === criteria.status)
      .filter((content) => criteria.type === undefined || content.type === criteria.type)
      .filter((content) => criteria.authorId === undefined || content.authorId === criteria.authorId)
      .filter((content) => criteria.tag === undefined || content.tags.some((tag) => tag.value === criteria.tag))
      .filter((content) => criteria.titleSearch === undefined || content.title.toLowerCase().includes(criteria.titleSearch.toLowerCase()));
    const start = (criteria.page - 1) * criteria.pageSize;

    return Promise.resolve({
      items: filtered.slice(start, start + criteria.pageSize),
      total: filtered.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
      totalPages: Math.ceil(filtered.length / criteria.pageSize),
    });
  }

  delete(id: ContentId): Promise<void> {
    this.rows.delete(id.value);
    return Promise.resolve();
  }
}

class InMemoryContentVersionRepository implements ContentVersionRepository {
  readonly rows: ContentVersion[] = [];

  save(version: ContentVersion): Promise<void> {
    const index = this.rows.findIndex(
      (row) =>
        row.contentId.equals(version.contentId) &&
        row.versionNo === version.versionNo,
    );
    if (index >= 0) {
      this.rows[index] = version;
      return Promise.resolve();
    }
    this.rows.push(version);
    return Promise.resolve();
  }

  findByContentId(contentId: ContentId): Promise<ContentVersion[]> {
    return Promise.resolve(this.rows.filter((row) => row.contentId.equals(contentId)));
  }

  findByVersionNo(
    contentId: ContentId,
    versionNo: number,
  ): Promise<ContentVersion | null> {
    return Promise.resolve(
      this.rows.find(
        (row) => row.contentId.equals(contentId) && row.versionNo === versionNo,
      ) ?? null,
    );
  }

  nextVersionNo(contentId: ContentId): Promise<number> {
    return Promise.resolve(this.rows.filter((row) => row.contentId.equals(contentId)).length + 1);
  }
}

describe('ContentController', () => {
  let app: INestApplication;
  let contents: InMemoryContentRepository;
  let versions: InMemoryContentVersionRepository;
  let nextId = 0;

  function server(): Server {
    return app.getHttpServer() as Server;
  }

  beforeEach(async () => {
    contents = new InMemoryContentRepository();
    versions = new InMemoryContentVersionRepository();
    nextId = 0;

    const module = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        JwtAuthGuard,
        { provide: 'JWT_SECRET', useValue: JWT_SECRET },
        { provide: CONTENT_REPOSITORY, useValue: contents },
        { provide: CONTENT_VERSION_REPOSITORY, useValue: versions },
        { provide: 'CLOCK', useValue: { now: () => NOW } },
        { provide: ID_GENERATOR, useValue: { generate: () => IDS[nextId++] ?? IDS[0] } },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publishAll: () => Promise.resolve() } },
        { provide: TRANSACTION_RUNNER, useValue: { run: async <T>(fn: () => Promise<T>) => fn() } },
        {
          provide: 'CREATE_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, v: ContentVersionRepository, i: { generate(): string }, clock: { now(): Date }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new CreateContentUseCase(c, v, i, clock, tx),
        },
        {
          provide: 'UPDATE_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, v: ContentVersionRepository, i: { generate(): string }, clock: { now(): Date }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new UpdateContentUseCase(c, v, i, clock, tx),
        },
        {
          provide: 'SUBMIT_FOR_REVIEW_USE_CASE',
          inject: [CONTENT_REPOSITORY, 'CLOCK', TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, clock: { now(): Date }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new SubmitForReviewUseCase(c, clock, tx),
        },
        {
          provide: 'PUBLISH_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, clock: { now(): Date }, e: { publishAll(events: []): Promise<void> }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new PublishContentUseCase(c, clock, e, tx),
        },
        {
          provide: 'UNPUBLISH_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, clock: { now(): Date }, e: { publishAll(events: []): Promise<void> }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new UnpublishContentUseCase(c, clock, e, tx),
        },
        {
          provide: 'SCHEDULE_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, 'CLOCK', TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, clock: { now(): Date }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new ScheduleContentUseCase(c, clock, tx),
        },
        {
          provide: 'DELETE_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, 'CLOCK', DOMAIN_EVENT_PUBLISHER, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, clock: { now(): Date }, e: { publishAll(events: []): Promise<void> }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new DeleteContentUseCase(c, clock, e, tx),
        },
        {
          provide: 'LIST_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new ListContentUseCase(c, tx),
        },
        {
          provide: 'GET_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new GetContentUseCase(c, tx),
        },
        {
          provide: 'REVERT_CONTENT_USE_CASE',
          inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, ID_GENERATOR, 'CLOCK', TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, v: ContentVersionRepository, i: { generate(): string }, clock: { now(): Date }, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new RevertContentUseCase(c, v, i, clock, tx),
        },
        {
          provide: 'LIST_VERSIONS_USE_CASE',
          inject: [CONTENT_REPOSITORY, CONTENT_VERSION_REPOSITORY, TRANSACTION_RUNNER],
          useFactory: (c: ContentRepository, v: ContentVersionRepository, tx: { run<T>(fn: () => Promise<T>): Promise<T> }) => new ListVersionsUseCase(c, v, tx),
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ContentDomainExceptionFilter());
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAs(userId: string, role: string): Promise<string> {
    return new SignJWT({ role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(JWT_SECRET));
  }

  function seedContent(
    id: string,
    authorId: string,
    status = ContentStatus.Draft,
    title = 'Title',
  ): Content {
    const content = Content.reconstitute({
      id: ContentId.create(id),
      type: ContentType.Article,
      title,
      slug: Slug.fromTitle(title),
      body: RichTextBody.create({ type: 'doc' }),
      status,
      authorId,
      featuredImageId: null,
      socialImageId: null,
      seoMetadata: SeoMetadata.create('SEO', 'Description'),
      tags: [Tag.create('tech')],
      category: null,
      parentId: null,
      scheduledAt: null,
      publishedAt: status === ContentStatus.Published ? NOW : null,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    contents.rows.set(id, content);
    versions.rows.push(
      ContentVersion.create({
        id: `version-${id}`,
        contentId: content.id,
        versionNo: 1,
        snapshot: {
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
        },
        editorId: authorId,
        createdAt: NOW,
      }),
    );
    return content;
  }

  it('POST /api/admin/content creates content for author/editor/admin and validates auth/body', async () => {
    for (const role of ['author', 'editor', 'admin']) {
      const token = await loginAs(`${role}-1`, role);
      await request(server())
        .post('/api/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'article', title: `My ${role} Article` })
        .expect(201)
        .expect((response) => {
          expect((response.body as { data: Record<string, unknown> }).data).toMatchObject({
            type: 'article',
            title: `My ${role} Article`,
            slug: `my-${role}-article`,
            status: 'draft',
          });
        });
    }

    const token = await loginAs('author-1', 'author');
    await request(server()).post('/api/admin/content').send({}).expect(401);
    await request(server())
      .post('/api/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Missing type' })
      .expect(400);
    await request(server())
      .post('/api/admin/content')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'article', title: '' })
      .expect(400);
  });

  it('GET /api/admin/content returns list envelope, filters, and author scoping', async () => {
    seedContent(IDS[0], 'author-1', ContentStatus.Draft, 'Own Draft');
    seedContent(IDS[1], 'author-2', ContentStatus.Draft, 'Other Draft');
    seedContent(IDS[2], 'author-2', ContentStatus.Published, 'Other Published');

    const authorToken = await loginAs('author-1', 'author');
    await request(server())
      .get('/api/admin/content')
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(200)
      .expect((response) => {
        const b = response.body as { data: unknown[]; pagination: Record<string, number> };
        expect(b.data).toHaveLength(1);
        expect(b.pagination).toMatchObject({ page: 1, page_size: 25, total: 1 });
      });

    const editorToken = await loginAs('editor-1', 'editor');
    await request(server())
      .get('/api/admin/content?status=published&type=article')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(200)
      .expect((response) => {
        const items = (response.body as { data: Array<{ status: string }> }).data;
        expect(items).toHaveLength(1);
        expect(items[0]?.status).toBe('published');
      });

    await request(server())
      .get('/api/admin/content?page=not-a-number')
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(400);
    await request(server()).get('/api/admin/content').expect(401);
  });

  it('GET /api/admin/content/:id enforces visibility and not found', async () => {
    seedContent(IDS[0], 'author-1', ContentStatus.Draft, 'Own Draft');
    const editorToken = await loginAs('editor-1', 'editor');
    const authorToken = await loginAs('author-1', 'author');
    const otherAuthorToken = await loginAs('author-2', 'author');

    await request(server()).get(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${editorToken}`).expect(200);
    await request(server()).get(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${authorToken}`).expect(200);
    await request(server()).get(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${otherAuthorToken}`).expect(403);
    await request(server()).get(`/api/admin/content/${IDS[5]}`).set('Authorization', `Bearer ${editorToken}`).expect(404);
    await request(server()).get(`/api/admin/content/${IDS[0]}`).expect(401);
  });

  it('PATCH /api/admin/content/:id updates and maps conflicts', async () => {
    seedContent(IDS[0], 'author-1', ContentStatus.Draft, 'First');
    seedContent(IDS[1], 'author-2', ContentStatus.Draft, 'Second');
    const authorToken = await loginAs('author-1', 'author');
    const otherAuthorToken = await loginAs('author-2', 'author');

    await request(server()).patch(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${authorToken}`).send({ title: 'Updated', seoTitle: 'New SEO' }).expect(200).expect((response) => {
      const d = (response.body as { data: Record<string, unknown> }).data;
      expect(d.title).toBe('Updated');
      expect(d.seoTitle).toBe('New SEO');
    });
    await request(server()).patch(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${authorToken}`).send({ seoDescription: 'New description' }).expect(200).expect((response) => {
      expect((response.body as { data: Record<string, unknown> }).data.seoDescription).toBe('New description');
    });
    await request(server()).patch(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${otherAuthorToken}`).send({ title: 'Denied' }).expect(403);
    await request(server()).patch(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${authorToken}`).send({ slug: 'second' }).expect(409);
    await request(server()).patch(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${authorToken}`).send({ slug: 'not valid' }).expect(400);
    await request(server()).patch(`/api/admin/content/${IDS[5]}`).set('Authorization', `Bearer ${authorToken}`).send({ title: 'Missing' }).expect(404);
    await request(server()).patch(`/api/admin/content/${IDS[0]}`).send({ title: 'No token' }).expect(401);
  });

  it('state change endpoints submit, publish, unpublish, schedule, and delete', async () => {
    seedContent(IDS[0], 'author-1', ContentStatus.Draft, 'Draft');
    seedContent(IDS[1], 'author-1', ContentStatus.InReview, 'Review');
    seedContent(IDS[2], 'author-1', ContentStatus.Published, 'Published');
    const authorToken = await loginAs('author-1', 'author');
    const editorToken = await loginAs('editor-1', 'editor');
    const adminToken = await loginAs('admin-1', 'admin');

    await request(server()).post(`/api/admin/content/${IDS[0]}/submit`).set('Authorization', `Bearer ${authorToken}`).expect(200);
    await request(server()).post(`/api/admin/content/${IDS[0]}/submit`).set('Authorization', `Bearer ${authorToken}`).expect(409);
    await request(server()).post(`/api/admin/content/${IDS[1]}/publish`).set('Authorization', `Bearer ${editorToken}`).expect(200);
    await request(server()).post(`/api/admin/content/${IDS[2]}/publish`).set('Authorization', `Bearer ${adminToken}`).expect(409);
    await request(server()).post(`/api/admin/content/${IDS[2]}/unpublish`).set('Authorization', `Bearer ${editorToken}`).expect(200);
    await request(server()).post(`/api/admin/content/${IDS[1]}/publish`).set('Authorization', `Bearer ${authorToken}`).expect(403);

    const invalid = seedContent(IDS[3], 'author-1', ContentStatus.Draft, 'Invalid');
    invalid.body = null;
    await request(server()).post(`/api/admin/content/${IDS[3]}/publish`).set('Authorization', `Bearer ${editorToken}`).expect(422);

    await request(server()).post(`/api/admin/content/${IDS[0]}/schedule`).set('Authorization', `Bearer ${editorToken}`).send({ scheduledAt: FUTURE.toISOString() }).expect(200);
    await request(server()).post(`/api/admin/content/${IDS[0]}/schedule`).set('Authorization', `Bearer ${authorToken}`).send({ scheduledAt: FUTURE.toISOString() }).expect(403);
    await request(server()).post(`/api/admin/content/${IDS[0]}/schedule`).set('Authorization', `Bearer ${editorToken}`).send({ scheduledAt: NOW.toISOString() }).expect(422);
    await request(server()).post(`/api/admin/content/${IDS[0]}/schedule`).set('Authorization', `Bearer ${editorToken}`).send({}).expect(400);

    await request(server()).delete(`/api/admin/content/${IDS[0]}`).set('Authorization', `Bearer ${editorToken}`).expect(204);
    await request(server()).delete(`/api/admin/content/${IDS[1]}`).set('Authorization', `Bearer ${authorToken}`).expect(403);
    await request(server()).delete(`/api/admin/content/${IDS[5]}`).set('Authorization', `Bearer ${editorToken}`).expect(404);
    await request(server()).post(`/api/admin/content/${IDS[0]}/submit`).expect(401);
  });

  it('versions and revert endpoints enforce permissions and missing resources', async () => {
    seedContent(IDS[0], 'author-1', ContentStatus.Draft, 'Versioned');
    versions.rows.push(
      ContentVersion.create({
        id: 'version-2',
        contentId: ContentId.create(IDS[0]),
        versionNo: 2,
        snapshot: {
          title: 'Prior',
          slug: Slug.create('prior'),
          body: RichTextBody.create({ type: 'doc' }),
          featuredImageId: null,
          socialImageId: null,
          seoMetadata: SeoMetadata.create('SEO', 'Description'),
          tags: [],
          category: null,
          parentId: null,
          scheduledAt: null,
        },
        editorId: 'author-1',
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
      }),
    );
    const authorToken = await loginAs('author-1', 'author');
    const otherAuthorToken = await loginAs('author-2', 'author');
    const editorToken = await loginAs('editor-1', 'editor');

    await request(server()).get(`/api/admin/content/${IDS[0]}/versions`).set('Authorization', `Bearer ${authorToken}`).expect(200).expect((response) => {
      expect((response.body as { data: Array<{ versionNo: number }> }).data[0]?.versionNo).toBe(2);
    });
    await request(server()).get(`/api/admin/content/${IDS[0]}/versions`).set('Authorization', `Bearer ${otherAuthorToken}`).expect(403);
    await request(server()).get(`/api/admin/content/${IDS[5]}/versions`).set('Authorization', `Bearer ${editorToken}`).expect(404);
    await request(server()).get(`/api/admin/content/${IDS[0]}/versions`).expect(401);

    await request(server()).post(`/api/admin/content/${IDS[0]}/revert/2`).set('Authorization', `Bearer ${authorToken}`).expect(200).expect((response) => {
      expect((response.body as { data: Record<string, unknown> }).data.newVersionNo).toBe(3);
    });
    await request(server()).post(`/api/admin/content/${IDS[5]}/revert/1`).set('Authorization', `Bearer ${editorToken}`).expect(404);
    await request(server()).post(`/api/admin/content/${IDS[0]}/revert/99`).set('Authorization', `Bearer ${editorToken}`).expect(404);
    await request(server()).post(`/api/admin/content/${IDS[0]}/revert/1`).set('Authorization', `Bearer ${otherAuthorToken}`).expect(403);
    await request(server()).post(`/api/admin/content/${IDS[0]}/revert/1`).expect(401);
  });
});
