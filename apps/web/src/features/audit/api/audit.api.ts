import { api } from '../../../shared/api/api';
import type { AuditListParams, AuditListResponse } from '../types/audit.types';

export async function listAuditEvents(params?: AuditListParams): Promise<AuditListResponse> {
  const response = await api.get<AuditListResponse>('/api/admin/audit', { params });
  return response.data;
}

export function getAuditExportUrl(): string {
  return '/api/admin/audit/export';
}
