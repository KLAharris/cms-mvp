export interface DeleteMediaCommand {
  mediaId: string;
  requestedBy: string;
  requestedByRole: 'ADMIN' | 'EDITOR' | 'AUTHOR';
  force?: boolean;
}

export interface DeleteMediaUseCase {
  execute(command: DeleteMediaCommand): Promise<void>;
}
