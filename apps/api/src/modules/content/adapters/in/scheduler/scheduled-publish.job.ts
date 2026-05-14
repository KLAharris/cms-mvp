import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentStatus, Prisma } from '@prisma/client';

import { EnvConfig } from '../../../../../config/env.validation';
import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import { PublishContentUseCase } from '../../../application/ports/in/publish-content.port';
import { PublishValidationError } from '../../../domain/errors/publish-validation.error';

export type ScheduledPublishPrismaClient = {
  content: {
    findMany(args: Prisma.ContentFindManyArgs): Promise<Array<{ id: string }>>;
  };
};

@Injectable()
export class ScheduledPublishJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPublishJob.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: ScheduledPublishPrismaClient,
    @Inject('PUBLISH_CONTENT_USE_CASE')
    private readonly publishContent: PublishContentUseCase,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  onModuleInit(): void {
    const intervalSeconds = this.configService.get(
      'WORKER_SCHEDULED_PUBLISH_INTERVAL_SEC',
      { infer: true },
    );

    this.timer = setInterval(() => {
      void this.runWithoutOverlap();
    }, intervalSeconds * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    const dueItems = await this.prisma.content.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        status: { in: [ContentStatus.draft, ContentStatus.in_review] },
        deletedAt: null,
      },
      select: { id: true },
      orderBy: { scheduledAt: 'asc' },
    });

    let published = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of dueItems) {
      try {
        await this.publishContent.execute({
          contentId: item.id,
          actorId: 'system',
          actorRole: 'admin',
        });
        published += 1;
      } catch (error) {
        if (error instanceof PublishValidationError) {
          skipped += 1;
          this.logger.warn(
            `Scheduled publish skipped content ${item.id}: ${error.message}`,
          );
          continue;
        }

        errors += 1;
        this.logger.error(
          `Scheduled publish failed for content ${item.id}: ${this.errorMessage(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log(
      `Scheduled publish: ${String(published)} published, ${String(skipped)} skipped, ${String(errors)} errors`,
    );
  }

  private async runWithoutOverlap(): Promise<void> {
    if (this.running) return;

    this.running = true;
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.error(
        `Scheduled publish job failed: ${this.errorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
