import { Role } from '../../../../auth/domain/role';

export type InviteUserCommand = {
  email: string;
  name: string;
  role: Role;
};

export interface InviteUserUseCase {
  execute(cmd: InviteUserCommand, actorId: string, actorRole: Role): Promise<void>;
}
