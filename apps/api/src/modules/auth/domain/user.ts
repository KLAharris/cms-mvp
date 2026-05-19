import { Email } from './email';
import {
  AlreadyDeactivatedError,
  DomainError,
  InvalidTransitionError,
} from './errors';
import { Role } from './role';

export type UserStatus = 'active' | 'locked' | 'invited' | 'deactivated';

export type UserProps = {
  id: string;
  email: Email;
  name?: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt: Date | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  inviteTokenHash?: string | null;
  inviteExpiresAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt?: Date;
};

const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class User {
  readonly id: string;
  readonly email: Email;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  readonly failedLoginAttempts: number;
  readonly failedLoginWindowStartedAt: Date | null;
  readonly lockedUntil: Date | null;
  readonly lastLoginAt: Date | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  passwordChangedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: UserProps) {
    if (props.id.trim() === '') {
      throw new DomainError('User id is required');
    }

    if (props.passwordHash.trim() === '' && props.status !== 'invited') {
      throw new DomainError('Password hash is required');
    }

    this.id = props.id;
    this.email = props.email;
    this.name = props.name ?? props.email.value;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.failedLoginAttempts = props.failedLoginAttempts;
    this.failedLoginWindowStartedAt = props.failedLoginWindowStartedAt;
    this.lockedUntil = props.lockedUntil;
    this.lastLoginAt = props.lastLoginAt;
    this.inviteTokenHash = props.inviteTokenHash ?? null;
    this.inviteExpiresAt = props.inviteExpiresAt ?? null;
    this.passwordChangedAt = props.passwordChangedAt ?? null;
    this.createdAt = props.createdAt ?? new Date(0);
  }

  static createInvited(
    id: string,
    email: Email,
    name: string,
    role: Role,
    inviteTokenHash: string,
    inviteExpiresAt: Date,
  ): User {
    void name;

    return new User({
      id,
      email,
      name,
      passwordHash: '',
      role,
      status: 'invited',
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
      lastLoginAt: null,
      inviteTokenHash,
      inviteExpiresAt,
      createdAt: new Date(inviteExpiresAt.getTime() - 7 * 24 * 60 * 60 * 1000),
    });
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

  invite(tokenHash: string, expiresAt: Date): void {
    if (
      this.status === 'active' ||
      this.status === 'locked' ||
      this.status === 'deactivated'
    ) {
      throw new InvalidTransitionError();
    }

    this.status = 'invited';
    this.inviteTokenHash = tokenHash;
    this.inviteExpiresAt = expiresAt;
  }

  activate(passwordHash: string): void {
    if (this.status !== 'invited') {
      throw new InvalidTransitionError();
    }

    if (passwordHash.trim() === '') {
      throw new DomainError('Password hash is required');
    }

    this.status = 'active';
    this.passwordHash = passwordHash;
    this.inviteTokenHash = null;
    this.inviteExpiresAt = null;
  }

  deactivate(): void {
    if (this.status === 'deactivated') {
      throw new AlreadyDeactivatedError();
    }

    if (this.status === 'invited') {
      throw new InvalidTransitionError();
    }

    this.status = 'deactivated';
  }

  changeRole(newRole: Role): void {
    if (newRole === this.role) {
      throw new InvalidTransitionError();
    }

    this.role = newRole;
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
      name: this.name,
      passwordHash: this.passwordHash,
      role: this.role,
      status: this.status,
      failedLoginAttempts: this.failedLoginAttempts,
      failedLoginWindowStartedAt: this.failedLoginWindowStartedAt,
      lockedUntil: this.lockedUntil,
      lastLoginAt: this.lastLoginAt,
      inviteTokenHash: this.inviteTokenHash,
      inviteExpiresAt: this.inviteExpiresAt,
      passwordChangedAt: this.passwordChangedAt,
      createdAt: this.createdAt,
      ...overrides,
    });
  }
}
