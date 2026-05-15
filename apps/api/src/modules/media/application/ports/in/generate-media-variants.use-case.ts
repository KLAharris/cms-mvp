export interface GenerateMediaVariantsCommand {
  mediaId: string;
}

export interface GenerateMediaVariantsUseCase {
  execute(command: GenerateMediaVariantsCommand): Promise<void>;
}
