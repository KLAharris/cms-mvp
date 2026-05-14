import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import {
  VersionPruningJob,
  VersionPruningPrismaClient,
} from './version-pruning.job';

type VersionRow = { id: string };
type VersionCountRow = Awaited<ReturnType<VersionPruningPrismaClient['$queryRaw']>>[number];
let logSpy: MockInstance<Logger['log']>;

function versions(count: number, prefix = 'version'): VersionRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
  }));
}

function setup(
  rows: VersionCountRow[],
  versionsByContent: Record<string, VersionRow[]>,
) {
  const queryRaw = vi.fn<VersionPruningPrismaClient['$queryRaw']>();
  queryRaw.mockResolvedValue(rows);
  const findMany = vi.fn<
    VersionPruningPrismaClient['contentVersion']['findMany']
  >();
  findMany.mockImplementation((args) => {
    const contentId =
      typeof args.where?.contentId === 'string' ? args.where.contentId : '';
    return Promise.resolve(versionsByContent[contentId] ?? []);
  });
  const deleteMany = vi.fn<
    VersionPruningPrismaClient['contentVersion']['deleteMany']
  >();
  deleteMany.mockImplementation((args) => {
    const ids = args.where?.id;
    if (typeof ids === 'object' && 'in' in ids) {
      const inIds = ids.in;
      return Promise.resolve({ count: Array.isArray(inIds) ? inIds.length : 0 });
    }

    return Promise.resolve({ count: 0 });
  });
  const prisma: VersionPruningPrismaClient = {
    $queryRaw: queryRaw,
    contentVersion: { findMany, deleteMany },
  };

  return {
    job: new VersionPruningJob(prisma),
    queryRaw,
    findMany,
    deleteMany,
  };
}

describe('VersionPruningJob', () => {
  beforeEach(() => {
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes oldest versions when count > 50', async () => {
    const allVersions = versions(55);
    const { job, deleteMany } = setup(
      [{ content_id: 'content-1', version_count: 55n }],
      { 'content-1': allVersions },
    );

    await job.runOnce();

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: allVersions.slice(0, 5).map((version) => version.id) } },
    });
  });

  it('keeps exactly 50 versions after pruning', async () => {
    const allVersions = versions(75);
    const { job, deleteMany } = setup(
      [{ content_id: 'content-1', version_count: 75 }],
      { 'content-1': allVersions },
    );

    await job.runOnce();

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: allVersions.slice(0, 25).map((version) => version.id) } },
    });
  });

  it('does not delete anything when count <= 50', async () => {
    const { job, findMany, deleteMany } = setup([], {});

    await job.runOnce();

    expect(findMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('handles multiple content items in one run', async () => {
    const contentOneVersions = versions(52, 'content-1-version');
    const contentTwoVersions = versions(53, 'content-2-version');
    const { job, deleteMany } = setup(
      [
        { content_id: 'content-1', version_count: 52n },
        { content_id: 'content-2', version_count: 53n },
      ],
      {
        'content-1': contentOneVersions,
        'content-2': contentTwoVersions,
      },
    );

    await job.runOnce();

    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: { in: contentOneVersions.slice(0, 2).map((version) => version.id) },
      },
    });
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: contentTwoVersions.slice(0, 3).map((version) => version.id) },
      },
    });
  });

  it('logs summary of deleted versions and affected items', async () => {
    const { job } = setup(
      [
        { content_id: 'content-1', version_count: 51 },
        { content_id: 'content-2', version_count: 52n },
      ],
      {
        'content-1': versions(51, 'a'),
        'content-2': versions(52, 'b'),
      },
    );

    await job.runOnce();

    expect(logSpy).toHaveBeenCalledWith(
      'Version pruning: 3 versions deleted across 2 content items.',
    );
  });
});
