import { ContentVersion } from '../../../domain/entities/content-version.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';

export interface ContentVersionRepository {
  save(version: ContentVersion): Promise<void>;
  findByContentId(contentId: ContentId): Promise<ContentVersion[]>;
  findByVersionNo(
    contentId: ContentId,
    versionNo: number,
  ): Promise<ContentVersion | null>;
  nextVersionNo(contentId: ContentId): Promise<number>;
}
