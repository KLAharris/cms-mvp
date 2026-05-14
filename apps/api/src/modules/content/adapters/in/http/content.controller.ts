import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import {
  AuthenticatedUser,
  JwtAuthGuard,
} from '../../../../../shared/guards/jwt-auth.guard';
import { ContentType } from '../../../domain/value-objects/content-type.vo';
import { ContentStatus } from '../../../domain/value-objects/content-status.vo';
import { CreateContentUseCase } from '../../../application/ports/in/create-content.port';
import { DeleteContentUseCase } from '../../../application/ports/in/delete-content.port';
import { GetContentUseCase } from '../../../application/ports/in/get-content.port';
import { ListContentUseCase } from '../../../application/ports/in/list-content.port';
import { ListVersionsUseCase } from '../../../application/ports/in/list-versions.port';
import { PublishContentUseCase } from '../../../application/ports/in/publish-content.port';
import { RevertContentUseCase } from '../../../application/ports/in/revert-content.port';
import { ScheduleContentUseCase } from '../../../application/ports/in/schedule-content.port';
import { SubmitForReviewUseCase } from '../../../application/ports/in/submit-for-review.port';
import { UnpublishContentUseCase } from '../../../application/ports/in/unpublish-content.port';
import { UpdateContentUseCase } from '../../../application/ports/in/update-content.port';
import { ContentDomainExceptionFilter } from './content-domain-exception.filter';
import { CreateContentRequestSchema } from './dto/create-content.request';
import { ScheduleContentRequestSchema } from './dto/schedule-content.request';
import { UpdateContentRequestSchema } from './dto/update-content.request';
import { ContentHttpMapper } from './mappers/content-http.mapper';

const listQuerySchema = z.object({
  status: z.nativeEnum(ContentStatus).optional(),
  type: z.nativeEnum(ContentType).optional(),
  authorId: z.string().optional(),
  tag: z.string().optional(),
  titleSearch: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().optional(),
  pageSize: z.coerce.number().int().optional(),
});

@Controller('api/admin/content')
@UseGuards(JwtAuthGuard)
@UseFilters(ContentDomainExceptionFilter)
export class ContentController {
  constructor(
    @Inject('CREATE_CONTENT_USE_CASE')
    private readonly createContent: CreateContentUseCase,
    @Inject('UPDATE_CONTENT_USE_CASE')
    private readonly updateContent: UpdateContentUseCase,
    @Inject('SUBMIT_FOR_REVIEW_USE_CASE')
    private readonly submitForReview: SubmitForReviewUseCase,
    @Inject('PUBLISH_CONTENT_USE_CASE')
    private readonly publishContent: PublishContentUseCase,
    @Inject('UNPUBLISH_CONTENT_USE_CASE')
    private readonly unpublishContent: UnpublishContentUseCase,
    @Inject('SCHEDULE_CONTENT_USE_CASE')
    private readonly scheduleContent: ScheduleContentUseCase,
    @Inject('DELETE_CONTENT_USE_CASE')
    private readonly deleteContent: DeleteContentUseCase,
    @Inject('LIST_CONTENT_USE_CASE')
    private readonly listContent: ListContentUseCase,
    @Inject('GET_CONTENT_USE_CASE')
    private readonly getContent: GetContentUseCase,
    @Inject('REVERT_CONTENT_USE_CASE')
    private readonly revertContent: RevertContentUseCase,
    @Inject('LIST_VERSIONS_USE_CASE')
    private readonly listVersions: ListVersionsUseCase,
  ) {}

  @Get()
  async list(@Query() query: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.listContent.execute({
      ...parsed.data,
      actorId: user.userId,
      actorRole: this.role(user),
    });

    return {
      data: result.items.map(ContentHttpMapper.toSummary),
      pagination: {
        page: result.page,
        page_size: result.pageSize,
        total: result.total,
        total_pages: result.totalPages,
      },
    };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = CreateContentRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.createContent.execute({
      ...parsed.data,
      actorId: user.userId,
      actorRole: this.role(user),
    });

    return {
      data: {
        id: result.contentId,
        type: parsed.data.type,
        title: parsed.data.title,
        slug: result.slug,
        status: result.status,
      },
    };
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      data: ContentHttpMapper.toDetail(
        await this.getContent.execute({
          contentId: id,
          actorId: user.userId,
          actorRole: this.role(user),
        }),
      ),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = UpdateContentRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    await this.updateContent.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
      title: parsed.data.title,
      slug: parsed.data.slug,
      body: parsed.data.body,
      seoMetadata:
        parsed.data.seoTitle !== undefined || parsed.data.seoDescription !== undefined
          ? {
              title: parsed.data.seoTitle ?? '',
              description: parsed.data.seoDescription ?? '',
            }
          : undefined,
      tags: parsed.data.tags,
      category: parsed.data.category,
      parentId: parsed.data.parentId,
      featuredImageId: parsed.data.featuredImageId,
      socialImageId: parsed.data.socialImageId,
    });

    return this.get(id, user);
  }

  @Post(':id/submit')
  @HttpCode(200)
  async submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.submitForReview.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
    });

    return { data: result };
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.publishContent.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
    });

    return {
      data: {
        ...result,
        publishedAt: result.publishedAt.toISOString(),
      },
    };
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.unpublishContent.execute({
        contentId: id,
        actorId: user.userId,
        actorRole: this.role(user),
      }),
    };
  }

  @Post(':id/schedule')
  @HttpCode(200)
  async schedule(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = ScheduleContentRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.scheduleContent.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
      scheduledAt: parsed.data.scheduledAt,
    });

    return {
      data: {
        ...result,
        scheduledAt: result.scheduledAt.toISOString(),
      },
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteContent.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
    });
  }

  @Get(':id/versions')
  async versions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.listVersions.execute({
      contentId: id,
      actorId: user.userId,
      actorRole: this.role(user),
    });

    return {
      data: result.versions.map((version) => ({
        versionNo: version.versionNo,
        editorId: version.editorId,
        createdAt: version.createdAt.toISOString(),
      })),
    };
  }

  @Post(':id/revert/:versionNo')
  @HttpCode(200)
  async revert(
    @Param('id') id: string,
    @Param('versionNo', ParseIntPipe) versionNo: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.revertContent.execute({
        contentId: id,
        versionNo,
        actorId: user.userId,
        actorRole: this.role(user),
      }),
    };
  }

  private role(user: AuthenticatedUser): string {
    return user.role.toLowerCase();
  }

  private validationError(): BadRequestException {
    return new BadRequestException({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
  }
}
