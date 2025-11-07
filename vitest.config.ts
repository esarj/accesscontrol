import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import-x/no-default-export
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts', 'test/**/*.test.js'],
        coverage: {
            enabled: true,
            clean: true,
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: 'test/coverage',
            include: ['src/**/*.ts'],
            exclude: ['test/**', 'src/**/*.d.ts']
        }
    }
});
