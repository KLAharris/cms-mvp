export interface TokenBlocklist {
  add(jti: string, expiresAt: Date): Promise<void>;
  has(jti: string): Promise<boolean>;
}
