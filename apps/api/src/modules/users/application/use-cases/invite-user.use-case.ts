import { createHash } from 'crypto';

import { InviteUserCommand, InviteUserUseCase } from '../ports/in/invite-user.port';
import { NotificationService } from '../../../notification/application/notification.service';
import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { IdGenerator } from '../ports/out/id-generator.port';
import { PasswordHasher } from '../ports/out/password-hasher.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { Email } from '../../domain/email';
import { ForbiddenError, UserAlreadyExistsError } from '../../domain/errors';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type InviteNotificationService = Pick<NotificationService, 'sendInviteEmail'>;

export class InviteUser implements InviteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly notifications: InviteNotificationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(
    cmd: InviteUserCommand,
    actorId: string,
    actorRole: Role,
    actorIp?: string,
  ): Promise<void> {
    void this.passwordHasher;

    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const email = Email.create(cmd.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser !== null) {
      throw new UserAlreadyExistsError();
    }

    const now = this.clock.now();
    const rawToken = this.idGenerator.generate();
    const sha256Hash = sha256(rawToken);
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const user = User.createInvited(
      this.idGenerator.generate(),
      email,
      cmd.name,
      cmd.role,
      sha256Hash,
      expiresAt,
    );

    await this.userRepository.save(user);
    await this.notifications.sendInviteEmail(email.value, rawToken, cmd.role);
    await this.auditLogger.log({
      action: 'user.invite',
      actorId,
      ...(actorIp !== undefined ? { actorIp } : {}),
      targetId: user.id,
      occurredAt: this.clock.now(),
    });
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
