import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ContentStatus as PrismaContentStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { EnvConfig } from '../../../../../config/env.validation';
import { PublishContentUseCase } from '../../../application/ports/in/publish-content.port';
import { PublishValidationError } from '../../../domain/errors/publish-validation.error';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import {
  ScheduledPublishJob,
  ScheduledPublishPrismaClient,
} from './scheduled-publish.job';

const NOW = new Date('2026-06-01T12:00:00.000Z');
let logSpy: MockInstance<Logger['log']>;
let warnSpy: MockInstance<Logger['warn']>;
let errorSpy: MockInstance<Logger['error']>;

function makeConfig(): ConfigService<EnvConfig, true> {
  return new ConfigService<EnvConfig, true>({
    EMAIL_PROVIDER: 'console',
    EMAIL_FROM: 'no-reply@cms.example.com',
    EMAIL_FROM_NAME: 'CMS',
    PUBLIC_URL: 'http://localhost:5173',
    WORKER_SCHEDULED_PUBLISH_INTERVAL_SEC: 30,
  });
}

function publishResult(contentId: string) {
  return {
    contentId,
    status: ContentStatus.Published,
    publishedAt: NOW,
  };
}

function setup(rows: Array<{ id: string }>) {
  const findMany = vi.fn<ScheduledPublishPrismaClient['content']['findMany']>();
  findMany.mockResolvedValue(rows);
  const prisma: ScheduledPublishPrismaClient = {
    content: { findMany },
  };

  const execute = vi.fn<PublishContentUseCase['execute']>();
  execute.mockImplementation((command) => Promise.resolve(publishResult(command.contentId)));
  const publishContent: PublishContentUseCase = { execute };

  return {
    job: new ScheduledPublishJob(prisma, publishContent, makeConfig()),
    findMany,
    execute,
  };
}

describe('ScheduledPublishJob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('publishes all due items', async () => {
    const { job, execute } = setup([{ id: 'content-1' }, { id: 'content-2' }]);

    await job.runOnce();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(1, {
      contentId: 'content-1',
      actorId: 'system',
      actorRole: 'admin',
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      contentId: 'content-2',
      actorId: 'system',
      actorRole: 'admin',
    });
  });

  it('skips items where status is published, unpublished, or archived', async () => {
    const { job, findMany, execute } = setup([]);

    await job.runOnce();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        scheduledAt: { lte: NOW },
        status: { in: [PrismaContentStatus.draft, PrismaContentStatus.in_review] },
        deletedAt: null,
      },
      select: { id: true },
      orderBy: { scheduledAt: 'asc' },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips items where deletedAt is set', async () => {
    const { job, findMany } = setup([]);

    await job.runOnce();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  it('catches PublishValidationError per item and continues', async () => {
    const { job, execute } = setup([{ id: 'invalid' }, { id: 'valid' }]);
    execute.mockImplementation((command) => {
      if (command.contentId === 'invalid') {
        return Promise.reject(new PublishValidationError('Missing SEO description'));
      }

      return Promise.resolve(publishResult(command.contentId));
    });

    await expect(job.runOnce()).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      'Scheduled publish skipped content invalid: Missing SEO description',
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Scheduled publish: 1 published, 1 skipped, 0 errors',
    );
  });

  it('catches unexpected errors per item and continues', async () => {
    const { job, execute } = setup([{ id: 'broken' }, { id: 'valid' }]);
    execute.mockImplementation((command) => {
      if (command.contentId === 'broken') {
        return Promise.reject(new Error('Database write failed'));
      }

      return Promise.resolve(publishResult(command.contentId));
    });

    await expect(job.runOnce()).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      'Scheduled publish failed for content broken: Database write failed',
      expect.any(String) as string,
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Scheduled publish: 1 published, 0 skipped, 1 errors',
    );
  });

  it('logs a summary after each run', async () => {
    const { job } = setup([{ id: 'content-1' }]);

    await job.runOnce();

    expect(logSpy).toHaveBeenCalledWith(
      'Scheduled publish: 1 published, 0 skipped, 0 errors',
    );
  });

  it('does not call publishContent when no items are due', async () => {
    const { job, execute } = setup([]);

    await job.runOnce();

    expect(execute).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      'Scheduled publish: 0 published, 0 skipped, 0 errors',
    );
  });
});
