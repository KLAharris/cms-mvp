import { DomainError } from './errors';

export type PasswordResetTokenProps = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt?: Date;
};

export class PasswordResetToken {
  readonly id: string;
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: PasswordResetTokenProps) {
    if (props.id.trim() === '') {
      throw new DomainError('Password reset token id is required');
    }

    if (props.tokenHash.trim() === '') {
      throw new DomainError('Password reset token hash is required');
    }

    if (props.userId.trim() === '') {
      throw new DomainError('Password reset token user id is required');
    }

    this.id = props.id;
    this.tokenHash = props.tokenHash;
    this.userId = props.userId;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt ?? new Date(0);
  }

  isExpired(now: Date): boolean {
    return this.expiresAt < now;
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }

  isValid(now: Date): boolean {
    return !this.isExpired(now) && !this.isUsed();
  }
}
