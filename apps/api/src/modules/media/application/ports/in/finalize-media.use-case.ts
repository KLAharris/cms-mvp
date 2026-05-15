export interface FinalizeMediaCommand {
  mediaId: string;
  requestedBy: string;
  requestedByRole: 'ADMIN' | 'EDITOR' | 'AUTHOR';
}

export interface FinalizeMediaUseCase {
  execute(command: FinalizeMediaCommand): Promise<void>;
}
