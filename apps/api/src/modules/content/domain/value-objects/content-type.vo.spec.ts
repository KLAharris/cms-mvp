import { describe, expect, it } from 'vitest';

import { ContentType } from './content-type.vo';

describe('ContentType', () => {
  it('contains expected content types', () => {
    expect(ContentType).toEqual({
      Article: 'article',
      Page: 'page',
    });
  });
});
