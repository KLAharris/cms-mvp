import { Content } from '../../domain/entities/content.entity';
import { ContentStatus } from '../../domain/value-objects/content-status.vo';

export const ContentAccessPolicy = {
  canPublish(role: string): boolean {
    return role === 'admin' || role === 'editor';
  },

  canSchedule(role: string): boolean {
    return role === 'admin' || role === 'editor';
  },

  canDelete(role: string): boolean {
    return role === 'admin';
  },

  canEdit(
    role: string,
    actorId: string,
    contentAuthorId: string,
  ): boolean {
    return (
      role === 'admin' ||
      role === 'editor' ||
      (role === 'author' && actorId === contentAuthorId)
    );
  },

  canView(role: string, actorId: string, content: Content): boolean {
    if (role === 'admin' || role === 'editor') {
      return true;
    }

    if (role !== 'author') {
      return false;
    }

    return (
      actorId === content.authorId || content.status === ContentStatus.Published
    );
  },

  canReject(role: string): boolean {
    return role === 'admin' || role === 'editor';
  },

  canRevert(
    role: string,
    actorId: string,
    contentAuthorId: string,
  ): boolean {
    return ContentAccessPolicy.canEdit(role, actorId, contentAuthorId);
  },
};
