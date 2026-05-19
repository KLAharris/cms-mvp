export class UnhandledEmailJobTypeError extends Error {
  constructor(type: string) {
    super(`Unhandled email job type: ${type}`);
    this.name = 'UnhandledEmailJobTypeError';
  }
}
