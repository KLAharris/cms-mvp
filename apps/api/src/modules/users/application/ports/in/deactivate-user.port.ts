import { Role } from '../../../domain/role';

export type DeactivateUserCommand = {
  userId: string;
};

export interface DeactivateUserUseCase {
  execute(cmd: DeactivateUserCommand, actorId: string, actorRole: Role): Promise<void>;
}
