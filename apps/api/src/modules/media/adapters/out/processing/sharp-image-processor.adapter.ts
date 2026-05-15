import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import type { Readable } from 'stream';

import {
  ImageProcessor,
  VariantResult,
} from '../../../application/ports/out/image-processor.port';
import { MediaVariant, StorageKey } from '../../../domain/value-objects';

const SVG_MIME = 'image/svg+xml';
const RASTER_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const VARIANT_WIDTHS: [MediaVariant.THUMBNAIL | MediaVariant.MEDIUM, number][] = [
  [MediaVariant.THUMBNAIL, 320],
  [MediaVariant.MEDIUM, 1024],
];

export class SharpImageProcessorAdapter implements ImageProcessor {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string,
    private readonly region: string,
  ) {}

  async generateVariants(params: {
    originalStorageKey: string;
    mediaId: string;
    mimeType: string;
  }): Promise<{ variants: VariantResult[]; width?: number; height?: number }> {
    const { originalStorageKey, mimeType } = params;

    if (mimeType === SVG_MIME) {
      return this.sanitizeSvg(originalStorageKey);
    }

    if (RASTER_MIMES.has(mimeType)) {
      return this.generateRasterVariants(originalStorageKey, mimeType);
    }

    return { variants: [] };
  }

  private async downloadToBuffer(key: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks);
  }

  private deriveVariantKey(originalKey: string, variantName: string): StorageKey {
    const lastDot = originalKey.lastIndexOf('.');
    if (lastDot === -1) {
      return StorageKey.create(`${originalKey}-${variantName}`);
    }
    return StorageKey.create(
      `${originalKey.slice(0, lastDot)}-${variantName}${originalKey.slice(lastDot)}`,
    );
  }

  private async generateRasterVariants(
    originalKey: string,
    mimeType: string,
  ): Promise<{ variants: VariantResult[]; width?: number; height?: number }> {
    const buffer = await this.downloadToBuffer(originalKey);
    const { width, height } = await sharp(buffer).metadata();

    const variants: VariantResult[] = [];

    for (const [variant, maxWidth] of VARIANT_WIDTHS) {
      const processed = await sharp(buffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .toBuffer();

      const storageKey = this.deriveVariantKey(originalKey, variant);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey.value,
          Body: processed,
          ContentType: mimeType,
        }),
      );

      variants.push({ variant, storageKey });
    }

    return { variants, width, height };
  }

  private async sanitizeSvg(
    originalKey: string,
  ): Promise<{ variants: VariantResult[]; width?: number; height?: number }> {
    const buffer = await this.downloadToBuffer(originalKey);
    const svgString = buffer.toString('utf-8');

    const sanitized = sanitizeHtml(svgString, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'svg', 'path', 'circle', 'rect', 'line', 'polyline',
        'polygon', 'ellipse', 'g', 'defs', 'use', 'symbol',
        'linearGradient', 'radialGradient', 'stop', 'clipPath',
        'mask', 'filter', 'title', 'desc',
      ],
      allowedAttributes: {
        '*': [
          'class', 'id', 'style', 'fill', 'stroke',
          'stroke-width', 'transform', 'd', 'cx', 'cy',
          'r', 'x', 'y', 'width', 'height', 'viewBox',
          'xmlns', 'preserveAspectRatio', 'opacity',
          'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
          'gradientUnits', 'gradientTransform',
          'offset', 'stop-color', 'stop-opacity',
        ],
      },
      allowedSchemes: ['data'],
    });

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: originalKey,
        Body: Buffer.from(sanitized, 'utf-8'),
        ContentType: 'image/svg+xml',
      }),
    );

    return { variants: [] };
  }
}
