import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface UpdateContentUseCase {
  execute(command: UpdateContentCommand): Promise<UpdateContentResult>;
}

export type UpdateContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
  title?: string;
  slug?: string;
  body?: object | null;
  seoMetadata?: {
    title: string;
    description: string;
  };
  tags?: string[];
  category?: string | null;
  parentId?: string | null;
  featuredImageId?: string | null;
  socialImageId?: string | null;
};

export type UpdateContentResult = {
  contentId: string;
  status: ContentStatus;
  updatedAt: Date;
};
