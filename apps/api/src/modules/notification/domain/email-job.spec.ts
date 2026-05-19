import { describe, expect, it } from 'vitest';

import { UnhandledEmailJobTypeError } from './errors/unhandled-email-job-type.error';
import { assertNeverEmailJob, EmailJob } from './email-job';

describe('EmailJob exhaustiveness guard', () => {
  it('throws for an unhandled email job shape', () => {
    const job = { type: 'welcome', to: 'user@example.com' } as unknown as EmailJob;

    expect(() => assertNeverEmailJob(job as never)).toThrow(
      UnhandledEmailJobTypeError,
    );
  });
});
