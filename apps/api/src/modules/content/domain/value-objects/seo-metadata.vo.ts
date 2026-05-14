import { DomainError } from '../errors/domain.error';

export class InvalidSeoMetadataError extends DomainError {}

export class SeoMetadata {
  private constructor(
    readonly title: string,
    readonly description: string,
  ) {}

  static create(title: string, description: string): SeoMetadata {
    if (title.length > 70) {
      throw new InvalidSeoMetadataError('SEO title must be 70 characters or fewer');
    }

    if (description.length > 160) {
      throw new InvalidSeoMetadataError(
        'SEO description must be 160 characters or fewer',
      );
    }

    return new SeoMetadata(title, description);
  }

  equals(other: SeoMetadata): boolean {
    return this.title === other.title && this.description === other.description;
  }
}
