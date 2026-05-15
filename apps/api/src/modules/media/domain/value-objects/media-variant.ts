export enum MediaVariant {
  ORIGINAL = 'original',
  THUMBNAIL = 'thumbnail',
  MEDIUM = 'medium',
}

export const MAX_WIDTH: Record<MediaVariant.THUMBNAIL | MediaVariant.MEDIUM, number> = {
  [MediaVariant.THUMBNAIL]: 320,
  [MediaVariant.MEDIUM]: 1024,
};
