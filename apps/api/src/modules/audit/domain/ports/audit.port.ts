import { AuditAction, AuditEvent } from '../entities/audit-event';

export type AuditFilters = {
  actorId?: string;
  action?: AuditAction;
  targetType?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type Pagination = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export interface AuditPort {
  save(event: AuditEvent): Promise<void>;
  findMany(filters: AuditFilters, pagination: Pagination): Promise<PaginatedResult<AuditEvent>>;
}
