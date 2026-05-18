import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface ScheduleContentUseCase {
  execute(command: ScheduleContentCommand): Promise<ScheduleContentResult>;
}

export type ScheduleContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
  actorIp?: string;
  scheduledAt: Date;
};

export type ScheduleContentResult = {
  contentId: string;
  status: ContentStatus;
  scheduledAt: Date;
};
