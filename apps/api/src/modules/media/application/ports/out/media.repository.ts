import { PagedResult } from '../../../../../shared/kernel/paged-result';

import { MediaItem } from '../../../domain/entities';
import { MediaId } from '../../../domain/value-objects';

export interface FindMediaQuery {
  search?: string;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}

export interface MediaRepository {
  save(media: MediaItem): Promise<void>;
  findById(id: MediaId): Promise<MediaItem | null>;
  findAll(query: FindMediaQuery): Promise<PagedResult<MediaItem>>;
  delete(id: MediaId): Promise<void>;
  countReferences(id: MediaId): Promise<number>;
}
