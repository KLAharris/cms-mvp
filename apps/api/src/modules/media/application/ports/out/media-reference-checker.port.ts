import { MediaId } from '../../../domain/value-objects';

export interface MediaReferenceChecker {
  countReferences(mediaId: MediaId): Promise<number>;
}
