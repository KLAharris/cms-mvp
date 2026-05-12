export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  exp: number;
}

export interface TokenVerifier {
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}
