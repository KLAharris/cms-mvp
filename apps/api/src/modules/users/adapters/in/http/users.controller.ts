import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import {
  AuthenticatedUser,
  JwtAuthGuard,
} from '../../../../../shared/guards/jwt-auth.guard';
import {
  ListUsersQuery,
  ListUsersUseCase,
  UserDto,
} from '../../../application/ports/in/list-users.port';
import {
  InviteUserCommand,
  InviteUserUseCase,
} from '../../../application/ports/in/invite-user.port';
import {
  UpdateUserCommand,
  UpdateUserUseCase,
} from '../../../application/ports/in/update-user.port';
import {
  DeactivateUserCommand,
  DeactivateUserUseCase,
} from '../../../application/ports/in/deactivate-user.port';
import {
  AlreadyDeactivatedError,
  ForbiddenError,
  InvalidTransitionError,
  LastAdminError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../../domain/errors';
import { InvalidEmailError } from '../../../domain/email';
import { Role } from '../../../domain/role';

const roleSchema = z.nativeEnum(Role);

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  role: roleSchema.optional(),
  status: z.string().optional(),
});

const inviteUserBodySchema = z.object({
  email: z.string(),
  name: z.string(),
  role: roleSchema,
});

const updateUserBodySchema = z
  .object({
    name: z.string().optional(),
    role: roleSchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.role !== undefined);

type ErrorCode =
  | 'ALREADY_DEACTIVATED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'INVALID_EMAIL'
  | 'INVALID_TRANSITION'
  | 'LAST_ADMIN'
  | 'USER_ALREADY_EXISTS'
  | 'USER_NOT_FOUND'
  | 'VALIDATION_ERROR';

type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

@Controller('api/admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @Inject('LIST_USERS_USE_CASE') private readonly listUsers: ListUsersUseCase,
    @Inject('INVITE_USER_USE_CASE') private readonly inviteUser: InviteUserUseCase,
    @Inject('UPDATE_USER_USE_CASE') private readonly updateUser: UpdateUserUseCase,
    @Inject('DEACTIVATE_USER_USE_CASE')
    private readonly deactivateUser: DeactivateUserUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    data: UserDto[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  }> {
    const parsed = listUsersQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw this.error(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', 'Invalid query');
    }

    try {
      const result = await this.listUsers.execute(
        parsed.data satisfies ListUsersQuery,
        user.userId,
        this.toRole(user.role),
      );

      return {
        data: result.users,
        pagination: {
          page: result.page,
          page_size: result.pageSize,
          total: result.total,
          total_pages: Math.ceil(result.total / result.pageSize),
        },
      };
    } catch (error) {
      throw this.mapListError(error);
    }
  }

  @Post()
  @HttpCode(201)
  async invite(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const parsed = inviteUserBodySchema.safeParse(body);

    if (!parsed.success) {
      throw this.error(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', 'Invalid body');
    }

    try {
      await this.inviteUser.execute(
        parsed.data satisfies InviteUserCommand,
        user.userId,
        this.toRole(user.role),
      );
    } catch (error) {
      throw this.mapInviteError(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: UserDto }> {
    const parsed = updateUserBodySchema.safeParse(body);

    if (!parsed.success) {
      throw this.error(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', 'Invalid body');
    }

    try {
      const result = await this.updateUser.execute(
        { userId: id, ...parsed.data } satisfies UpdateUserCommand,
        user.userId,
        this.toRole(user.role),
      );

      return { data: result };
    } catch (error) {
      throw this.mapUpdateError(error);
    }
  }

  @Post(':id/deactivate')
  @HttpCode(204)
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      await this.deactivateUser.execute(
        { userId: id } satisfies DeactivateUserCommand,
        user.userId,
        this.toRole(user.role),
      );
    } catch (error) {
      throw this.mapDeactivateError(error);
    }
  }

  private toRole(role: string): Role {
    const parsed = roleSchema.safeParse(role);

    if (!parsed.success) {
      throw this.error(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden');
    }

    return parsed.data;
  }

  private mapListError(error: unknown): HttpException {
    if (error instanceof ForbiddenError) {
      return this.error(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden');
    }

    return this.internalError();
  }

  private mapInviteError(error: unknown): HttpException {
    if (error instanceof ForbiddenError) {
      return this.error(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden');
    }

    if (error instanceof UserAlreadyExistsError) {
      return this.error(
        HttpStatus.CONFLICT,
        'USER_ALREADY_EXISTS',
        'User already exists',
      );
    }

    if (error instanceof InvalidEmailError) {
      return this.error(HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_EMAIL', 'Invalid email');
    }

    return this.internalError();
  }

  private mapUpdateError(error: unknown): HttpException {
    if (error instanceof ForbiddenError) {
      return this.error(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden');
    }

    if (error instanceof UserNotFoundError) {
      return this.error(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    if (error instanceof LastAdminError) {
      return this.error(HttpStatus.CONFLICT, 'LAST_ADMIN', 'Cannot modify the last admin');
    }

    if (error instanceof InvalidTransitionError || this.hasName(error, 'InvalidTransitionError')) {
      return this.error(
        HttpStatus.CONFLICT,
        'INVALID_TRANSITION',
        'Invalid transition',
      );
    }

    return this.internalError();
  }

  private mapDeactivateError(error: unknown): HttpException {
    if (error instanceof ForbiddenError) {
      return this.error(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden');
    }

    if (error instanceof UserNotFoundError) {
      return this.error(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    if (error instanceof LastAdminError) {
      return this.error(HttpStatus.CONFLICT, 'LAST_ADMIN', 'Cannot modify the last admin');
    }

    if (
      error instanceof AlreadyDeactivatedError ||
      this.hasName(error, 'AlreadyDeactivatedError')
    ) {
      return this.error(
        HttpStatus.CONFLICT,
        'ALREADY_DEACTIVATED',
        'User is already deactivated',
      );
    }

    return this.internalError();
  }

  private hasName(error: unknown, name: string): boolean {
    return error instanceof Error && error.name === name;
  }

  private internalError(): HttpException {
    return this.error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Internal server error',
    );
  }

  private error(status: HttpStatus, code: ErrorCode, message: string): HttpException {
    return new HttpException({ error: { code, message } } satisfies ErrorBody, status);
  }
}
