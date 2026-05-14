import { DomainError } from '../errors/domain.error';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class InvalidSlugError extends DomainError {
  constructor() {
    super('Invalid slug');
  }
}

export class Slug {
  private constructor(readonly value: string) {}

  static create(input: string): Slug {
    const slug = input.trim().toLowerCase();

    if (!SLUG_REGEX.test(slug)) {
      throw new InvalidSlugError();
    }

    return new Slug(slug);
  }

  static fromTitle(title: string): Slug {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    return Slug.create(slug);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
