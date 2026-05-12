import * as argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('password123');

  await prisma.user.upsert({
    where: { email: 'author@cms.local' },
    create: {
      email: 'author@cms.local',
      role: Role.AUTHOR,
      passwordHash,
    },
    update: {
      role: Role.AUTHOR,
      passwordHash,
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
