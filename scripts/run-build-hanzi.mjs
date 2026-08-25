#!/usr/bin/env node
// Not a GPL-3.0 source file: repository build tooling, per the same
// exemption as scripts/check-licenses.mjs (conventions.md §4, WO-001 §5).
//
// `npm run build:hanzi`'s entry point — same in-place-compile-then-clean
// shape as scripts/run-build-data.mjs, for the same reason (pipeline/*.ts
// uses import.meta.url-relative paths that only resolve correctly when
// compiled next to their sources, not into a nested dist/). Run after
// `npm run build:data`: pipeline/build-hanzi.ts reads the compiled decks
// to know which characters it needs.

import { spawnSync } from 'node:child_process';

const compile = spawnSync('npx', ['tsc', '-p', 'tsconfig.build-data.json'], { stdio: 'inherit' });
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const build = spawnSync('node', ['pipeline/build-hanzi.js'], { stdio: 'inherit' });

const clean = spawnSync('node', ['scripts/clean-build-data.mjs'], { stdio: 'inherit' });
if (clean.status !== 0) {
  console.error('warning: scripts/clean-build-data.mjs failed; compiled .js siblings may remain.');
}

process.exit(build.status ?? 1);
