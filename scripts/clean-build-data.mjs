#!/usr/bin/env node
// Not a GPL-3.0 source file: repository build tooling, per the same
// exemption as scripts/check-licenses.mjs (conventions.md §4, WO-001 §5).
//
// Deletes the .js files tsconfig.build-data.json compiles in place next to
// pipeline/**/*.ts and src/domain/**/*.ts (see pipeline/build-data.ts's
// docstring for why in-place compilation is necessary). Run immediately
// after `npm run build:data` so a stale compiled .js sibling never shadows
// its live .ts source for Vite/Vitest's resolver on the next `npm test`.

import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

function deleteCompiledJs(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      deleteCompiledJs(full);
    } else if (name.endsWith('.js')) {
      rmSync(full);
    }
  }
}

deleteCompiledJs('pipeline');
deleteCompiledJs('src/domain');
