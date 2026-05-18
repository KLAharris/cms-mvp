import {
  DeactivateUserCommand,
  DeactivateUserUseCase,
} from '../ports/in/deactivate-user.port';
import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { ForbiddenError, UserNotFoundError } from '../../domain/errors';
import { Role } from '../../domain/role';
import { LastAdminGuard } from '../../domain/services/last-admin.guard';

export class DeactivateUser implements DeactivateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: DeactivateUserCommand,
    actorId: string,
    actorRole: Role,
    actorIp?: string,
  ): Promise<void> {
    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const user = await this.userRepository.findById(cmd.userId);

    if (user === null) {
      throw new UserNotFoundError();
    }

    const adminCount = await this.userRepository.countByRole(Role.ADMIN);
    LastAdminGuard.assertNotLastAdmin(adminCount, user);
    user.deactivate();
    await this.userRepository.save(user);
    await this.auditLogger.log({
      action: 'user.deactivate',
      actorId,
      ...(actorIp !== undefined ? { actorIp } : {}),
      targetId: cmd.userId,
      occurredAt: this.clock.now(),
    });
  }
}
