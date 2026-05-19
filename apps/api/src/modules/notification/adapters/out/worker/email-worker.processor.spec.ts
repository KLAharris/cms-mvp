import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import { IEmailSenderPort } from '../../../domain/ports/email-sender.port';
import { UnhandledEmailJobTypeError } from '../../../domain/errors/unhandled-email-job-type.error';
import { EmailWorkerProcessor } from './email-worker.processor';

class FakeEmailSender implements IEmailSenderPort {
  readonly sendPasswordResetEmail = vi.fn(
    (to: string, resetLink: string): Promise<void> => {
      void to;
      void resetLink;
      return Promise.resolve();
    },
  );

  readonly sendInviteEmail = vi.fn(
    (to: string, inviteLink: string, role: string): Promise<void> => {
      void to;
      void inviteLink;
      void role;
      return Promise.resolve();
    },
  );
}

function job(data: unknown, id = 'job-1'): Job {
  return { id, data } as Job;
}

describe('EmailWorkerProcessor', () => {
  it('routes password-reset jobs to the email sender', async () => {
    const sender = new FakeEmailSender();
    const processor = new EmailWorkerProcessor(sender, { host: 'localhost', port: 6379 });

    await processor.process(
      job({
        type: 'password-reset',
        to: 'user@example.com',
        resetLink: 'https://admin.example.com/reset-password?token=token',
      }),
    );

    expect(sender.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'https://admin.example.com/reset-password?token=token',
    );
  });

  it('routes invite jobs to the email sender', async () => {
    const sender = new FakeEmailSender();
    const processor = new EmailWorkerProcessor(sender, { host: 'localhost', port: 6379 });

    await processor.process(
      job({
        type: 'invite',
        to: 'author@example.com',
        inviteLink: 'https://admin.example.com/accept-invite?token=token',
        role: 'author',
      }),
    );

    expect(sender.sendInviteEmail).toHaveBeenCalledWith(
      'author@example.com',
      'https://admin.example.com/accept-invite?token=token',
      'author',
    );
  });

  it('logs job context and rethrows sender errors', async () => {
    const sender = new FakeEmailSender();
    sender.sendInviteEmail.mockRejectedValue(new Error('resend failed'));
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const processor = new EmailWorkerProcessor(sender, { host: 'localhost', port: 6379 });

    await expect(
      processor.process(
        job({
          type: 'invite',
          to: 'author@example.com',
          inviteLink: 'https://admin.example.com/accept-invite?token=token',
          role: 'author',
        }),
      ),
    ).rejects.toThrow('resend failed');

    expect(errorSpy).toHaveBeenCalledWith({
      jobId: 'job-1',
      type: 'invite',
      to: 'author@example.com',
      error: 'resend failed',
    });
    errorSpy.mockRestore();
  });

  it('throws for unknown job types', async () => {
    const sender = new FakeEmailSender();
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const processor = new EmailWorkerProcessor(sender, { host: 'localhost', port: 6379 });

    await expect(
      processor.process(job({ type: 'welcome', to: 'user@example.com' })),
    ).rejects.toThrow(UnhandledEmailJobTypeError);
    errorSpy.mockRestore();
  });
});
