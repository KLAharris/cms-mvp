import {
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../ports/in/login.port';
import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { PasswordHasher } from '../ports/out/password-hasher.port';
import { TokenSigner } from '../ports/out/token-signer.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { Email } from '../../domain/email';
import { AccountLockedError, InvalidCredentialsError } from '../../domain/errors';

export class Login implements LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenSigner,
    private readonly clock: Clock,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = Email.create(command.email);
    const now = this.clock.now();
    const user = await this.users.findByEmail(email);

    if (!user) {
      await this.auditLogger.logLoginFailure({
        email: email.value,
        actorIp: command.actorIp,
        occurredAt: now,
        reason: 'invalid_credentials',
      });
      throw new InvalidCredentialsError();
    }

    if (user.isLocked(now)) {
      await this.auditLogger.logLoginFailure({
        email: email.value,
        actorIp: command.actorIp,
        occurredAt: now,
        reason: 'account_locked',
      });
      throw new AccountLockedError();
    }

    const passwordMatches = await this.passwords.verify(command.password, user.passwordHash);

    if (!passwordMatches) {
      await this.users.save(user.recordFailedLogin(now));
      await this.auditLogger.logLoginFailure({
        email: email.value,
        actorIp: command.actorIp,
        occurredAt: now,
        reason: 'invalid_credentials',
      });
      throw new InvalidCredentialsError();
    }

    const loggedInUser = user.recordSuccessfulLogin(now);
    await this.users.save(loggedInUser);
    await this.auditLogger.logLoginSuccess({
      userId: loggedInUser.id,
      actorIp: command.actorIp,
      occurredAt: now,
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken({
        userId: loggedInUser.id,
        role: loggedInUser.role,
      }),
      this.tokens.signRefreshToken({
        userId: loggedInUser.id,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: loggedInUser.id,
        email: loggedInUser.email.value,
        role: loggedInUser.role,
      },
    };
  }
}
