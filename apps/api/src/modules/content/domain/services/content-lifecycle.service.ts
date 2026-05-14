import { InvalidTransitionError } from '../errors/invalid-transition.error';
import { ContentStatus } from '../value-objects/content-status.vo';

export const ContentLifecycleService = {
  assertCanTransition(from: ContentStatus, to: ContentStatus): void {
    const allowed = new Set<string>([
      `${ContentStatus.Draft}:${ContentStatus.InReview}`,
      `${ContentStatus.Draft}:${ContentStatus.Published}`,
      `${ContentStatus.InReview}:${ContentStatus.Published}`,
      `${ContentStatus.InReview}:${ContentStatus.Draft}`,
      `${ContentStatus.Published}:${ContentStatus.Unpublished}`,
      `${ContentStatus.Unpublished}:${ContentStatus.Draft}`,
      `${ContentStatus.Unpublished}:${ContentStatus.Archived}`,
    ]);

    if (!allowed.has(`${from}:${to}`)) {
      throw new InvalidTransitionError(from, to);
    }
  },
};
