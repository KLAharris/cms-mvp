import { ContentStatus } from '../../../domain/value-objects/content-status.vo';

export interface UpdateContentUseCase {
  execute(command: UpdateContentCommand): Promise<UpdateContentResult>;
}

export type UpdateContentCommand = {
  contentId: string;
  actorId: string;
  title?: string;
  body?: object | null;
  seoTitle?: string;
  seoDescription?: string;
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
