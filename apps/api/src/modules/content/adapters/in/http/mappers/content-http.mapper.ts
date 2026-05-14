import { ContentListItem } from '../../../../application/ports/in/list-content.port';
import { GetContentResult } from '../../../../application/ports/in/get-content.port';
import {
  ContentDetailResponse,
  ContentSummaryResponse,
} from '../dto/content.response';

export class ContentHttpMapper {
  static toSummary(item: ContentListItem): ContentSummaryResponse {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      slug: item.slug,
      status: item.status,
      authorId: item.authorId,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  static toDetail(item: GetContentResult): ContentDetailResponse {
    return {
      id: item.contentId,
      type: item.type,
      title: item.title,
      slug: item.slug,
      status: item.status,
      authorId: item.authorId,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
      body: item.body,
      seoTitle: item.seoMetadata.title,
      seoDescription: item.seoMetadata.description,
      tags: item.tags,
      category: item.category,
      parentId: item.parentId,
      featuredImageId: item.featuredImageId,
      socialImageId: item.socialImageId,
      scheduledAt: item.scheduledAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
