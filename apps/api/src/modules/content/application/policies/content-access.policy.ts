import { Content } from '../../domain/entities/content.entity';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';

export class ContentAccessPolicy {
  static canPublish(role: string): boolean {
    return role === 'admin' || role === 'editor';
  }

  static canSchedule(role: string): boolean {
    return role === 'admin' || role === 'editor';
  }

  static canDelete(role: string): boolean {
    return role === 'admin' || role === 'editor';
  }

  static canEdit(
    role: string,
    actorId: string,
    contentAuthorId: string,
  ): boolean {
    return (
      role === 'admin' ||
      role === 'editor' ||
      (role === 'author' && actorId === contentAuthorId)
    );
  }

  static canView(role: string, actorId: string, content: Content): boolean {
    if (role === 'admin' || role === 'editor') {
      return true;
    }

    if (role !== 'author') {
      return false;
    }

    return (
      actorId === content.authorId || content.status === ContentStatus.Published
    );
  }

  static canReject(role: string): boolean {
    return role === 'admin' || role === 'editor';
  }

  static canRevert(
    role: string,
    actorId: string,
    contentAuthorId: string,
  ): boolean {
    return ContentAccessPolicy.canEdit(role, actorId, contentAuthorId);
  }
}
