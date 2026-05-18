import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import {
  AuditAction,
  AuditEvent,
  AuditFilters,
  AuditPort,
  PaginatedResult,
  Pagination,
} from '../../../domain';

@Injectable()
export class PrismaAuditRepository implements AuditPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: AuditEvent): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        id: event.id,
        occurredAt: event.timestamp,
        actorId: event.actorId,
        actorIp: event.actorIp,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        summary: event.summary as Prisma.InputJsonObject,
      },
    });
  }

  async findMany(
    filters: AuditFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<AuditEvent>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(1000, Math.max(1, pagination.pageSize));
    const where = this.where(filters);
    const [rows, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      data: rows.map((row) =>
        AuditEvent.rehydrate({
          id: row.id,
          timestamp: row.occurredAt,
          actorId: row.actorId,
          actorIp: row.actorIp,
          action: row.action as AuditAction,
          targetType: row.targetType,
          targetId: row.targetId,
          summary: asSummary(row.summary),
        }),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private where(filters: AuditFilters): Prisma.AuditEventWhereInput {
    return {
      actorId: filters.actorId,
      action: filters.action,
      targetType: filters.targetType,
      occurredAt:
        filters.dateFrom !== undefined || filters.dateTo !== undefined
          ? {
              gte: filters.dateFrom,
              lte: filters.dateTo,
            }
          : undefined,
    };
  }
}

function asSummary(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }

  return { value };
}
