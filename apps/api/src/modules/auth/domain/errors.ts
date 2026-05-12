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
