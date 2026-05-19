import { describe, expect, it } from 'vitest';

import { EmailJob } from '../domain/email-job';
import { EmailQueueProducerPort } from './ports/email-queue-producer.port';
import { NotificationService } from './notification.service';

class FakeEmailQueueProducer implements EmailQueueProducerPort {
  readonly jobs: EmailJob[] = [];
  error: Error | undefined;

  enqueue(job: EmailJob): Promise<void> {
    if (this.error !== undefined) {
      return Promise.reject(this.error);
    }

    this.jobs.push(job);
    return Promise.resolve();
  }
}

function setup(): {
  producer: FakeEmailQueueProducer;
  service: NotificationService;
} {
  const producer = new FakeEmailQueueProducer();
  const service = new NotificationService(producer, 'https://admin.example.com');

  return { producer, service };
}

describe('NotificationService', () => {
  it('enqueues a password reset email job with a frontend reset link', async () => {
    const { producer, service } = setup();

    await service.sendPasswordResetEmail('user@example.com', 'reset-token');

    expect(producer.jobs).toEqual([
      {
        type: 'password-reset',
        to: 'user@example.com',
        resetLink: 'https://admin.example.com/reset-password?token=reset-token',
      },
    ]);
  });

  it('enqueues an invite email job with role and frontend invite link', async () => {
    const { producer, service } = setup();

    await service.sendInviteEmail('author@example.com', 'invite token', 'author');

    expect(producer.jobs).toEqual([
      {
        type: 'invite',
        to: 'author@example.com',
        inviteLink: 'https://admin.example.com/accept-invite?token=invite+token',
        role: 'author',
      },
    ]);
  });

  it('propagates producer errors', async () => {
    const { producer, service } = setup();
    producer.error = new Error('redis unavailable');

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'token'),
    ).rejects.toThrow('redis unavailable');
  });
});
