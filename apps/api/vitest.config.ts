import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
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
