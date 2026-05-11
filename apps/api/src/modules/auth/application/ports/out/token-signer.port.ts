import { Role } from '../../../domain/role';

export type AccessTokenPayload = {
  userId: string;
  role: Role;
};

export type RefreshTokenPayload = {
  userId: string;
};

export interface TokenSigner {
  signAccessToken(payload: AccessTokenPayload): Promise<string>;
  signRefreshToken(payload: RefreshTokenPayload): Promise<string>;
}
