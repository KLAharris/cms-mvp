export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
}

export interface SignedDownloadUrl {
  url: string;
  expiresAt: Date;
}

export interface ObjectStorage {
  presignUpload(params: {
    storageKey: string;
    mimeType: string;
    maxBytes: number;
    ttlSeconds: number;
  }): Promise<PresignedUpload>;

  getSignedUrl(params: {
    storageKey: string;
    ttlSeconds: number;
  }): Promise<SignedDownloadUrl>;

  getObjectBytes(storageKey: string): Promise<Buffer>;

  deleteObject(storageKey: string): Promise<void>;
}
