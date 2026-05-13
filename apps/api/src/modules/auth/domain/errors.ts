export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidEmailError extends DomainError {
  constructor(value: string) {
    super(`Invalid email: ${value}`);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid credentials');
  }
}

export class AccountLockedError extends DomainError {
  constructor() {
    super('Account is locked');
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super('Invalid or expired token');
  }
}

export class RateLimitExceededError extends DomainError {
  constructor() {
    super('Rate limit exceeded');
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
