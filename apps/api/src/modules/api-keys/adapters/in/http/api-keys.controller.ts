import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseFilters,
  UseGuards,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../../shared/decorators/roles.decorator';
import {
  AuthenticatedUser,
  JwtAuthGuard,
} from '../../../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../shared/guards/roles.guard';
import { ApiKey } from '../../../domain/entities';
import {
  ICreateApiKey,
  IListApiKeys,
  IRevokeApiKey,
} from '../../../application/ports/in';
import {
  CREATE_API_KEY,
  LIST_API_KEYS,
  REVOKE_API_KEY,
} from '../../../application/ports/tokens';
import { ApiKeyDomainExceptionFilter } from './api-key-domain-exception.filter';
import {
  ApiKeyResponse,
  CreateApiKeyRequestSchema,
  CreateApiKeyResponse,
} from './dto';

@Controller('api/admin/api-keys')
@UseFilters(ApiKeyDomainExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ApiKeysController {
  constructor(
    @Inject(LIST_API_KEYS)
    private readonly listApiKeys: IListApiKeys,
    @Inject(CREATE_API_KEY)
    private readonly createApiKey: ICreateApiKey,
    @Inject(REVOKE_API_KEY)
    private readonly revokeApiKey: IRevokeApiKey,
  ) {}

  @Get()
  async list(): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.listApiKeys.execute();
    return apiKeys.map((apiKey) => this.toResponse(apiKey));
  }

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateApiKeyResponse> {
    const parsed = CreateApiKeyRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw this.validationError();
    }

    const result = await this.createApiKey.execute({
      name: parsed.data.name,
      createdById: user.userId,
    });

    return {
      ...this.toResponse(result.apiKey),
      rawKey: result.rawKey,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.revokeApiKey.execute({
      id,
      revokedById: user.userId,
    });
  }

  private toResponse(apiKey: ApiKey): ApiKeyResponse {
    return {
      id: apiKey.id.value,
      name: apiKey.name.value,
      lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
      revokedAt: apiKey.revokedAt?.toISOString() ?? null,
      createdById: apiKey.createdById,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }

  private validationError(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
  }
}
