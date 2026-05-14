import { ContentStatus } from '../value-objects/content-status.vo';
import { DomainError } from './domain.error';

export class InvalidTransitionError extends DomainError {
  constructor(from: ContentStatus, to: ContentStatus) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}
