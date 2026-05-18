import { Module } from '@nestjs/common';

import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AUDIT_PORT } from './audit.tokens';
import { AuditController } from './adapters/in/http/audit.controller';
import { AuditLoggerAdapter } from './adapters/out/persistence/audit-logger.adapter';
import { PrismaAuditRepository } from './adapters/out/persistence/prisma-audit.repository';
import { AuditPort } from './domain';
import { ExportAuditCsvUseCase, ListAuditEventsUseCase, WriteAuditEventUseCase } from './application/use-cases';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AuditController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    {
      provide: AUDIT_PORT,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): AuditPort => new PrismaAuditRepository(prisma),
    },
    {
      provide: 'AUDIT_LOGGER',
      inject: [AUDIT_PORT],
      useFactory: (audit: AuditPort): AuditLoggerAdapter => new AuditLoggerAdapter(audit),
    },
    {
      provide: 'WRITE_AUDIT_EVENT_USE_CASE',
      inject: [AUDIT_PORT],
      useFactory: (audit: AuditPort): WriteAuditEventUseCase => new WriteAuditEventUseCase(audit),
    },
    {
      provide: 'LIST_AUDIT_EVENTS_USE_CASE',
      inject: [AUDIT_PORT],
      useFactory: (audit: AuditPort): ListAuditEventsUseCase => new ListAuditEventsUseCase(audit),
    },
    {
      provide: 'EXPORT_AUDIT_CSV_USE_CASE',
      inject: [AUDIT_PORT],
      useFactory: (audit: AuditPort): ExportAuditCsvUseCase => new ExportAuditCsvUseCase(audit),
    },
  ],
  exports: [AUDIT_PORT, 'AUDIT_LOGGER', 'WRITE_AUDIT_EVENT_USE_CASE'],
})
export class AuditModule {}
