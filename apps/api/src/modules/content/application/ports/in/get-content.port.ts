import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { ContentType } from '../../../domain/value-objects/content-type.vo';

export interface GetContentUseCase {
  execute(command: GetContentCommand): Promise<GetContentResult>;
}

export type GetContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
};

export type GetContentResult = {
  contentId: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  authorId: string;
  body: object | null;
  featuredImageId: string | null;
  socialImageId: string | null;
  seoMetadata: {
    title: string;
    description: string;
  };
  tags: string[];
  category: string | null;
  parentId: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
