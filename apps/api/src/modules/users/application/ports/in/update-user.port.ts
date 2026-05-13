import { Role } from '../../../domain/role';
import { UserDto } from './list-users.port';

export type UpdateUserCommand = {
  userId: string;
  name?: string;
  role?: Role;
};

export interface UpdateUserUseCase {
  execute(cmd: UpdateUserCommand, actorId: string, actorRole: Role): Promise<UserDto>;
}
