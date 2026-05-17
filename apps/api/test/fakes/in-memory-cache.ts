import type { Cache } from '../../src/shared/ports/cache.port';

export class InMemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private failing = false;

  setFailMode(fail: boolean): void {
    this.failing = fail;
  }

  get(key: string): Promise<string | null> {
    if (this.failing) {
      return Promise.reject(new Error('Redis unavailable'));
    }

    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(null);
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.failing) {
      return Promise.reject(new Error('Redis unavailable'));
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.store.delete(key);

    return Promise.resolve();
  }

  delByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(
      `^${pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
    );

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }

    return Promise.resolve();
  }

  clear(): void {
    this.store.clear();
  }
}
