import { MimeValidator } from '../../../application/ports/out';
import { UnsupportedMediaTypeError } from '../../../domain/errors';
import { AllowedMimeType } from '../../../domain/value-objects';

type DetectedMime = {
  mimeType: AllowedMimeType;
  extensions: string[];
};

export class SharpMimeValidator implements MimeValidator {
  validateMimeConsistency(params: {
    filename: string;
    declaredMimeType: string;
    bytes: Buffer;
  }): void {
    const declaredMimeType = AllowedMimeType.fromString(
      params.declaredMimeType.toLowerCase(),
    );
    const extension = extensionFromFilename(params.filename);
    const detected = detectMime(params.bytes);

    if (detected === null) {
      throw new UnsupportedMediaTypeError(
        params.filename,
        'Unable to detect uploaded file type from magic bytes',
      );
    }

    if (detected.mimeType !== declaredMimeType) {
      throw new UnsupportedMediaTypeError(
        params.declaredMimeType,
        `Uploaded file magic bytes indicate ${detected.mimeType}, not ${declaredMimeType}`,
      );
    }

    if (!detected.extensions.includes(extension)) {
      throw new UnsupportedMediaTypeError(
        params.filename,
        'Uploaded file extension does not match detected file type',
      );
    }
  }
}

function extensionFromFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');

  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    throw new UnsupportedMediaTypeError(
      filename,
      'Filename must include a file extension',
    );
  }

  return filename.slice(dotIndex + 1).toLowerCase();
}

function detectMime(bytes: Buffer): DetectedMime | null {
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: AllowedMimeType.IMAGE_PNG, extensions: ['png'] };
  }

  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return { mimeType: AllowedMimeType.IMAGE_JPEG, extensions: ['jpg', 'jpeg'] };
  }

  const gifHeader = bytes.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return { mimeType: AllowedMimeType.IMAGE_GIF, extensions: ['gif'] };
  }

  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: AllowedMimeType.IMAGE_WEBP, extensions: ['webp'] };
  }

  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { mimeType: AllowedMimeType.APPLICATION_PDF, extensions: ['pdf'] };
  }

  if (looksLikeSvg(bytes)) {
    return { mimeType: AllowedMimeType.IMAGE_SVG, extensions: ['svg'] };
  }

  return null;
}

function hasPrefix(bytes: Buffer, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => bytes[index] === value);
}

function looksLikeSvg(bytes: Buffer): boolean {
  const sample = bytes.subarray(0, 512).toString('utf8').trimStart().toLowerCase();

  return sample.startsWith('<svg') || (sample.startsWith('<?xml') && sample.includes('<svg'));
}
