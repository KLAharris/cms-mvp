import { ResetTokenGenerator } from '../../application/ports/out/reset-token-generator.port';

export class FakeResetTokenGenerator implements ResetTokenGenerator {
  private index = 0;

  constructor(private readonly tokens = ['raw-reset-token-1']) {}

  generate(): string {
    const token =
      this.tokens[this.index] ?? `raw-reset-token-${String(this.index + 1)}`;
    this.index += 1;
    return token;
  }
}
