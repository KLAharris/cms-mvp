export const CacheKeys = {
  articleList: (page: number, pageSize: number) =>
    `public:articles:page:${String(page)}:size:${String(pageSize)}`,
  articleBySlug: (slug: string) => `public:articles:slug:${slug}`,
  pageList: (page: number, pageSize: number) =>
    `public:pages:page:${String(page)}:size:${String(pageSize)}`,
  pageBySlug: (slug: string) => `public:pages:slug:${slug}`,
  articleListPattern: () => 'public:articles:page:*',
  pageListPattern: () => 'public:pages:page:*',
} as const;

export const CacheTtl = {
  LIST_SECONDS: 300,
  DETAIL_SECONDS: 600,
} as const;
