import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/unbound-method */

import { DomainEventPublisher } from '../../../../../src/shared/ports/event-publisher.port';
import { FakeAuditRepository } from '../../../../../src/modules/audit/tests/doubles/fake-audit.repository';
import {
  MediaForbiddenError,
  MediaItem,
  MediaReferencedError,
  MediaVariant,
  StorageKey,
} from '../../../../../src/modules/media/domain';
import { DeleteMediaUseCase } from '../../../../../src/modules/media/application/use-cases';
import {
  MediaReferenceChecker,
  MediaRepository,
  ObjectStorage,
} from '../../../../../src/modules/media/application/ports/out';

const mediaId = '11111111-1111-4111-8111-111111111111';

function mediaItem(): MediaItem {
  const media = MediaItem.create({
    id: mediaId,
    filename: 'doc.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    maxSizeBytes: 1000,
    storageKey: 'media/original.pdf',
    uploadedBy: 'author-1',
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  media.markReady(new Map([[MediaVariant.ORIGINAL, StorageKey.create('media/original.pdf')]]));
  return media;
}

function dependencies(referenceCount: number) {
  const media = mediaItem();
  const repo: MediaRepository = {
    save: vi.fn<MediaRepository['save']>(),
    findById: vi.fn<MediaRepository['findById']>().mockResolvedValue(media),
    findAll: vi.fn<MediaRepository['findAll']>(),
    delete: vi.fn<MediaRepository['delete']>(),
  };
  const refs: MediaReferenceChecker = {
    countReferences: vi.fn<MediaReferenceChecker['countReferences']>().mockResolvedValue(referenceCount),
  };
  const storage: ObjectStorage = {
    presignUpload: vi.fn<ObjectStorage['presignUpload']>(),
    getSignedUrl: vi.fn<ObjectStorage['getSignedUrl']>(),
    getObjectBytes: vi.fn<ObjectStorage['getObjectBytes']>(),
    deleteObject: vi.fn<ObjectStorage['deleteObject']>(),
  };
  const events: DomainEventPublisher = {
    publishAll: vi.fn<DomainEventPublisher['publishAll']>(),
  };
  const audit = new FakeAuditRepository();

  return { audit, media, repo, refs, storage, events };
}

describe('DeleteMediaUseCase', () => {
  it('rejects referenced media without force', async () => {
    const deps = dependencies(2);

    await expect(
      new DeleteMediaUseCase(deps.repo, deps.refs, deps.storage, deps.events, deps.audit).execute({
        mediaId,
        requestedBy: 'editor-1',
        requestedByRole: 'EDITOR',
      }),
    ).rejects.toThrow(MediaReferencedError);
  });

  it('allows admin force delete of referenced media', async () => {
    const deps = dependencies(2);

    await new DeleteMediaUseCase(deps.repo, deps.refs, deps.storage, deps.events, deps.audit).execute({
      mediaId,
      requestedBy: 'admin-1',
      requestedByRole: 'ADMIN',
      force: true,
    });

    expect(deps.repo.delete).toHaveBeenCalledWith(deps.media.id);
    expect(deps.audit.events).toHaveLength(1);
  });

  it('rejects editor force delete of referenced media', async () => {
    const deps = dependencies(2);

    await expect(
      new DeleteMediaUseCase(deps.repo, deps.refs, deps.storage, deps.events, deps.audit).execute({
        mediaId,
        requestedBy: 'editor-1',
        requestedByRole: 'EDITOR',
        force: true,
      }),
    ).rejects.toThrow(MediaForbiddenError);
  });

  it('rejects author deleting another user media', async () => {
    const deps = dependencies(0);

    await expect(
      new DeleteMediaUseCase(deps.repo, deps.refs, deps.storage, deps.events, deps.audit).execute({
        mediaId,
        requestedBy: 'author-2',
        requestedByRole: 'AUTHOR',
      }),
    ).rejects.toThrow(MediaForbiddenError);
  });

  it('deletes storage, repository row, and publishes event on success', async () => {
    const deps = dependencies(0);

    await new DeleteMediaUseCase(deps.repo, deps.refs, deps.storage, deps.events, deps.audit).execute({
      mediaId,
      requestedBy: 'author-1',
      requestedByRole: 'AUTHOR',
    });

    expect(deps.storage.deleteObject).toHaveBeenCalledWith('media/original.pdf');
    expect(deps.repo.delete).toHaveBeenCalledWith(deps.media.id);
    expect(deps.events.publishAll).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'media.deleted', mediaId }),
    ]);
    expect(deps.audit.events).toHaveLength(1);
  });
});
