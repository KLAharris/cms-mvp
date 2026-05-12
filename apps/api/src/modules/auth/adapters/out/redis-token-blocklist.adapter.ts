import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { TokenBlocklist } from '../../application/ports/out/token-blocklist.port';

@Injectable()
export class RedisTokenBlocklist implements TokenBlocklist {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async add(jti: string, expiresAt: Date): Promise<void> {
    const secondsUntilExpiry = Math.max(
      1,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );

    await this.redis.set(this.keyFor(jti), '1', 'EX', secondsUntilExpiry);
  }

  async has(jti: string): Promise<boolean> {
    const value = await this.redis.get(this.keyFor(jti));

    return value !== null;
  }

  private keyFor(jti: string): string {
    return `blocklist:${jti}`;
  }
}
