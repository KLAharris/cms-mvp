import {
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../../shared/decorators/roles.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../shared/guards/roles.guard';
import { AuditAction } from '../../../domain';
import {
  AuditForbiddenError,
  ExportAuditCsvUseCase,
  ListAuditEventsUseCase,
} from '../../../application/use-cases';

const auditQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  targetType: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

@Controller('api/admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(
    @Inject('LIST_AUDIT_EVENTS_USE_CASE')
    private readonly listAuditEvents: ListAuditEventsUseCase,
    @Inject('EXPORT_AUDIT_CSV_USE_CASE')
    private readonly exportAuditCsv: ExportAuditCsvUseCase,
  ) {}

  @Get()
  async list(@Query() query: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = auditQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw this.validationError();
    }

    try {
      const result = await this.listAuditEvents.execute({
        ...parsed.data,
        actorRole: user.role,
      });

      return {
        data: result.data.map((event) => ({
          id: event.id,
          timestamp: event.timestamp.toISOString(),
          actorId: event.actorId,
          actorIp: event.actorIp,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          summary: event.summary,
        })),
        pagination: result.pagination,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit.csv"')
  async export(@Query() query: unknown, @CurrentUser() user: AuthenticatedUser): Promise<string> {
    const parsed = auditQuerySchema.omit({ page: true, pageSize: true }).safeParse(query);
    if (!parsed.success) {
      throw this.validationError();
    }

    try {
      return await this.exportAuditCsv.execute({
        ...parsed.data,
        actorRole: user.role,
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private validationError(): HttpException {
    return new HttpException(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid query' } },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private mapError(error: unknown): HttpException {
    if (error instanceof AuditForbiddenError) {
      return new HttpException(
        { error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        HttpStatus.FORBIDDEN,
      );
    }

    return new HttpException(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal error' } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
