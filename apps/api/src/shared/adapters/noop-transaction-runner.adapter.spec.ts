import { describe, expect, it } from 'vitest';

import { NoopTransactionRunner } from './noop-transaction-runner.adapter';

describe('NoopTransactionRunner', () => {
  it('runs the callback', async () => {
    await expect(new NoopTransactionRunner().run(() => Promise.resolve('ok'))).resolves.toBe(
      'ok',
    );
  });
});
