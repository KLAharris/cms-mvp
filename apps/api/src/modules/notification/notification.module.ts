import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { ResendEmailSenderAdapter } from './adapters/out/email/resend-email-sender.adapter';
import { EMAIL_QUEUE_NAME } from './adapters/out/queue/email-queue.constants';
import { EmailQueueProducer } from './adapters/out/queue/email-queue.producer';
import {
  EmailWorkerProcessor,
  RedisConnection,
} from './adapters/out/worker/email-worker.processor';
import {
  EMAIL_QUEUE_PRODUCER_PORT,
  EmailQueueProducerPort,
} from './application/ports/email-queue-producer.port';
import { NotificationService } from './application/notification.service';
import {
  EMAIL_SENDER_PORT,
  IEmailSenderPort,
} from './domain/ports/email-sender.port';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'EMAIL_REDIS_CONNECTION',
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisConnection =>
        redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
    },
    {
      provide: 'EMAIL_QUEUE',
      inject: ['EMAIL_REDIS_CONNECTION'],
      useFactory: (connection: RedisConnection): Queue =>
        new Queue(EMAIL_QUEUE_NAME, { connection }),
    },
    {
      provide: EMAIL_QUEUE_PRODUCER_PORT,
      inject: ['EMAIL_QUEUE'],
      useFactory: (queue: Queue): EmailQueueProducerPort =>
        new EmailQueueProducer(queue),
    },
    {
      provide: EMAIL_SENDER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IEmailSenderPort =>
        new ResendEmailSenderAdapter(config),
    },
    {
      provide: NotificationService,
      inject: [EMAIL_QUEUE_PRODUCER_PORT, ConfigService],
      useFactory: (
        producer: EmailQueueProducerPort,
        config: ConfigService,
      ): NotificationService =>
        new NotificationService(
          producer,
          config.get<string>('FRONTEND_BASE_URL') ??
            config.getOrThrow<string>('PUBLIC_URL'),
        ),
    },
    {
      provide: EmailWorkerProcessor,
      inject: [EMAIL_SENDER_PORT, 'EMAIL_REDIS_CONNECTION'],
      useFactory: (
        emailSender: IEmailSenderPort,
        redisConnection: RedisConnection,
      ): EmailWorkerProcessor => new EmailWorkerProcessor(emailSender, redisConnection),
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}

function redisConnectionFromUrl(redisUrl: string): RedisConnection {
  const parsed = new URL(redisUrl);
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    ...(password !== undefined ? { password } : {}),
  };
}
