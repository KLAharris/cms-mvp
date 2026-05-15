export interface PresignUploadCommand {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
}

export interface PresignUploadResult {
  mediaId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
}

export interface PresignUploadUseCase {
  execute(command: PresignUploadCommand): Promise<PresignUploadResult>;
}
