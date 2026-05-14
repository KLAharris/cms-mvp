import { DomainError } from './domain.error';

export class ContentNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Content not found: ${id}`);
  }
}
