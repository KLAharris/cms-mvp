import { DomainError } from '../errors/domain.error';

export type RichTextNodes = Record<string, unknown>;

export class InvalidRichTextBodyError extends DomainError {
  constructor() {
    super('Invalid rich text body');
  }
}

export class RichTextBody {
  private constructor(readonly nodes: RichTextNodes) {}

  static create(nodes: object): RichTextBody {
    if (
      nodes === null ||
      Object.getPrototypeOf(nodes) !== Object.prototype ||
      Array.isArray(nodes)
    ) {
      throw new InvalidRichTextBodyError();
    }

    return new RichTextBody(nodes as RichTextNodes);
  }

  isEmpty(): boolean {
    return Object.keys(this.nodes).length === 0;
  }

  equals(other: RichTextBody): boolean {
    return JSON.stringify(this.nodes) === JSON.stringify(other.nodes);
  }
}
