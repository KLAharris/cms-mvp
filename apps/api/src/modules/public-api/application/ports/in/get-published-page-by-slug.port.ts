import type { PublicPageDetail } from '../../public-content.read-model';

export type GetPublishedPageBySlugQuery = {
  slug: string;
};

export interface GetPublishedPageBySlugUseCase {
  execute(query: GetPublishedPageBySlugQuery): Promise<PublicPageDetail | null>;
}

export const GET_PUBLISHED_PAGE_BY_SLUG = Symbol('GET_PUBLISHED_PAGE_BY_SLUG');
