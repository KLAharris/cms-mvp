import { describe, expect, it, vi } from 'vitest';

import { EmailQueueProducer } from './email-queue.producer';
import { EMAIL_QUEUE_NAME } from './email-queue.constants';

type QueueAddCall = {
  name: string;
  data: unknown;
  options: unknown;
};

class FakeQueue {
  readonly close = vi.fn((): Promise<void> => Promise.resolve());
  readonly add = vi.fn(
    (name: string, data: unknown, options: unknown): Promise<void> => {
      this.calls.push({ name, data, options });
      return Promise.resolve();
    },
  );

  readonly calls: QueueAddCall[] = [];
}

describe('EmailQueueProducer', () => {
  it('adds email jobs to BullMQ with retry options', async () => {
    const queue = new FakeQueue();
    const producer = new EmailQueueProducer(queue);

    await producer.enqueue({
      type: 'invite',
      to: 'author@example.com',
      inviteLink: 'https://admin.example.com/accept-invite?token=token',
      role: 'author',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'invite',
      {
        type: 'invite',
        to: 'author@example.com',
        inviteLink: 'https://admin.example.com/accept-invite?token=token',
        role: 'author',
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    expect(EMAIL_QUEUE_NAME).toBe('email.queue');
  });

  it('closes the BullMQ queue on module destroy', async () => {
    const queue = new FakeQueue();
    const producer = new EmailQueueProducer(queue);

    await producer.onModuleDestroy();

    expect(queue.close).toHaveBeenCalledOnce();
  });
});
