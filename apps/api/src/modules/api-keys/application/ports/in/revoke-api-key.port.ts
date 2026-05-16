export interface RevokeApiKeyCommand {
  id: string;
  revokedById: string;
}

export interface IRevokeApiKey {
  execute(command: RevokeApiKeyCommand): Promise<void>;
}
