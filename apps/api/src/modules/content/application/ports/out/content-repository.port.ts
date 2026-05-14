import { Content } from '../../../domain/entities/content.entity';
import { ContentId } from '../../../domain/value-objects/content-id.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { Slug } from '../../../domain/value-objects/slug.vo';

export interface ContentRepository {
  save(content: Content): Promise<void>;
  findById(id: ContentId): Promise<Content | null>;
  findBySlug(type: ContentType, slug: Slug): Promise<Content | null>;
  findMany(criteria: ContentSearchCriteria): Promise<PagedResult<Content>>;
  delete(id: ContentId): Promise<void>;
}

export type ContentSearchCriteria = {
  status?: ContentStatus;
  type?: ContentType;
  authorId?: string;
  tag?: string;
  titleSearch?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
