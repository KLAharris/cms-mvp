import { defineConfig } from 'vitest/config';

const coverageRequested = process.argv.includes('--coverage');

export default defineConfig({
  test: {
    coverage: {
      enabled: coverageRequested,
      include: [
        'src/modules/auth/domain/**/*.ts',
        'src/modules/auth/application/use-cases/**/*.ts',
      ],
    },
    environment: 'node',
    globals: false,
    include: ['test/**/*.ts', 'src/**/*.test.ts'],
  },
});
