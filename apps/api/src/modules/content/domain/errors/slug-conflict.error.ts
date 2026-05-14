import { ContentType } from '../value-objects/content-type.vo';
import { DomainError } from './domain.error';

export class SlugConflictError extends DomainError {
  constructor(type: ContentType, slug: string) {
    super(`Slug already exists for type ${type}: ${slug}`);
  }
}
