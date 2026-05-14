import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import {
  SoftDeleteCleanupJob,
  SoftDeleteCleanupPrismaClient,
} from './soft-delete-cleanup.job';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const CUTOFF = new Date('2026-05-02T12:00:00.000Z');
let logSpy: MockInstance<Logger['log']>;

function setup(deletedCount: number) {
  const deleteVersions = vi.fn<
    SoftDeleteCleanupPrismaClient['contentVersion']['deleteMany']
  >();
  deleteVersions.mockResolvedValue({ count: 3 });
  const deleteContent = vi.fn<SoftDeleteCleanupPrismaClient['content']['deleteMany']>();
  deleteContent.mockResolvedValue({ count: deletedCount });
  const prisma: SoftDeleteCleanupPrismaClient = {
    contentVersion: { deleteMany: deleteVersions },
    content: { deleteMany: deleteContent },
  };

  return {
    job: new SoftDeleteCleanupJob(prisma),
    deleteVersions,
    deleteContent,
  };
}

describe('SoftDeleteCleanupJob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hard-deletes content where deletedAt <= 30 days ago', async () => {
    const { job, deleteVersions, deleteContent } = setup(2);

    await job.runOnce();

    expect(deleteVersions).toHaveBeenCalledWith({
      where: { content: { deletedAt: { lte: CUTOFF } } },
    });
    expect(deleteContent).toHaveBeenCalledWith({
      where: { deletedAt: { lte: CUTOFF } },
    });
  });

  it('does not delete content where deletedAt > 30 days ago', async () => {
    const { job, deleteContent } = setup(0);

    await job.runOnce();

    expect(deleteContent).toHaveBeenCalledWith({
      where: { deletedAt: { lte: CUTOFF } },
    });
  });

  it('does not delete content where deletedAt is null', async () => {
    const { job, deleteContent } = setup(0);

    await job.runOnce();

    expect(deleteContent).toHaveBeenCalledWith({
      where: { deletedAt: { lte: CUTOFF } },
    });
  });

  it('logs the number of deleted items', async () => {
    const { job } = setup(4);

    await job.runOnce();

    expect(logSpy).toHaveBeenCalledWith(
      'Soft-delete cleanup: 4 content items hard-deleted.',
    );
  });

  it('does not throw when no items match', async () => {
    const { job } = setup(0);

    await expect(job.runOnce()).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      'Soft-delete cleanup: 0 content items hard-deleted.',
    );
  });
});
