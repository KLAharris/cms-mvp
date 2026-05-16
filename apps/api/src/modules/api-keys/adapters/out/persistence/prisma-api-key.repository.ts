import { Inject, Injectable } from '@nestjs/common';
import { ApiKey as PrismaApiKey, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../../shared/prisma/prisma.service';
import { IApiKeyRepository } from '../../../application/ports/out';
import { ApiKey } from '../../../domain/entities';
import { ApiKeyPersistenceMapper } from './api-key-persistence.mapper';

type PrismaApiKeyClient = {
  apiKey: {
    create(args: Prisma.ApiKeyCreateArgs): Promise<unknown>;
    findUnique(args: Prisma.ApiKeyFindUniqueArgs): Promise<PrismaApiKey | null>;
    findMany(args: Prisma.ApiKeyFindManyArgs): Promise<PrismaApiKey[]>;
    update(args: Prisma.ApiKeyUpdateArgs): Promise<unknown>;
  };
};

@Injectable()
export class PrismaApiKeyRepository implements IApiKeyRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService & PrismaApiKeyClient,
  ) {}

  async save(apiKey: ApiKey): Promise<void> {
    await this.prisma.apiKey.create({
      data: ApiKeyPersistenceMapper.toPersistence(apiKey) as Prisma.ApiKeyCreateInput,
    });
  }

  async findById(id: string): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    return record === null ? null : ApiKeyPersistenceMapper.toDomain(record);
  }

  async findByKeyHash(hash: string): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
    });

    return record === null ? null : ApiKeyPersistenceMapper.toDomain(record);
  }

  async findAll(): Promise<ApiKey[]> {
    const records = await this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ApiKeyPersistenceMapper.toDomain(record));
  }

  async update(apiKey: ApiKey): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: apiKey.id.value },
      data: {
        lastUsedAt: apiKey.lastUsedAt,
        revokedAt: apiKey.revokedAt,
      },
    });
  }
}
