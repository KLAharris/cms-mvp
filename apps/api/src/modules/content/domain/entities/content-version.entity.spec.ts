import { describe, expect, it } from 'vitest';

import { ContentId } from '../value-objects/content-id.vo';
import { ContentVersion } from './content-version.entity';

describe('ContentVersion', () => {
  it('create() constructs with all fields accessible and correct values', () => {
    const contentId = ContentId.create('123e4567-e89b-42d3-a456-426614174000');
    const createdAt = new Date('2026-05-14T00:00:00.000Z');
    const snapshot = { title: 'Saved state' };

    const version = ContentVersion.create({
      id: 'version-1',
      contentId,
      versionNo: 2,
      snapshot,
      editorId: 'editor-1',
      createdAt,
    });

    expect(version.id).toBe('version-1');
    expect(version.contentId).toBe(contentId);
    expect(version.versionNo).toBe(2);
    expect(version.snapshot).toBe(snapshot);
    expect(version.editorId).toBe('editor-1');
    expect(version.createdAt).toBe(createdAt);
  });
});
