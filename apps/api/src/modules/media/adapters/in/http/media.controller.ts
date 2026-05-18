import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import {
  AuthenticatedUser,
  JwtAuthGuard,
} from '../../../../../shared/guards/jwt-auth.guard';
import { MediaItemDto } from '../../../application/dto';
import {
  DeleteMediaUseCase,
  FinalizeMediaUseCase,
  GetMediaUseCase,
  ListMediaUseCase,
  PresignUploadUseCase,
  UpdateMediaMetadataUseCase,
} from '../../../application/ports/in';
import { ObjectStorage } from '../../../application/ports/out';
import { OBJECT_STORAGE } from '../../../media-tokens';
import { MediaDomainExceptionFilter } from './media-domain-exception.filter';
import {
  FinalizeMediaRequestSchema,
  ListMediaQuerySchema,
  MediaItemResponse,
  PresignUploadRequestSchema,
  PresignUploadResponse,
  UpdateMediaMetadataRequestSchema,
} from './dto';
import { FileTypeValidator } from './file-type-validator';

@Controller()
@UseFilters(MediaDomainExceptionFilter)
export class MediaController {
  private readonly fileTypeValidator = new FileTypeValidator();

  constructor(
    @Inject('PRESIGN_UPLOAD_USE_CASE')
    private readonly presignUpload: PresignUploadUseCase,
    @Inject('FINALIZE_MEDIA_USE_CASE')
    private readonly finalizeMedia: FinalizeMediaUseCase,
    @Inject('LIST_MEDIA_USE_CASE')
    private readonly listMedia: ListMediaUseCase,
    @Inject('UPDATE_MEDIA_METADATA_USE_CASE')
    private readonly updateMediaMetadata: UpdateMediaMetadataUseCase,
    @Inject('DELETE_MEDIA_USE_CASE')
    private readonly deleteMedia: DeleteMediaUseCase,
    @Inject('GET_MEDIA_USE_CASE')
    private readonly getMedia: GetMediaUseCase,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
  ) {}

  @Post('api/admin/media/presign')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async presign(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() actorIp: string,
  ): Promise<PresignUploadResponse> {
    const parsed = PresignUploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    this.fileTypeValidator.validateMimeAndExtension(
      parsed.data.filename,
      parsed.data.mimeType,
    );

    const result = await this.presignUpload.execute({
      filename: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      uploadedBy: user.userId,
      actorIp,
    });

    return {
      mediaId: result.mediaId,
      uploadUrl: result.uploadUrl,
      storageKey: result.storageKey,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @Post('api/admin/media')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  async finalize(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const parsed = FinalizeMediaRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    await this.finalizeMedia.execute({
      mediaId: parsed.data.mediaId,
      requestedBy: user.userId,
      requestedByRole: this.role(user),
    });
  }

  @Get('api/admin/media')
  @UseGuards(JwtAuthGuard)
  async list(@Query() query: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = ListMediaQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.listMedia.execute({
      ...parsed.data,
      requestedBy: user.userId,
    });

    const items = await Promise.all(result.items.map((item) => this.toResponse(item)));

    return {
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Patch('api/admin/media/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaItemResponse> {
    const parsed = UpdateMediaMetadataRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.updateMediaMetadata.execute({
      mediaId: id,
      altText: parsed.data.altText,
      caption: parsed.data.caption,
      requestedBy: user.userId,
      requestedByRole: this.role(user),
    });

    return this.toResponse(result);
  }

  @Delete('api/admin/media/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() actorIp: string,
  ): Promise<void> {
    await this.deleteMedia.execute({
      mediaId: id,
      requestedBy: user.userId,
      requestedByRole: this.role(user),
      actorIp,
      force: force === 'true',
    });
  }

  @Get('api/v1/media/:id')
  async getPublic(@Param('id') id: string): Promise<MediaItemResponse> {
    const result = await this.getMedia.execute({ mediaId: id });
    return this.toResponse(result);
  }

  private role(user: AuthenticatedUser): 'ADMIN' | 'EDITOR' | 'AUTHOR' {
    return user.role.toUpperCase() as 'ADMIN' | 'EDITOR' | 'AUTHOR';
  }

  private async toResponse(dto: MediaItemDto): Promise<MediaItemResponse> {
    const entries = await Promise.all(
      Object.entries(dto.variants).map(async ([variant, storageKey]) => {
        const signed = await this.storage.getSignedUrl({
          storageKey,
          ttlSeconds: 3600,
        });
        return [
          variant,
          { url: signed.url, expiresAt: signed.expiresAt.toISOString() },
        ] as const;
      }),
    );

    return {
      id: dto.id,
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      altText: dto.altText,
      caption: dto.caption,
      uploadedBy: dto.uploadedBy,
      uploadedAt: dto.uploadedAt.toISOString(),
      status: dto.status,
      width: dto.width,
      height: dto.height,
      requiresSanitization: dto.requiresSanitization,
      variants: Object.fromEntries(entries),
    };
  }

  private validationError(): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
  }
}
