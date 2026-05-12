import { Role } from '../../../domain/role';

export type LoginCommand = {
  email: string;
  password: string;
  actorIp: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
};

export interface LoginUseCase {
  execute(command: LoginCommand): Promise<LoginResult>;
}
