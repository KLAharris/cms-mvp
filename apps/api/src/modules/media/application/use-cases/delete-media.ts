import { randomUUID } from 'crypto';

import { DomainEventPublisher } from '../../../../shared/ports/event-publisher.port';

import { AuditAction, AuditEvent, AuditPort } from '../../../audit';
import { MediaDeletedEvent } from '../../domain/events';
import {
  MediaForbiddenError,
  MediaNotFoundError,
  MediaReferencedError,
} from '../../domain/errors';
import { MediaId } from '../../domain/value-objects';
import {
  DeleteMediaCommand,
  DeleteMediaUseCase as DeleteMediaPort,
} from '../ports/in';
import {
  MediaReferenceChecker,
  MediaRepository,
  ObjectStorage,
} from '../ports/out';

export class DeleteMediaUseCase implements DeleteMediaPort {
  constructor(
    private readonly media: MediaRepository,
    private readonly references: MediaReferenceChecker,
    private readonly storage: ObjectStorage,
    private readonly events: DomainEventPublisher,
    private readonly audit?: AuditPort,
  ) {}

  async execute(command: DeleteMediaCommand): Promise<void> {
    const media = await this.media.findById(MediaId.create(command.mediaId));
    if (media === null) {
      throw new MediaNotFoundError(command.mediaId);
    }

    if (
      command.requestedByRole === 'AUTHOR' &&
      !media.isOwnedBy(command.requestedBy)
    ) {
      throw new MediaForbiddenError('Authors can only delete their own media');
    }

    const referenceCount = await this.references.countReferences(media.id);
    if (referenceCount > 0) {
      if (command.force === true && command.requestedByRole !== 'ADMIN') {
        throw new MediaForbiddenError('Only admins can force-delete referenced media');
      }
      if (command.force !== true) {
        throw new MediaReferencedError(command.mediaId, referenceCount);
      }
    }

    await this.storage.deleteObject(media.storageKey.value);
    for (const storageKey of media.variants.values()) {
      await this.storage.deleteObject(storageKey.value);
    }
    await this.media.delete(media.id);
    await this.audit?.save(
      AuditEvent.create({
        id: randomUUID(),
        actorId: command.requestedBy,
        actorIp: command.actorIp ?? 'unknown',
        action: AuditAction.MEDIA_DELETED,
        targetType: 'media',
        targetId: media.id.value,
        summary: { force: command.force === true },
      }),
    );
    await this.events.publishAll([
      new MediaDeletedEvent(
        media.id.value,
        media.storageKey.value,
        command.requestedBy,
      ),
    ]);
  }
}
