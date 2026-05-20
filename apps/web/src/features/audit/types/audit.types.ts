export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorIp: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
}

export interface AuditListParams {
  actorId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}
