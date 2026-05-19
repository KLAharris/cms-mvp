import { EmailQueueProducerPort } from '../../../application/ports/email-queue-producer.port';
import { EmailJob } from '../../../domain/email-job';

type EmailQueue = {
  add(name: string, data: EmailJob, options: EmailJobOptions): Promise<unknown>;
};

type EmailJobOptions = {
  attempts: number;
  backoff: { type: 'exponential'; delay: number };
  removeOnComplete: number;
  removeOnFail: number;
};

export class EmailQueueProducer implements EmailQueueProducerPort {
  constructor(private readonly queue: EmailQueue) {}

  async enqueue(job: EmailJob): Promise<void> {
    await this.queue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  }
}
