import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import type {
  PaginatedResult,
  PublicArticleDetail,
  PublicArticleSummary,
  PublicPageDetail,
  PublicPageSummary,
} from '../../../application/public-content.read-model';
import type {
  PublicContentRepository,
  PublicListQuery,
} from '../../../application/ports/out/public-content-repository.port';

@Injectable()
export class PrismaPublicContentRepository implements PublicContentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listPublishedArticles({
    page,
    pageSize,
  }: PublicListQuery): Promise<PaginatedResult<PublicArticleSummary>> {
    const where = {
      status: 'published' as const,
      publishedAt: { lte: new Date() },
      deletedAt: null,
      type: 'article' as const,
    };
    const [rows, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { select: { id: true, name: true } },
          featuredImage: { select: { storageKey: true } },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toArticleSummary(row)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
    const row = await this.prisma.content.findFirst({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        deletedAt: null,
        type: 'article',
        slug,
      },
      include: {
        author: { select: { id: true, name: true } },
        featuredImage: { select: { storageKey: true } },
        socialImage: { select: { storageKey: true } },
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...this.toArticleSummary(row),
      body: row.body,
      seo: {
        seoTitle: row.seoTitle || null,
        seoDescription: row.seoDescription || null,
        socialImageUrl: this.resolveUrl(row.socialImage?.storageKey),
      },
    };
  }

  async listPublishedPages({
    page,
    pageSize,
  }: PublicListQuery): Promise<PaginatedResult<PublicPageSummary>> {
    const where = {
      status: 'published' as const,
      publishedAt: { lte: new Date() },
      deletedAt: null,
      type: 'page' as const,
    };
    const [rows, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        publishedAt: row.publishedAt ?? row.createdAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPublishedPageBySlug(slug: string): Promise<PublicPageDetail | null> {
    const row = await this.prisma.content.findFirst({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        deletedAt: null,
        type: 'page',
        slug,
      },
      include: {
        socialImage: { select: { storageKey: true } },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      publishedAt: row.publishedAt ?? row.createdAt,
      body: row.body,
      seo: {
        seoTitle: row.seoTitle || null,
        seoDescription: row.seoDescription || null,
        socialImageUrl: this.resolveUrl(row.socialImage?.storageKey),
      },
    };
  }

  private toArticleSummary(row: {
    id: string;
    title: string;
    slug: string;
    body: unknown;
    publishedAt: Date | null;
    createdAt: Date;
    author: { id: string; name: string };
    tags: string[];
    category: string | null;
    featuredImage?: { storageKey: string } | null;
  }): PublicArticleSummary {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: this.extractExcerpt(row.body),
      publishedAt: row.publishedAt ?? row.createdAt,
      author: {
        id: row.author.id,
        name: row.author.name,
      },
      tags: row.tags,
      category: row.category,
      featuredImageUrl: this.resolveUrl(row.featuredImage?.storageKey),
    };
  }

  private extractExcerpt(body: unknown): string | null {
    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const n = node as Record<string, unknown>;
      if (n['type'] === 'text' && typeof n['text'] === 'string') {
        texts.push(n['text']);
      }

      if (Array.isArray(n['content'])) {
        n['content'].forEach(walk);
      }
    };
    walk(body);

    const result = texts.join(' ').trim().slice(0, 160);
    return result.length > 0 ? result : null;
  }

  private resolveUrl(storageKey?: string | null, bucket?: string | null): string | null {
    const resolvedBucket = bucket ?? this.config.get<string>('OBJECT_STORAGE_BUCKET', '');

    if (!storageKey || !resolvedBucket) {
      return null;
    }

    const endpoint = this.config.get<string>('OBJECT_STORAGE_ENDPOINT', '');
    return `${endpoint}/${resolvedBucket}/${storageKey}`;
  }
}
