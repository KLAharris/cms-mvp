import { describe, expect, it } from 'vitest';

import { CLOCK, Clock } from './clock.port';

describe('Clock port', () => {
  it('defines clock contract and token', () => {
    const now = new Date('2026-05-14T00:00:00.000Z');
    const clock: Clock = { now: () => now };

    expect(clock.now()).toBe(now);
    expect(CLOCK.description).toBe('Clock');
  });
});
