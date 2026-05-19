import { PasswordResetToken } from '../../../domain/password-reset-token';

export interface PasswordResetTokenPort {
  save(token: PasswordResetToken): Promise<void>;
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}
