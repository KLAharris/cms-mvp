import { describe, expect, it } from 'vitest';

import { ContentType } from '../value-objects/content-type.vo';
import { ContentForbiddenError } from './content-forbidden.error';
import { ContentNotFoundError } from './content-not-found.error';
import { DomainError } from './domain.error';
import { InvalidTransitionError } from './invalid-transition.error';
import { PublishValidationError } from './publish-validation.error';
import { ScheduledAtInPastError } from './scheduled-at-in-past.error';
import { SlugConflictError } from './slug-conflict.error';
import { ContentStatus } from '../value-objects/content-status.vo';

describe('content domain errors', () => {
  it('DomainError sets name from concrete class', () => {
    const error = new DomainError('message');

    expect(error.message).toBe('message');
    expect(error.name).toBe('DomainError');
  });

  it('formats content errors', () => {
    expect(new ContentNotFoundError('content-1').message).toBe(
      'Content not found: content-1',
    );
    expect(
      new InvalidTransitionError(ContentStatus.Draft, ContentStatus.Archived)
        .message,
    ).toBe('Cannot transition from draft to archived');
    expect(new SlugConflictError(ContentType.Article, 'slug').message).toBe(
      'Slug already exists for type article: slug',
    );
    expect(new PublishValidationError('field failed').message).toBe('field failed');
    expect(new ContentForbiddenError('missing role').message).toBe(
      'Forbidden: missing role',
    );
    expect(new ScheduledAtInPastError().message).toBe(
      'scheduledAt must be a future timestamp',
    );
  });
});
