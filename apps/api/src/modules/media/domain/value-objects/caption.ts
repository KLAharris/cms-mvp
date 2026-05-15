export class Caption {
  private constructor(readonly value: string | undefined) {}

  static create(value?: string): Caption {
    if (value !== undefined && value.length > 1000) {
      throw new Error('Caption cannot exceed 1000 characters');
    }

    return new Caption(value);
  }
}
