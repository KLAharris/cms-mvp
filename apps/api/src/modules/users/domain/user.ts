import { Email } from './email';
import {
  AlreadyDeactivatedError,
  DomainError,
  InvalidTransitionError,
} from './errors';
import { Role } from './role';

export type UserStatus = 'active' | 'invited' | 'deactivated';

export type UserProps = {
  id: string;
  email: Email;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  createdAt: Date;
};

export class User {
  readonly id: string;
  readonly email: Email;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  readonly lastLoginAt: Date | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  readonly createdAt: Date;

  constructor(props: UserProps) {
    if (props.id.trim() === '') {
      throw new DomainError('User id is required');
    }

    if (props.name.trim() === '') {
      throw new DomainError('User name is required');
    }

    if (props.passwordHash.trim() === '' && props.status !== 'invited') {
      throw new DomainError('Password hash is required');
    }

    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.failedLoginAttempts = props.failedLoginAttempts;
    this.lockedUntil = props.lockedUntil;
    this.lastLoginAt = props.lastLoginAt;
    this.inviteTokenHash = props.inviteTokenHash;
    this.inviteExpiresAt = props.inviteExpiresAt;
    this.createdAt = props.createdAt;
  }

  static createInvited(
    id: string,
    email: Email,
    name: string,
    role: Role,
    inviteTokenHash: string,
    inviteExpiresAt: Date,
  ): User {
    return new User({
      id,
      email,
      name,
      passwordHash: '',
      role,
      status: 'invited',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      inviteTokenHash,
      inviteExpiresAt,
      createdAt: new Date(inviteExpiresAt.getTime() - 7 * 24 * 60 * 60 * 1000),
    });
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
}
