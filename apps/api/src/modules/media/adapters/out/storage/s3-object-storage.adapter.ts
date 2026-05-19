import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

import {
  ObjectStorage,
  PresignedUpload,
  SignedDownloadUrl,
} from '../../../application/ports/out';

export class S3ObjectStorageAdapter implements ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly publicUrl: string,
  ) {}

  async presignUpload(params: {
    storageKey: string;
    mimeType: string;
    maxBytes: number;
    ttlSeconds: number;
  }): Promise<PresignedUpload> {
    void params.maxBytes;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
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
      Bucket: this.bucket,
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

  async getObjectBytes(storageKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }

    return Buffer.concat(chunks);
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }
}
