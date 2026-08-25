#!/usr/bin/env node
// Not a GPL-3.0 source file: repository build tooling, per the same
// exemption as scripts/check-licenses.mjs (conventions.md §4, WO-001 §5).
//
// `npm run build:data`'s actual entry point. A plain
// `tsc ... && node ... ; node clean...` shell pipeline can't both (a) always
// run cleanup (scripts/clean-build-data.mjs) regardless of whether the data
// build passed its validation gates, and (b) still propagate that build's
// exit code to CI, since a `;`-joined command list's exit code is its LAST
// command's — cleanup would silently swallow a real validation failure.
// This script runs both steps and always exits with the data build's own
// code, cleanup or no.

import { spawnSync } from 'node:child_process';

const compile = spawnSync('npx', ['tsc', '-p', 'tsconfig.build-data.json'], { stdio: 'inherit' });
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const build = spawnSync('node', ['pipeline/build-data.js'], { stdio: 'inherit' });

const clean = spawnSync('node', ['scripts/clean-build-data.mjs'], { stdio: 'inherit' });
if (clean.status !== 0) {
  console.error('warning: scripts/clean-build-data.mjs failed; compiled .js siblings may remain.');
}

process.exit(build.status ?? 1);
