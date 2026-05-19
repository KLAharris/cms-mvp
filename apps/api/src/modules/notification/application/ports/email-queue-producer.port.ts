import { EmailJob } from '../../domain/email-job';

export interface EmailQueueProducerPort {
  enqueue(job: EmailJob): Promise<void>;
}

export const EMAIL_QUEUE_PRODUCER_PORT = Symbol('EMAIL_QUEUE_PRODUCER_PORT');
