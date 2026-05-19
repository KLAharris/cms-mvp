export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: AuditActor;
  actorName: string;
  targetType: string;
  targetTitle: string;
  summary: string;
  createdAt: string;
}

export interface AuditListParams {
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}
