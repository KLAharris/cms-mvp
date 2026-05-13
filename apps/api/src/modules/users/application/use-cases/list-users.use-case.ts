import {
  ListUsersQuery,
  ListUsersResult,
  ListUsersUseCase,
} from '../ports/in/list-users.port';
import { UserRepository, UserSearchCriteria } from '../ports/out/user-repository.port';
import { ForbiddenError } from '../../domain/errors';
import { Role } from '../../domain/role';
import { toUserDto } from './user-dto.mapper';

export class ListUsers implements ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    query: ListUsersQuery,
    actorId: string,
    actorRole: Role,
  ): Promise<ListUsersResult> {
    void actorId;

    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const criteria: UserSearchCriteria = {
      page,
      pageSize,
      role: query.role,
      status: toUserStatus(query.status),
    };
    const { users, total } = await this.userRepository.findMany(criteria);

    return {
      users: users.map(toUserDto),
      total,
      page,
      pageSize,
    };
  }
}

function toUserStatus(status: string | undefined): UserSearchCriteria['status'] {
  if (status === 'active' || status === 'invited' || status === 'deactivated') {
    return status;
  }

  return undefined;
}
