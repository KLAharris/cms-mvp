import { describe, expect, it } from 'vitest';

import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentVersionRepository } from './content-version-repository.port';

describe('ContentVersionRepository port', () => {
  it('defines content version repository contract', async () => {
    const contentId = ContentId.create('123e4567-e89b-42d3-a456-426614174000');
    const version = ContentVersion.create({
      id: 'version-1',
      contentId,
      versionNo: 1,
      snapshot: { title: 'Title' },
      editorId: 'editor-1',
      createdAt: new Date('2026-05-14T00:00:00.000Z'),
    });
    const repository: ContentVersionRepository = {
      save: async (_version) => undefined,
      findByContentId: async (_contentId) => [version],
      findByVersionNo: async (_contentId, _versionNo) => version,
      nextVersionNo: async (_contentId) => 2,
    };

    await expect(repository.save(version)).resolves.toBeUndefined();
    await expect(repository.findByContentId(contentId)).resolves.toEqual([
      version,
    ]);
    await expect(repository.findByVersionNo(contentId, 1)).resolves.toBe(version);
    await expect(repository.nextVersionNo(contentId)).resolves.toBe(2);
  });
});
