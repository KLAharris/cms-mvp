import { describe, expect, it } from 'vitest';

import { InvalidSeoMetadataError, SeoMetadata } from './seo-metadata.vo';

describe('SeoMetadata', () => {
  it('create() accepts empty strings', () => {
    const metadata = SeoMetadata.create('', '');

    expect(metadata.title).toBe('');
    expect(metadata.description).toBe('');
  });

  it('create() accepts title of exactly 70 chars', () => {
    expect(SeoMetadata.create('a'.repeat(70), '').title).toHaveLength(70);
  });

  it('create() throws for title of 71 chars', () => {
    expect(() => SeoMetadata.create('a'.repeat(71), '')).toThrow(
      InvalidSeoMetadataError,
    );
  });

  it('create() accepts description of exactly 160 chars', () => {
    expect(SeoMetadata.create('', 'a'.repeat(160)).description).toHaveLength(160);
  });

  it('create() throws for description of 161 chars', () => {
    expect(() => SeoMetadata.create('', 'a'.repeat(161))).toThrow(
      InvalidSeoMetadataError,
    );
  });

  it('equals() true when both fields match, false if either differs', () => {
    const metadata = SeoMetadata.create('title', 'description');

    expect(metadata.equals(SeoMetadata.create('title', 'description'))).toBe(true);
    expect(metadata.equals(SeoMetadata.create('other', 'description'))).toBe(false);
    expect(metadata.equals(SeoMetadata.create('title', 'other'))).toBe(false);
  });
});
