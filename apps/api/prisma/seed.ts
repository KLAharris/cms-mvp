import * as argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const authorPasswordHash = await argon2.hash('password123');
  const adminPasswordHash = await argon2.hash('adminpassword123');

  await prisma.user.upsert({
    where: { email: 'author@cms.local' },
    create: {
      email: 'author@cms.local',
      name: 'Test Author',
      role: Role.AUTHOR,
      passwordHash: authorPasswordHash,
    },
    update: {
      name: 'Test Author',
      role: Role.AUTHOR,
      passwordHash: authorPasswordHash,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@cms.local' },
    create: {
      email: 'admin@cms.local',
      name: 'Test Admin',
      role: Role.ADMIN,
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
    },
    update: {
      name: 'Test Admin',
      role: Role.ADMIN,
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
