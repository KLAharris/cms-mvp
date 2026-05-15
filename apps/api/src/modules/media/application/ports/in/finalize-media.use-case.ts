export interface FinalizeMediaCommand {
  mediaId: string;
  requestedBy: string;
}

export interface FinalizeMediaUseCase {
  execute(command: FinalizeMediaCommand): Promise<void>;
}
