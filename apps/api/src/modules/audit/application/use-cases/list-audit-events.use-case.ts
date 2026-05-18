import { AuditFilters, AuditPort, PaginatedResult, AuditEvent } from '../../domain';

export type ListAuditEventsCommand = AuditFilters & {
  page?: number;
  pageSize?: number;
  actorRole: string;
};

export class AuditForbiddenError extends Error {
  constructor() {
    super('Forbidden');
  }
}

export class ListAuditEventsUseCase {
  constructor(private readonly audit: AuditPort) {}

  async execute(command: ListAuditEventsCommand): Promise<PaginatedResult<AuditEvent>> {
    if (command.actorRole.toUpperCase() !== 'ADMIN') {
      throw new AuditForbiddenError();
    }

    return this.audit.findMany(command, {
      page: command.page ?? 1,
      pageSize: command.pageSize ?? 50,
    });
  }
}
