import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';

import { MEDIA_VARIANT_QUEUE } from '../../../../../shared/ports/job-enqueuer.port';
import { GenerateMediaVariantsUseCase } from '../../../application/ports/in';

@Injectable()
export class ImageVariantWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImageVariantWorker.name);
  private worker!: Worker;

  constructor(
    private readonly generateVariants: GenerateMediaVariantsUseCase,
    private readonly redisConnection: { host: string; port: number; password?: string; enableReadyCheck?: boolean },
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      MEDIA_VARIANT_QUEUE,
      async (job: Job) => {
        const data = job.data as { mediaId: string };
        const { mediaId } = data;
        await this.generateVariants.execute({ mediaId });
      },
      {
        connection: this.redisConnection,
        concurrency: 3,
      },
    );

    this.worker.on('error', (err) => {
      this.logger.error(`Media variant worker error: ${err.message}`, err.stack);
    });

    this.worker.on('failed', (job, err) => {
      // Log failure only — use case already marks entity as failed
      // Do NOT rethrow — BullMQ retry is not needed since domain handles the failed state
      const jobData = job?.data as { mediaId?: string } | undefined;
      this.logger.error(
        `Media variant job failed for mediaId=${String(jobData?.mediaId)}: ${err.message}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
