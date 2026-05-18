export interface DeleteContentUseCase {
  execute(command: DeleteContentCommand): Promise<DeleteContentResult>;
}

export type DeleteContentCommand = {
  contentId: string;
  actorId: string;
  actorRole: string;
  actorIp?: string;
};

export type DeleteContentResult = {
  contentId: string;
  deletedAt: Date;
};
