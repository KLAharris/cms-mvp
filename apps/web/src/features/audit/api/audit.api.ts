import { api } from '../../../shared/api/api';
import type { AuditEvent } from '../../content/types/content.types';

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
}

export async function getAuditEvents(params: {
  page?: number;
  pageSize?: number;
}): Promise<AuditListResponse> {
  const response = await api.get<AuditListResponse>('/api/admin/audit', { params });
  return response.data;
}
