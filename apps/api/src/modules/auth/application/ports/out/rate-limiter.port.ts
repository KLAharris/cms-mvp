export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<void>;
}
