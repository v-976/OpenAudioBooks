import { defineConfig } from 'vitest/config';

// Tests run in jsdom with an in-memory IndexedDB shim.
// No network, no external services.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
