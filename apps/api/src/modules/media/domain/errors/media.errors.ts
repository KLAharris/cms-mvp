export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MediaNotFoundError extends DomainError {
  constructor(mediaId: string) {
    super(`Media item '${mediaId}' not found`);
  }
}

export class MediaReferencedError extends DomainError {
  constructor(mediaId: string, referenceCount: number) {
    super(
      `Media item '${mediaId}' is referenced by ${String(referenceCount)} content item(s) and cannot be deleted`,
    );
  }
}

export class UnsupportedMediaTypeError extends DomainError {
  constructor(mimeType: string, customMessage?: string) {
    super(
      customMessage ??
        `Media type '${mimeType}' is not supported. Allowed: PNG, JPEG, WEBP, GIF, SVG, PDF`,
    );
  }
}

export class FileSizeLimitExceededError extends DomainError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `File size ${String(sizeBytes)} bytes exceeds the maximum allowed size of ${String(maxBytes)} bytes`,
    );
  }
}

export class MediaAlreadyFinalizedError extends DomainError {
  constructor(mediaId: string) {
    super(`Media item '${mediaId}' has already been finalized`);
  }
}

export class VariantGenerationFailedError extends DomainError {
  constructor(mediaId: string, reason: string) {
    super(`Variant generation failed for media '${mediaId}': ${reason}`);
  }
}

export class MediaForbiddenError extends DomainError {
  constructor(reason: string) {
    super(`Forbidden: ${reason}`);
  }
}
