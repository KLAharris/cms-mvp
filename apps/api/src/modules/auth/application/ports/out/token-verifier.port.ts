export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp: number;
}

export interface TokenVerifier {
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}
