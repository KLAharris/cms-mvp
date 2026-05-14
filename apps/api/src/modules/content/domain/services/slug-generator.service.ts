import { Slug } from '../value-objects/slug.vo';

export class SlugGeneratorService {
  static fromTitle(title: string): Slug {
    return Slug.fromTitle(title);
  }
}
