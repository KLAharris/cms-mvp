import { DomainError } from '../errors/domain.error';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IdGenerator {
  generate(): string;
}

export class InvalidContentIdError extends DomainError {
  constructor() {
    super('Invalid content id');
  }
}

export class ContentId {
  private constructor(readonly value: string) {}

  static create(id: string): ContentId {
    if (!UUID_V4_REGEX.test(id.trim())) {
      throw new InvalidContentIdError();
    }

    return new ContentId(id.trim());
  }

  static generate(idGen: IdGenerator): ContentId {
    return ContentId.create(idGen.generate());
  }

  equals(other: ContentId): boolean {
    return this.value === other.value;
  }
}
