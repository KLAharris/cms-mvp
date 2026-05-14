import { DomainError } from './domain.error';

export class ScheduledAtInPastError extends DomainError {
  constructor() {
    super('scheduledAt must be a future timestamp');
  }
}
