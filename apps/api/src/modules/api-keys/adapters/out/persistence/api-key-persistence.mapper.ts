import { ApiKey as PrismaApiKey, Prisma } from '@prisma/client';

import { ApiKey } from '../../../domain/entities';

export const ApiKeyPersistenceMapper = {
  toDomain(record: PrismaApiKey): ApiKey {
    const apiKey = ApiKey.create({
      id: record.id,
      name: record.name,
      keyHash: record.keyHash,
      createdById: record.createdById,
      createdAt: record.createdAt,
    });

    apiKey.lastUsedAt = record.lastUsedAt;
    apiKey.revokedAt = record.revokedAt;

    return apiKey;
  },

  toPersistence(apiKey: ApiKey): Prisma.ApiKeyCreateInput | Prisma.ApiKeyUpdateInput {
    return {
      id: apiKey.id.value,
      name: apiKey.name.value,
      keyHash: apiKey.keyHash.value,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      createdBy: { connect: { id: apiKey.createdById } },
      createdAt: apiKey.createdAt,
    };
  },
};
