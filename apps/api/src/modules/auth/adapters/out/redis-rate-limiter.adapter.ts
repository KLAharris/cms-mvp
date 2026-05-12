import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { RateLimiter } from '../../application/ports/out/rate-limiter.port';
import { RateLimitExceededError } from '../../domain/errors';

@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async check(key: string, limit: number, windowSeconds: number): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }

    if (count > limit) {
      throw new RateLimitExceededError();
    }
  }
}
