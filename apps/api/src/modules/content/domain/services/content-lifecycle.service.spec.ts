import { describe, expect, it } from 'vitest';

import { InvalidTransitionError } from '../errors/invalid-transition.error';
import { ContentStatus } from '../value-objects/content-status.vo';
import { ContentLifecycleService } from './content-lifecycle.service';

describe('ContentLifecycleService', () => {
  it.each([
    [ContentStatus.Draft, ContentStatus.InReview],
    [ContentStatus.Draft, ContentStatus.Published],
    [ContentStatus.InReview, ContentStatus.Published],
    [ContentStatus.InReview, ContentStatus.Draft],
    [ContentStatus.Published, ContentStatus.Unpublished],
    [ContentStatus.Unpublished, ContentStatus.Draft],
    [ContentStatus.Unpublished, ContentStatus.Archived],
  ])('allows %s to %s', (from, to) => {
    expect(() =>
      ContentLifecycleService.assertCanTransition(from, to),
    ).not.toThrow();
  });

  it.each([
    [ContentStatus.Draft, ContentStatus.Unpublished],
    [ContentStatus.Draft, ContentStatus.Archived],
    [ContentStatus.InReview, ContentStatus.Unpublished],
    [ContentStatus.InReview, ContentStatus.Archived],
    [ContentStatus.Published, ContentStatus.Draft],
    [ContentStatus.Published, ContentStatus.InReview],
    [ContentStatus.Published, ContentStatus.Archived],
    [ContentStatus.Unpublished, ContentStatus.Published],
    [ContentStatus.Unpublished, ContentStatus.InReview],
    [ContentStatus.Archived, ContentStatus.Draft],
    [ContentStatus.Archived, ContentStatus.InReview],
    [ContentStatus.Archived, ContentStatus.Published],
    [ContentStatus.Archived, ContentStatus.Unpublished],
    [ContentStatus.Archived, ContentStatus.Archived],
  ])('throws for %s to %s', (from, to) => {
    expect(() => ContentLifecycleService.assertCanTransition(from, to)).toThrow(
      InvalidTransitionError,
    );
  });
});
