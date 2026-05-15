import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { BullMQJobEnqueuer } from '../../shared/adapters/bullmq-job-enqueuer.adapter';
import { InProcessEventPublisher } from '../../shared/adapters/in-process-event-publisher.adapter';
import { UuidV4Generator } from '../../shared/adapters/uuid-v4-generator.adapter';
import { CLOCK, Clock } from '../../shared/ports/clock.port';
import { DOMAIN_EVENT_PUBLISHER, DomainEventPublisher } from '../../shared/ports/event-publisher.port';
import { ID_GENERATOR, IdGenerator } from '../../shared/ports/id-generator.port';
import { JOB_ENQUEUER, JobEnqueuer } from '../../shared/ports/job-enqueuer.port';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SystemClock } from '../auth/adapters/out/system-clock.adapter';
import {
  ContentMediaRefAdapter,
  PrismaMediaRepository,
} from './adapters/out/persistence';
import { SharpImageProcessorAdapter } from './adapters/out/processing';
import { S3ObjectStorageAdapter } from './adapters/out/storage';
import {
  DeleteMediaUseCase,
  FinalizeMediaUseCase,
  GenerateMediaVariantsUseCase,
  ListMediaUseCase,
  MAX_UPLOAD_BYTES,
  PRESIGN_TTL_SECONDS,
  PresignUploadUseCase,
  UpdateMediaMetadataUseCase,
} from './application/use-cases';
import {
  ImageProcessor,
  MediaReferenceChecker,
  MediaRepository,
  ObjectStorage,
} from './application/ports/out';

export const MEDIA_REPOSITORY = Symbol('MediaRepository');
export const MEDIA_REFERENCE_CHECKER = Symbol('MediaReferenceChecker');
export const OBJECT_STORAGE = Symbol('ObjectStorage');
export const IMAGE_PROCESSOR = Symbol('ImageProcessor');

function redisConnectionFromUrl(redisUrl: string): { host: string; port: number } {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
  };
}

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: MEDIA_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): MediaRepository =>
        new PrismaMediaRepository(prisma),
    },
    {
      provide: MEDIA_REFERENCE_CHECKER,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): MediaReferenceChecker =>
        new ContentMediaRefAdapter(prisma),
    },
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService): S3Client =>
        new S3Client({
          endpoint: config.getOrThrow<string>('OBJECT_STORAGE_ENDPOINT'),
          region: config.getOrThrow<string>('OBJECT_STORAGE_REGION'),
          credentials: {
            accessKeyId: config.getOrThrow<string>('OBJECT_STORAGE_ACCESS_KEY'),
            secretAccessKey: config.getOrThrow<string>('OBJECT_STORAGE_SECRET_KEY'),
          },
          forcePathStyle: true,
        }),
    },
    {
      provide: OBJECT_STORAGE,
      inject: ['S3_CLIENT', ConfigService],
      useFactory: (s3: S3Client, config: ConfigService): ObjectStorage =>
        new S3ObjectStorageAdapter(
          s3,
          config.getOrThrow<string>('OBJECT_STORAGE_BUCKET'),
          config.getOrThrow<string>('OBJECT_STORAGE_PUBLIC_URL'),
        ),
    },
    {
      provide: JOB_ENQUEUER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JobEnqueuer =>
        new BullMQJobEnqueuer(
          redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
        ),
    },
    { provide: ID_GENERATOR, useClass: UuidV4Generator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: InProcessEventPublisher },
    {
      provide: IMAGE_PROCESSOR,
      inject: ['S3_CLIENT', ConfigService],
      useFactory: (s3: S3Client, config: ConfigService): ImageProcessor =>
        new SharpImageProcessorAdapter(
          s3,
          config.getOrThrow<string>('OBJECT_STORAGE_BUCKET'),
          config.getOrThrow<string>('OBJECT_STORAGE_REGION'),
        ),
    },
    {
      provide: MAX_UPLOAD_BYTES,
      inject: [ConfigService],
      useFactory: (config: ConfigService): number =>
        config.getOrThrow<number>('MAX_UPLOAD_BYTES'),
    },
    {
      provide: PRESIGN_TTL_SECONDS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): number =>
        config.getOrThrow<number>('PRESIGN_TTL_SECONDS'),
    },
    {
      provide: 'LIST_MEDIA_USE_CASE',
      inject: [MEDIA_REPOSITORY],
      useFactory: (media: MediaRepository): ListMediaUseCase =>
        new ListMediaUseCase(media),
    },
    {
      provide: 'UPDATE_MEDIA_METADATA_USE_CASE',
      inject: [MEDIA_REPOSITORY],
      useFactory: (media: MediaRepository): UpdateMediaMetadataUseCase =>
        new UpdateMediaMetadataUseCase(media),
    },
    {
      provide: 'PRESIGN_UPLOAD_USE_CASE',
      inject: [
        MEDIA_REPOSITORY,
        OBJECT_STORAGE,
        ID_GENERATOR,
        CLOCK,
        MAX_UPLOAD_BYTES,
        PRESIGN_TTL_SECONDS,
      ],
      useFactory: (
        media: MediaRepository,
        storage: ObjectStorage,
        ids: IdGenerator,
        clock: Clock,
        maxUploadBytes: number,
        presignTtlSeconds: number,
      ): PresignUploadUseCase =>
        new PresignUploadUseCase(
          media,
          storage,
          ids,
          clock,
          maxUploadBytes,
          presignTtlSeconds,
        ),
    },
    {
      provide: 'FINALIZE_MEDIA_USE_CASE',
      inject: [MEDIA_REPOSITORY, JOB_ENQUEUER],
      useFactory: (
        media: MediaRepository,
        jobs: JobEnqueuer,
      ): FinalizeMediaUseCase => new FinalizeMediaUseCase(media, jobs),
    },
    {
      provide: 'GENERATE_MEDIA_VARIANTS_USE_CASE',
      inject: [MEDIA_REPOSITORY, IMAGE_PROCESSOR, DOMAIN_EVENT_PUBLISHER],
      useFactory: (
        media: MediaRepository,
        images: ImageProcessor,
        events: DomainEventPublisher,
      ): GenerateMediaVariantsUseCase =>
        new GenerateMediaVariantsUseCase(media, images, events),
    },
    {
      provide: 'DELETE_MEDIA_USE_CASE',
      inject: [
        MEDIA_REPOSITORY,
        MEDIA_REFERENCE_CHECKER,
        OBJECT_STORAGE,
        DOMAIN_EVENT_PUBLISHER,
      ],
      useFactory: (
        media: MediaRepository,
        references: MediaReferenceChecker,
        storage: ObjectStorage,
        events: DomainEventPublisher,
      ): DeleteMediaUseCase =>
        new DeleteMediaUseCase(media, references, storage, events),
    },
  ],
  exports: [
    MEDIA_REPOSITORY,
    MEDIA_REFERENCE_CHECKER,
    OBJECT_STORAGE,
    'LIST_MEDIA_USE_CASE',
    'UPDATE_MEDIA_METADATA_USE_CASE',
    'PRESIGN_UPLOAD_USE_CASE',
    'FINALIZE_MEDIA_USE_CASE',
    'GENERATE_MEDIA_VARIANTS_USE_CASE',
    'DELETE_MEDIA_USE_CASE',
  ],
})
export class MediaModule {}
