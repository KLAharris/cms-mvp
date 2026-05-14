import { TransactionRunner } from '../ports/transaction-runner.port';

export class NoopTransactionRunner implements TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
