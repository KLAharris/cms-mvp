export type ContentStatus = 'draft' | 'in_review' | 'published' | 'unpublished' | 'archived';
export type ContentType = 'article' | 'page';

export interface ContentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface ContentSeo {
  metaTitle?: string;
  metaDescription?: string;
  socialImageUrl?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  authorId: string;
  author?: ContentAuthor;
  body?: unknown;
  tags: string[];
  category?: string;
  seo?: ContentSeo;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentListParams {
  type?: ContentType;
  titleSearch?: string;
  status?: ContentStatus;
  mine?: boolean;
  lastDays?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContentCreateResult {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
}
