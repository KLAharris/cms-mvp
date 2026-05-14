import { describe, expect, it } from 'vitest';

import {
  TRANSACTION_RUNNER,
  TransactionRunner,
} from './transaction-runner.port';

describe('TransactionRunner port', () => {
  it('defines transaction runner contract and token', async () => {
    const runner: TransactionRunner = {
      run: (fn) => fn(),
    };

    await expect(runner.run(() => Promise.resolve('result'))).resolves.toBe('result');
    expect(TRANSACTION_RUNNER.description).toBe('TransactionRunner');
  });
});
