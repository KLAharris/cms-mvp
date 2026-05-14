import { Clock } from '@shared/ports/clock.port';
import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import { ContentForbiddenError } from '../../domain/errors/content-forbidden.error';
import { ContentNotFoundError } from '../../domain/errors/content-not-found.error';
import { ContentId } from '../../domain/value-objects/content-id.vo';
import {
  ScheduleContentCommand,
  ScheduleContentResult,
  ScheduleContentUseCase as ScheduleContentPort,
} from '../ports/in/schedule-content.port';
import { ContentRepository } from '../ports/out/content-repository.port';
import { ContentAccessPolicy } from '../policies/content-access.policy';

export class ScheduleContentUseCase implements ScheduleContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(
    command: ScheduleContentCommand,
  ): Promise<ScheduleContentResult> {
    return this.tx.run(async () => {
      const content = await this.contents.findById(ContentId.create(command.contentId));
      if (content === null) {
        throw new ContentNotFoundError(command.contentId);
      }

      if (!ContentAccessPolicy.canSchedule(command.actorRole)) {
        throw new ContentForbiddenError('Cannot schedule content');
      }

      content.schedulePublish(
        command.scheduledAt,
        command.actorId,
        this.clock.now(),
      );
      await this.contents.save(content);

      return {
        contentId: content.id.value,
        status: content.status,
        scheduledAt: command.scheduledAt,
      };
    });
  }
}
