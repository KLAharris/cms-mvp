import { Role } from '../../../domain/role';

export type DeactivateUserCommand = {
  userId: string;
};

// Exposed as POST /api/admin/users/{id}/deactivate (not PATCH)
// Admin only
export interface DeactivateUserUseCase {
  execute(cmd: DeactivateUserCommand, actorId: string, actorRole: Role, actorIp?: string): Promise<void>;
}
