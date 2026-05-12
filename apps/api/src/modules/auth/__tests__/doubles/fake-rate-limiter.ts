import { RateLimiter } from '../../application/ports/out/rate-limiter.port';
import { RateLimitExceededError } from '../../domain/errors';

export class FakeRateLimiter implements RateLimiter {
  readonly calls: Array<{ key: string; limit: number; windowSeconds: number }> = [];

  constructor(private readonly shouldThrow = false) {}

  check(key: string, limit: number, windowSeconds: number): Promise<void> {
    this.calls.push({ key, limit, windowSeconds });

    if (this.shouldThrow) {
      throw new RateLimitExceededError();
    }

    return Promise.resolve();
  }
}
