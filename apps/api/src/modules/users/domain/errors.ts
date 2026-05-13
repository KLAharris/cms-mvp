export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ForbiddenError extends DomainError {
  constructor() {
    super('Forbidden');
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super('User not found');
  }
}

export class AlreadyDeactivatedError extends DomainError {
  constructor() {
    super('User is already deactivated');
  }
}

export class InviteExpiredError extends DomainError {
  constructor() {
    super('Invite has expired');
  }
}

export class InvalidTransitionError extends DomainError {
  constructor() {
    super('Invalid transition');
  }
}

export class LastAdminError extends DomainError {
  constructor() {
    super('Cannot modify the last admin');
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor() {
    super('User already exists');
  }
}

export class WeakPasswordError extends DomainError {
  constructor() {
    super(
      'Password must be at least 12 characters and contain at least one letter and one digit',
    );
  }
}
