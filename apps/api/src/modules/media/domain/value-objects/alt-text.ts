export class AltText {
  private constructor(readonly value: string | undefined) {}

  static create(value?: string): AltText {
    if (value !== undefined && value.length > 500) {
      throw new Error('Alt text cannot exceed 500 characters');
    }

    return new AltText(value);
  }
}
