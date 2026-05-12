import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { RateLimiter } from '../../application/ports/out/rate-limiter.port';
import { RateLimitExceededError } from '../../domain/errors';

@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async check(key: string, limit: number, windowSeconds: number): Promise<void> {
    const redisKey = `ratelimit:${key}`;

    const luaScript = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return count
    `;

    const count = (await this.redis.eval(
      luaScript, 1, redisKey, String(windowSeconds),
    )) as number;

    if (count > limit) {
      throw new RateLimitExceededError();
    }
  }
}
