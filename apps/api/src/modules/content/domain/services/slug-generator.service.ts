import { Slug } from '../value-objects/slug.vo';

export const SlugGeneratorService = {
  fromTitle(title: string): Slug {
    return Slug.fromTitle(title);
  },
};
