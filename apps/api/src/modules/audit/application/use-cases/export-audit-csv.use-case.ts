import { AuditEvent, AuditFilters, AuditPort } from '../../domain';
import { AuditForbiddenError } from './list-audit-events.use-case';

export type ExportAuditCsvCommand = AuditFilters & {
  actorRole: string;
};

export class ExportAuditCsvUseCase {
  constructor(private readonly audit: AuditPort) {}

  async execute(command: ExportAuditCsvCommand): Promise<string> {
    if (command.actorRole.toUpperCase() !== 'ADMIN') {
      throw new AuditForbiddenError();
    }

    const result = await this.audit.findMany(command, {
      page: 1,
      pageSize: 100_000,
    });

    return toCsv(result.data);
  }
}

function toCsv(events: AuditEvent[]): string {
  const rows = [
    ['id', 'timestamp', 'actorId', 'actorIp', 'action', 'targetType', 'targetId', 'summary'],
    ...events.map((event) => [
      event.id,
      event.timestamp.toISOString(),
      event.actorId ?? '',
      event.actorIp,
      event.action,
      event.targetType,
      event.targetId ?? '',
      JSON.stringify(event.summary),
    ]),
  ];

  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
