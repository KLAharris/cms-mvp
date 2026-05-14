export type ContentSummaryResponse = {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  authorId: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type ContentDetailResponse = ContentSummaryResponse & {
  body: object | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  category: string | null;
  parentId: string | null;
  featuredImageId: string | null;
  socialImageId: string | null;
  scheduledAt: string | null;
  createdAt: string;
};
