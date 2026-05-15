import { Clock } from '../../../../shared/ports/clock.port';
import { IdGenerator } from '../../../../shared/ports/id-generator.port';

import { MediaItem } from '../../domain/entities';
import {
  AllowedMimeType,
  DEFAULT_MAX_UPLOAD_BYTES,
  FileSize,
  MediaId,
  StorageKey,
} from '../../domain/value-objects';
import {
  PresignUploadCommand,
  PresignUploadResult,
  PresignUploadUseCase as PresignUploadPort,
} from '../ports/in';
import { MediaRepository, ObjectStorage } from '../ports/out';

export const MAX_UPLOAD_BYTES = Symbol('MAX_UPLOAD_BYTES');

export class PresignUploadUseCase implements PresignUploadPort {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: ObjectStorage,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly maxUploadBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
  ) {}

  async execute(command: PresignUploadCommand): Promise<PresignUploadResult> {
    const mimeType = AllowedMimeType.fromString(command.mimeType);
    FileSize.create(command.sizeBytes, this.maxUploadBytes);

    const mediaId = MediaId.create(this.ids.generate());
    const storageKey = StorageKey.generate(mediaId, command.filename, this.clock.now().getTime());
    const presigned = await this.storage.presignUpload({
      storageKey: storageKey.value,
      mimeType,
      maxBytes: this.maxUploadBytes,
      ttlSeconds: 300,
    });

    const media = MediaItem.create({
      id: mediaId.value,
      filename: command.filename,
      mimeType,
      sizeBytes: command.sizeBytes,
      maxSizeBytes: this.maxUploadBytes,
      storageKey: presigned.storageKey,
      uploadedBy: command.uploadedBy,
      uploadedAt: this.clock.now(),
    });

    await this.media.save(media);

    return {
      mediaId: mediaId.value,
      uploadUrl: presigned.uploadUrl,
      storageKey: presigned.storageKey,
      expiresAt: presigned.expiresAt,
    };
  }
}
