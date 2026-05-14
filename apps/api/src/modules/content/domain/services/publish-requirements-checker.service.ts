import { Content } from '../entities/content.entity';
import { PublishValidationError } from '../errors/publish-validation.error';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class PublishRequirementsCheckerService {
  static check(content: Content): void {
    if (content.title.trim() === '') {
      throw new PublishValidationError('Title is required');
    }

    if (content.body === null) {
      throw new PublishValidationError('Body is required');
    }

    if (content.body.isEmpty()) {
      throw new PublishValidationError('Body must not be empty');
    }

    if (!SLUG_REGEX.test(content.slug.value)) {
      throw new PublishValidationError('Slug is invalid');
    }

    if (content.seoMetadata.description.trim() === '') {
      throw new PublishValidationError('SEO description is required');
    }

    if (content.seoMetadata.description.length > 160) {
      throw new PublishValidationError(
        'SEO description must be 160 characters or fewer',
      );
    }
  }
}
