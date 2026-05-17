import type { PublicArticleDetail } from '../../public-content.read-model';

export type GetPublishedArticleBySlugQuery = {
  slug: string;
};

export interface GetPublishedArticleBySlugUseCase {
  execute(query: GetPublishedArticleBySlugQuery): Promise<PublicArticleDetail | null>;
}

export const GET_PUBLISHED_ARTICLE_BY_SLUG = Symbol(
  'GET_PUBLISHED_ARTICLE_BY_SLUG',
);
