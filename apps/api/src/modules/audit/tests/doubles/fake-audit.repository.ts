import {
  AuditEvent,
  AuditFilters,
  AuditPort,
  PaginatedResult,
  Pagination,
} from '../../domain';

export class FakeAuditRepository implements AuditPort {
  readonly events: AuditEvent[] = [];

  save(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  findMany(
    filters: AuditFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<AuditEvent>> {
    const filtered = this.events.filter((event) => {
      if (filters.actorId !== undefined && event.actorId !== filters.actorId) return false;
      if (filters.action !== undefined && event.action !== filters.action) return false;
      if (filters.targetType !== undefined && event.targetType !== filters.targetType) return false;
      if (filters.dateFrom !== undefined && event.timestamp < filters.dateFrom) return false;
      if (filters.dateTo !== undefined && event.timestamp > filters.dateTo) return false;
      return true;
    });
    const start = (pagination.page - 1) * pagination.pageSize;
    const data = filtered.slice(start, start + pagination.pageSize);

    return Promise.resolve({
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pagination.pageSize),
      },
    });
  }
}
