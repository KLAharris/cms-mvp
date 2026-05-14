import { defineConfig } from 'vitest/config';

const coverageRequested = process.argv.includes('--coverage');
const contentDomainOnly = process.argv.includes('src/modules/content/domain');

export default defineConfig({
  test: {
    coverage: {
      enabled: coverageRequested,
      include: contentDomainOnly
        ? ['src/modules/content/domain/**/*.ts']
        : [
            'src/modules/auth/domain/**/*.ts',
            'src/modules/auth/application/use-cases/**/*.ts',
            'src/modules/content/domain/**/*.ts',
          ],
    },
    environment: 'node',
    fileParallelism: false,
    globals: false,
    include: ['test/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
