import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';

import { EmailJob, assertNeverEmailJob } from '../../../domain/email-job';
import { IEmailSenderPort } from '../../../domain/ports/email-sender.port';
import { EMAIL_QUEUE_NAME } from '../queue/email-queue.constants';

export type RedisConnection = {
  host: string;
  port: number;
  password?: string;
};

@Injectable()
export class EmailWorkerProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorkerProcessor.name);
  private worker: Worker | undefined;

  constructor(
    private readonly emailSender: IEmailSenderPort,
    private readonly redisConnection: RedisConnection,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(EMAIL_QUEUE_NAME, (job) => this.process(job), {
      connection: this.redisConnection,
      concurrency: 3,
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Email worker error: ${err.message}`, err.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  async process(job: Job): Promise<void> {
    const data = job.data as EmailJob;

    try {
      switch (data.type) {
        case 'password-reset':
          await this.emailSender.sendPasswordResetEmail(data.to, data.resetLink);
          return;
        case 'invite':
          await this.emailSender.sendInviteEmail(data.to, data.inviteLink, data.role);
          return;
        default:
          assertNeverEmailJob(data);
      }
    } catch (error) {
      this.logger.error({
        jobId: job.id,
        type: getJobType(data),
        to: getJobRecipient(data),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

function getJobType(job: unknown): string {
  if (
    typeof job === 'object' &&
    job !== null &&
    'type' in job &&
    typeof job.type === 'string'
  ) {
    return job.type;
  }

  return 'unknown';
}

function getJobRecipient(job: unknown): string {
  if (
    typeof job === 'object' &&
    job !== null &&
    'to' in job &&
    typeof job.to === 'string'
  ) {
    return job.to;
  }

  return 'unknown';
}
