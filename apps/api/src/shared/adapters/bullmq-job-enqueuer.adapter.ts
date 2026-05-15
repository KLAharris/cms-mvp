import { Queue } from 'bullmq';

import { JobEnqueuer, JobPayload } from '../ports/job-enqueuer.port';

export class BullMQJobEnqueuer implements JobEnqueuer {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly redisConnection: { host: string; port: number }) {}

  async enqueue(queueName: string, payload: JobPayload): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    await queue.add(payload.type, payload.data, {
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }

  private getOrCreateQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: this.redisConnection }),
      );
    }

    const queue = this.queues.get(queueName);
    if (queue === undefined) {
      throw new Error(`Queue was not initialized: ${queueName}`);
    }

    return queue;
  }
}
