import { randomUUID } from 'crypto';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  CONTENT_CREATED = 'CONTENT_CREATED',
  CONTENT_UPDATED = 'CONTENT_UPDATED',
  CONTENT_STATUS_CHANGED = 'CONTENT_STATUS_CHANGED',
  CONTENT_DELETED = 'CONTENT_DELETED',
  MEDIA_UPLOADED = 'MEDIA_UPLOADED',
  MEDIA_DELETED = 'MEDIA_DELETED',
}

export type AuditSummary = Record<string, unknown>;

export type AuditEventProps = {
  id: string;
  timestamp: Date;
  actorId: string | null;
  actorIp: string;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  summary: AuditSummary;
};

export class AuditEvent {
  private constructor(private readonly props: AuditEventProps) {}

  static create(params: Omit<AuditEventProps, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: Date;
  }): AuditEvent {
    if (params.actorIp.trim() === '') {
      throw new Error('actorIp is required');
    }

    if (params.targetType.trim() === '') {
      throw new Error('targetType is required');
    }

    return new AuditEvent({
      id: params.id ?? randomUUID(),
      timestamp: params.timestamp ?? new Date(),
      actorId: params.actorId,
      actorIp: params.actorIp,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      summary: params.summary,
    });
  }

  static rehydrate(props: AuditEventProps): AuditEvent {
    return new AuditEvent({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get actorId(): string | null {
    return this.props.actorId;
  }

  get actorIp(): string {
    return this.props.actorIp;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get targetType(): string {
    return this.props.targetType;
  }

  get targetId(): string | null {
    return this.props.targetId;
  }

  get summary(): AuditSummary {
    return this.props.summary;
  }
}
