import { Email } from './email';
import { DomainError } from './errors';
import { Role } from './role';

export type UserStatus = 'active' | 'locked';

export type UserProps = {
  id: string;
  email: Email;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt: Date | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
};

const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class User {
  readonly id: string;
  readonly email: Email;
  readonly passwordHash: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly failedLoginAttempts: number;
  readonly failedLoginWindowStartedAt: Date | null;
  readonly lockedUntil: Date | null;
  readonly lastLoginAt: Date | null;

  constructor(props: UserProps) {
    if (props.id.trim() === '') {
      throw new DomainError('User id is required');
    }

    if (props.passwordHash.trim() === '') {
      throw new DomainError('Password hash is required');
    }

    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.failedLoginAttempts = props.failedLoginAttempts;
    this.failedLoginWindowStartedAt = props.failedLoginWindowStartedAt;
    this.lockedUntil = props.lockedUntil;
    this.lastLoginAt = props.lastLoginAt;
  }

  recordFailedLogin(now: Date): User {
    if (this.lockedUntil !== null && this.lockedUntil <= now) {
      return this.withFreshFailedLoginWindow(now);
    }

    if (
      this.failedLoginWindowStartedAt === null ||
      now.getTime() - this.failedLoginWindowStartedAt.getTime() > FAILED_LOGIN_WINDOW_MS
    ) {
      return this.withFreshFailedLoginWindow(now);
    }

    const failedLoginAttempts = this.failedLoginAttempts + 1;
    const lockedUntil =
      failedLoginAttempts >= FAILED_LOGIN_LIMIT
        ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
        : null;

    return this.copy({
      failedLoginAttempts,
      lockedUntil,
      status: lockedUntil === null ? 'active' : 'locked',
    });
  }

  recordSuccessfulLogin(now: Date): User {
    return this.copy({
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
      status: 'active',
      lastLoginAt: now,
    });
  }

  isLocked(now: Date): boolean {
    return this.lockedUntil !== null && this.lockedUntil > now;
  }

  private withFreshFailedLoginWindow(now: Date): User {
    return this.copy({
      failedLoginAttempts: 1,
      failedLoginWindowStartedAt: now,
      lockedUntil: null,
      status: 'active',
    });
  }

  private copy(overrides: Partial<UserProps>): User {
    return new User({
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      status: this.status,
      failedLoginAttempts: this.failedLoginAttempts,
      failedLoginWindowStartedAt: this.failedLoginWindowStartedAt,
      lockedUntil: this.lockedUntil,
      lastLoginAt: this.lastLoginAt,
      ...overrides,
    });
  }
}
