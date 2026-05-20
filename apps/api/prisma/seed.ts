import * as crypto from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminHash = await argon2.hash('Admin1234!');
  const editorHash = await argon2.hash('Editor1234!');
  const authorHash = await argon2.hash('Author1234!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      status: 'ACTIVE',
      passwordHash: adminHash,
    },
    update: {
      name: 'Admin User',
      role: Role.ADMIN,
      status: 'ACTIVE',
      passwordHash: adminHash,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    create: {
      email: 'editor@example.com',
      name: 'Editor User',
      role: Role.EDITOR,
      status: 'ACTIVE',
      passwordHash: editorHash,
    },
    update: {
      name: 'Editor User',
      role: Role.EDITOR,
      status: 'ACTIVE',
      passwordHash: editorHash,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'author@example.com' },
    create: {
      email: 'author@example.com',
      name: 'Author User',
      role: Role.AUTHOR,
      status: 'ACTIVE',
      passwordHash: authorHash,
    },
    update: {
      name: 'Author User',
      role: Role.AUTHOR,
      status: 'ACTIVE',
      passwordHash: authorHash,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    },
  });

  const existingArticle = await prisma.content.findFirst({
    where: { slug: 'getting-started-with-cms', type: 'article' },
  });

  if (!existingArticle) {
    await prisma.content.create({
      data: {
        type: 'article',
        title: 'Getting Started with CMS MVP',
        slug: 'getting-started-with-cms',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Welcome to the CMS MVP. This headless content management system provides a powerful REST API for managing and delivering content to your frontend applications.',
                },
              ],
            },
          ],
        },
        status: 'published',
        authorId: editor.id,
        publishedAt: new Date(),
        seoTitle: 'Getting Started with CMS MVP',
        seoDescription: 'Learn how to use the CMS MVP headless content management system to manage and deliver content.',
      },
    });
  } else {
    await prisma.content.update({
      where: { id: existingArticle.id },
      data: {
        status: 'published',
        publishedAt: existingArticle.publishedAt ?? new Date(),
      },
    });
  }

  const existingPage = await prisma.content.findFirst({
    where: { slug: 'about', type: 'page' },
  });

  if (!existingPage) {
    await prisma.content.create({
      data: {
        type: 'page',
        title: 'About',
        slug: 'about',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'About the CMS MVP project.' },
              ],
            },
          ],
        },
        status: 'published',
        authorId: editor.id,
        publishedAt: new Date(),
        seoTitle: 'About — CMS MVP',
        seoDescription: 'Learn more about the CMS MVP headless content management system.',
      },
    });
  } else {
    await prisma.content.update({
      where: { id: existingPage.id },
      data: {
        status: 'published',
        publishedAt: existingPage.publishedAt ?? new Date(),
      },
    });
  }

  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const existingKey = await prisma.apiKey.findFirst({
    where: { createdById: admin.id, name: 'seed-test-key' },
  });

  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        name: 'seed-test-key',
        keyHash,
        createdById: admin.id,
      },
    });

    console.log('\n=== Seed API Key (save this — it will not be shown again) ===');
    console.log(rawKey);
    console.log('=============================================================\n');
  } else {
    console.log('\n[seed] API key already exists (seed-test-key). Skipping key creation.\n');
  }

  console.log('[seed] Done.');
  console.log('  admin@example.com   / Admin1234!');
  console.log('  editor@example.com  / Editor1234!');
  console.log('  author@example.com  / Author1234!');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
