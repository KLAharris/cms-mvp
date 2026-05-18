import {
  UpdateUserCommand,
  UpdateUserUseCase,
} from '../ports/in/update-user.port';
import { AuditLogger } from '../ports/out/audit-logger.port';
import { Clock } from '../ports/out/clock.port';
import { UserRepository } from '../ports/out/user-repository.port';
import { ForbiddenError, UserNotFoundError } from '../../domain/errors';
import { Role } from '../../domain/role';
import { LastAdminGuard } from '../../domain/services/last-admin.guard';
import { toUserDto } from './user-dto.mapper';

export class UpdateUser implements UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: UpdateUserCommand, actorId: string, actorRole: Role, actorIp?: string) {
    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const user = await this.userRepository.findById(cmd.userId);

    if (user === null) {
      throw new UserNotFoundError();
    }

    if (cmd.role !== undefined) {
      const adminCount = await this.userRepository.countByRole(Role.ADMIN);
      LastAdminGuard.assertNotLastAdmin(adminCount, user);
      user.changeRole(cmd.role);
    }

    if (cmd.name !== undefined) {
      user.name = cmd.name;
    }

    await this.userRepository.save(user);
    await this.auditLogger.log({
      action: 'user.update',
      actorId,
      ...(actorIp !== undefined ? { actorIp } : {}),
      targetId: cmd.userId,
      occurredAt: this.clock.now(),
    });

    return toUserDto(user);
  }
}
