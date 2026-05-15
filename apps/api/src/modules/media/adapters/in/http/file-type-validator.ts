import { AllowedMimeType } from '../../../domain/value-objects';
import { UnsupportedMediaTypeError } from '../../../domain/errors';

export class FileTypeValidator {
  validateMimeAndExtension(filename: string, declaredMime: string): void {
    const mime = declaredMime.toLowerCase();

    // Throws UnsupportedMediaTypeError if mime is not in the allow-list (FR-MEDIA-01)
    AllowedMimeType.fromString(mime);

    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === filename.length - 1) {
      throw new UnsupportedMediaTypeError(
        filename,
        'Filename must include a file extension',
      );
    }

    const ext = filename.slice(dotIndex + 1).toLowerCase();
    const allowedExts = AllowedMimeType.allowedExtensions()[mime as AllowedMimeType];

    if (!allowedExts.includes(ext)) {
      throw new UnsupportedMediaTypeError(
        declaredMime,
        'File extension does not match declared MIME type',
      );
    }
  }
}
