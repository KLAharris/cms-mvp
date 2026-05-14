import { describe, expect, it } from 'vitest';

import { NoopTransactionRunner } from './noop-transaction-runner.adapter';

describe('NoopTransactionRunner', () => {
  it('runs the callback', async () => {
    await expect(new NoopTransactionRunner().run(async () => 'ok')).resolves.toBe(
      'ok',
    );
  });
});
