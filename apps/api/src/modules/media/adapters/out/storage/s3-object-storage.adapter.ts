import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  ObjectStorage,
  PresignedUpload,
  SignedDownloadUrl,
} from '../../../application/ports/out';

export interface S3ObjectStorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

export class S3ObjectStorageAdapter implements ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3ObjectStorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }

  async presignUpload(params: {
    storageKey: string;
    mimeType: string;
    maxBytes: number;
    ttlSeconds: number;
  }): Promise<PresignedUpload> {
    void params.maxBytes;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: params.storageKey,
      ContentType: params.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: params.ttlSeconds,
    });

    return {
      uploadUrl,
      storageKey: params.storageKey,
      expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
    };
  }

  async getSignedUrl(params: {
    storageKey: string;
    ttlSeconds: number;
  }): Promise<SignedDownloadUrl> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: params.storageKey,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: params.ttlSeconds,
    });

    return {
      url,
      expiresAt: new Date(Date.now() + params.ttlSeconds * 1000),
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
      }),
    );
  }
}
