import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // jsdom disables storage APIs (localStorage/sessionStorage) for the
    // default "about:blank" origin — an explicit http(s) URL is required
    // for src/services/storage.ts's tests to exercise real storage rather
    // than a throwing stub. A second, separate fix is also required: Node
    // 22+'s own experimental global `localStorage` (gated behind
    // `--localstorage-file`) shadows jsdom's `window.localStorage` under
    // this Node version, throwing instead of delegating — package.json's
    // `test`/`test:watch` scripts set `NODE_OPTIONS=--no-experimental-webstorage`
    // to disable Node's own implementation so jsdom's is used. Confirmed by
    // direct repro (a bare `new JSDOM(...)` has a working `localStorage`;
    // only the vitest-orchestrated run did not, and only until this flag
    // was added) — not assumed from documentation.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'pipeline/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
  },
});
