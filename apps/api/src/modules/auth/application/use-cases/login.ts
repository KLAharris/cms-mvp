import {
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../ports/in/login.port';
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
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = Email.create(command.email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const now = this.clock.now();

    if (user.isLocked(now)) {
      throw new AccountLockedError();
    }

    const passwordMatches = await this.passwords.verify(command.password, user.passwordHash);

    if (!passwordMatches) {
      await this.users.save(user.recordFailedLogin(now));
      throw new InvalidCredentialsError();
    }

    const loggedInUser = user.recordSuccessfulLogin(now);
    await this.users.save(loggedInUser);

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
