import { Role } from '../../../domain/role';

export type AccessTokenPayload = {
  userId: string;
  role?: Role;
};

export type RefreshTokenPayload = {
  userId: string;
};

export type SignedToken = {
  token: string;
  jti: string;
};

export interface TokenSigner {
  signAccessToken(payload: AccessTokenPayload): Promise<SignedToken>;
  signRefreshToken(payload: RefreshTokenPayload): Promise<SignedToken>;
}
