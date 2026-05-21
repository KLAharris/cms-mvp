import { configDefaults, defineConfig } from 'vitest/config';

const coverageRequested = process.argv.includes('--coverage');
const contentDomainOnly = process.argv.includes('src/modules/content/domain');
const contentOnly = process.argv.includes('src/modules/content');

export default defineConfig({
  test: {
    coverage: {
      enabled: coverageRequested,
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/modules/content/adapters/out/persistence/prisma-content-version.repository.ts',
      ],
      include: contentDomainOnly
        ? [
            'src/modules/content/domain/**/*.ts',
            '!src/modules/content/domain/events/domain-event.ts',
          ]
        : contentOnly
          ? [
              'src/modules/content/domain/**/*.ts',
              '!src/modules/content/domain/events/domain-event.ts',
              'src/modules/content/application/policies/**/*.ts',
              'src/modules/content/application/use-cases/**/*.ts',
              'src/modules/content/adapters/in/http/**/*.ts',
              '!src/modules/content/adapters/in/http/dto/content.response.ts',
              'src/modules/content/adapters/out/persistence/content-persistence.mapper.ts',
              'src/modules/content/adapters/out/persistence/prisma-content.repository.ts',
            ]
        : [
            'src/modules/auth/domain/**/*.ts',
            'src/modules/auth/application/use-cases/**/*.ts',
            'src/modules/content/domain/**/*.ts',
          ],
    },
    environment: 'node',
    env: {
      PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1',
    },
    fileParallelism: false,
    globals: false,
    hookTimeout: 60000,
    testTimeout: 15000,
    exclude: [...configDefaults.exclude, 'test/fakes/**/*.ts'],
    include: ['test/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    maxWorkers: 1,
    minWorkers: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
