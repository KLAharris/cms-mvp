import { config as loadEnv } from 'dotenv';
import Redis from 'ioredis';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { RedisCacheAdapter } from '../../../src/shared/adapters/redis-cache.adapter';

const apiRoot = resolve(__dirname, '../../..');

describe('RedisCacheAdapter', () => {
  let redis: Redis;
  let adapter: RedisCacheAdapter;

  beforeAll(() => {
    loadEnv({ path: resolve(apiRoot, '.env') });

    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    redis.on('error', () => undefined);
    adapter = new RedisCacheAdapter(redis);
  });

  afterEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('get() returns null for a missing key', async () => {
    await expect(adapter.get('missing')).resolves.toBeNull();
  });

  it('set() then get() returns the stored value', async () => {
    await adapter.set('test:key', 'value', 60);

    await expect(adapter.get('test:key')).resolves.toBe('value');
  });

  it(
    'set() with ttlSeconds=1 expires the stored value',
    async () => {
      await adapter.set('test:ttl', 'value', 1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await expect(adapter.get('test:ttl')).resolves.toBeNull();
    },
    10000,
  );

  it('del() removes a key', async () => {
    await adapter.set('test:key', 'value', 60);

    await adapter.del('test:key');

    await expect(adapter.get('test:key')).resolves.toBeNull();
  });

  it('del() on missing key does not throw', async () => {
    await expect(adapter.del('missing')).resolves.toBeUndefined();
  });

  it('delByPattern() deletes matching keys and leaves non-matching keys intact', async () => {
    await adapter.set('test:one', '1', 60);
    await adapter.set('test:two', '2', 60);
    await adapter.set('other:one', '3', 60);

    await adapter.delByPattern('test:*');

    await expect(adapter.get('test:one')).resolves.toBeNull();
    await expect(adapter.get('test:two')).resolves.toBeNull();
    await expect(adapter.get('other:one')).resolves.toBe('3');
  });

  it('delByPattern() with no matching keys does not throw', async () => {
    await expect(adapter.delByPattern('missing:*')).resolves.toBeUndefined();
  });
});
