import { User } from '../../../domain/user';

export interface PasswordResetUnitOfWork {
  resetPassword(user: User, tokenId: string, usedAt: Date): Promise<void>;
}
