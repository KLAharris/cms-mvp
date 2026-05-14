import { DomainError } from '../errors/domain.error';

export class InvalidTagError extends DomainError {
  constructor() {
    super('Invalid tag');
  }
}

export class Tag {
  private constructor(readonly value: string) {}

  static create(input: string): Tag {
    const tag = input.trim().toLowerCase();

    if (tag === '' || tag.length > 40) {
      throw new InvalidTagError();
    }

    return new Tag(tag);
  }

  equals(other: Tag): boolean {
    return this.value === other.value;
  }
}
