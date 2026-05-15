import { DomainError } from '../errors';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidMediaIdError extends DomainError {
  constructor() {
    super('Invalid media id');
  }
}

export class MediaId {
  private constructor(readonly value: string) {}

  static create(id?: string): MediaId {
    const value = id?.trim() ?? generateUuidV4();

    if (!UUID_REGEX.test(value)) {
      throw new InvalidMediaIdError();
    }

    return new MediaId(value);
  }

  equals(other: MediaId): boolean {
    return this.value === other.value;
  }
}

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
