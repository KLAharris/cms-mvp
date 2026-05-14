import { describe, expect, it } from 'vitest';

import { InvalidSlugError } from '../value-objects/slug.vo';
import { SlugGeneratorService } from './slug-generator.service';

describe('SlugGeneratorService', () => {
  it.each([
    ['My First Article!', 'my-first-article'],
    ['Hello World 2024', 'hello-world-2024'],
    ['  Leading spaces  ', 'leading-spaces'],
    ['Multiple   spaces', 'multiple-spaces'],
    ['Special @#$% chars', 'special-chars'],
    ['Already-a-Slug', 'already-a-slug'],
  ])('fromTitle(%s) returns %s', (title, expected) => {
    expect(SlugGeneratorService.fromTitle(title).value).toBe(expected);
  });

  it.each(['', '!@#$'])('throws InvalidSlugError for %s', (title) => {
    expect(() => SlugGeneratorService.fromTitle(title)).toThrow(InvalidSlugError);
  });
});
