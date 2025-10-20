import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'test/coverage',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['test/**', 'src/**/*.d.ts']
    }
  }
});
