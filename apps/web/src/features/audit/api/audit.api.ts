import { api } from '../../../shared/api/api';
import type { AuditEvent, AuditListParams, AuditListResponse } from '../types/audit.types';

type AuditEnvelope = {
  data: AuditEvent[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

export async function listAuditEvents(params?: AuditListParams): Promise<AuditListResponse> {
  const response = await api.get<AuditEnvelope>('/api/admin/audit', { params });
  return {
    items: response.data.data,
    total: response.data.pagination.total,
    page: response.data.pagination.page,
    pageSize: response.data.pagination.page_size,
  };
}

export function getAuditExportUrl(): string {
  return '/api/admin/audit/export';
}
