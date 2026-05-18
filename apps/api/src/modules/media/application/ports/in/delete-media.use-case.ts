export interface DeleteMediaCommand {
  mediaId: string;
  requestedBy: string;
  requestedByRole: 'ADMIN' | 'EDITOR' | 'AUTHOR';
  actorIp?: string;
  force?: boolean;
}

export interface DeleteMediaUseCase {
  execute(command: DeleteMediaCommand): Promise<void>;
}
