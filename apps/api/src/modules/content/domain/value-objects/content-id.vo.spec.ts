import { describe, expect, it } from 'vitest';

import { ContentId, InvalidContentIdError } from './content-id.vo';

describe('ContentId', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';

  it('create() accepts UUID v4', () => {
    expect(ContentId.create(uuid).value).toBe(uuid);
  });

  it('create() rejects empty and non-v4 ids', () => {
    expect(() => ContentId.create('')).toThrow(InvalidContentIdError);
    expect(() => ContentId.create('123e4567-e89b-12d3-a456-426614174000')).toThrow(
      InvalidContentIdError,
    );
  });

  it('generate() uses the id generator and wraps the value', () => {
    expect(ContentId.generate({ generate: () => uuid }).value).toBe(uuid);
  });

  it('equals() compares values', () => {
    expect(ContentId.create(uuid).equals(ContentId.create(uuid))).toBe(true);
    expect(
      ContentId.create(uuid).equals(
        ContentId.create('223e4567-e89b-42d3-a456-426614174000'),
      ),
    ).toBe(false);
  });
});
