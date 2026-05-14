export interface GetContentUseCase {
  execute(command: GetContentCommand): Promise<GetContentResult>;
}

export type GetContentCommand = {
  contentId: string;
};

export type GetContentResult = {
  contentId: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  body: object | null;
  updatedAt: Date;
};
