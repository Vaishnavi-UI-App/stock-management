import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
    // index.js is a single 4.7k-line file; give imports a little headroom
    testTimeout: 15000,
  },
});
