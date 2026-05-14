import { describe, expect, it } from 'vitest';

import { InvalidRichTextBodyError, RichTextBody } from './rich-text-body.vo';

describe('RichTextBody', () => {
  it('create() accepts structured ProseMirror JSON', () => {
    const nodes = { type: 'doc', content: [{ type: 'paragraph' }] };

    expect(RichTextBody.create(nodes).nodes).toBe(nodes);
  });

  it('create() accepts empty object', () => {
    expect(RichTextBody.create({}).nodes).toEqual({});
  });

  it('create() throws for null', () => {
    expect(() => RichTextBody.create(null as never)).toThrow(
      InvalidRichTextBodyError,
    );
  });

  it.each(['text', 1, []])('create() throws for invalid value', (value) => {
    expect(() => RichTextBody.create(value as never)).toThrow(
      InvalidRichTextBodyError,
    );
  });

  it('isEmpty() true for empty object', () => {
    expect(RichTextBody.create({}).isEmpty()).toBe(true);
  });

  it('isEmpty() false for populated document', () => {
    expect(
      RichTextBody.create({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }).isEmpty(),
    ).toBe(false);
  });

  it('equals() compares nodes structurally', () => {
    expect(RichTextBody.create({ type: 'doc' }).equals(RichTextBody.create({ type: 'doc' }))).toBe(true);
    expect(RichTextBody.create({ type: 'doc' }).equals(RichTextBody.create({ type: 'other' }))).toBe(false);
  });
});
