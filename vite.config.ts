// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config';

// `BASE_PATH` lets CI build for a GitHub Pages project site (/repo-name/)
// without hard-coding the repository name into the source.
export default defineConfig({
  base: process.env['BASE_PATH'] ?? '/',
  build: {
    target: 'es2022',
    reportCompressedSize: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
