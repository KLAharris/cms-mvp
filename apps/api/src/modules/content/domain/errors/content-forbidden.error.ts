import { DomainError } from './domain.error';

export class ContentForbiddenError extends DomainError {
  constructor(reason: string) {
    super(`Forbidden: ${reason}`);
  }
}
