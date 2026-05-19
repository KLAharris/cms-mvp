export interface MimeValidator {
  validateMimeConsistency(params: {
    filename: string;
    declaredMimeType: string;
    bytes: Buffer;
  }): void;
}
