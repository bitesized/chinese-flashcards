#!/usr/bin/env node
// Not a GPL-3.0 source file: it is repository build tooling that runs
// before any TypeScript exists to check, and eslint-plugin-headers is
// scoped to src/, pipeline/, and tests/ only (conventions.md §4, WO-001 §5).
//
// Fails the build — never merely warns — on a dependency whose declared
// licence is not known to be GPL-3.0 compatible (DEC-016, conventions.md
// §4). Runs against the full dependency tree (production and dev): even
// build-only tooling is checked, though held to a lower bar for other
// concerns such as vulnerabilities (npm audit, run separately).
//
// This is a wrapper around `license-checker` rather than a bare CLI
// invocation so the allow-list can carry inline rationale for each entry,
// and so an SPDX OR-expression (e.g. "(MIT OR CC0-1.0)") is resolved
// correctly instead of rejected as an unrecognised compound string.

import { init } from 'license-checker';

// Every licence here is known GPL-3.0-compatible. Checked before adoption,
// not at release (RISK-12) — add to this list only after confirming
// compatibility, and say why.
const ALLOWED = new Set([
  'MIT',
  'ISC',
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  'BlueOak-1.0.0',
  // MPL-2.0 §3.3 ("Secondary Licenses") makes it combinable with GPL-3.0
  // covered code; the FSF lists MPL 2.0 as GPL-compatible. Pulled in today
  // via lightningcss, a build-time-only transitive dependency of Vite.
  'MPL-2.0',
  // MIT-0: MIT with the attribution clause removed — strictly more
  // permissive than MIT, so compatible a fortiori.
  'MIT-0',
  // CC-BY-3.0: attribution-only, no copyleft or field-of-use restriction —
  // compatible with GPL-3.0. Seen only on spdx-exceptions, a data-only
  // transitive dependency of license-checker itself (build tooling, never
  // shipped).
  'CC-BY-3.0',
  // CC-BY-4.0: same attribution-only reasoning as CC-BY-3.0 above, newer
  // version of the same license family. Seen on caniuse-lite (a pure
  // browser-compatibility data table, not code), pulled in transitively via
  // eslint-plugin-react-hooks -> @babel/core -> browserslist (WO-011) —
  // lint-time tooling only, never bundled into the shipped application.
  'CC-BY-4.0',
]);

// Our own package always reports its own declared licence (GPL-3.0-only)
// and is not a "dependency" in the sense this check cares about.
const EXCLUDE_PACKAGES = new Set(['chinese-flashcards@0.0.0']);

/**
 * Resolves one SPDX-ish license expression against the allow-list. Handles:
 *   - a single id, optionally with license-checker's trailing `*` "guessed"
 *     marker (e.g. "MIT*");
 *   - an OR-expression, e.g. "(MIT OR CC0-1.0)" — allowed if ANY option is;
 *   - an AND-expression, e.g. "(MIT AND CC-BY-3.0)" — the combined work
 *     carries obligations from every part, so ALL parts must be allowed.
 *
 * @param {string} licenseField - license-checker's `licenses` value for one
 *   package.
 * @returns {boolean}
 */
function isAllowed(licenseField) {
  if (!licenseField) return false;
  const expr = licenseField.replace(/^\(|\)$/g, '').trim();

  const orParts = expr.split(/\s+OR\s+/i);
  if (orParts.length > 1) {
    return orParts.some((part) => isAllowed(part));
  }

  const andParts = expr.split(/\s+AND\s+/i);
  if (andParts.length > 1) {
    return andParts.every((part) => isAllowed(part));
  }

  const id = expr.endsWith('*') ? expr.slice(0, -1) : expr;
  return ALLOWED.has(id.trim());
}

// Deliberately no `production`/`development` filter: each is a positive
// filter ("only show X"), so passing either alone would silently exclude
// the other half of the tree. Omitting both scans everything, which is
// what "every runtime and build dependency" (WO-001 §4) requires.
init({ start: process.cwd() }, (err, packages) => {
  if (err) {
    console.error('license-check: failed to inspect dependency tree');
    console.error(err);
    process.exit(1);
  }

  const violations = [];

  for (const [pkgId, info] of Object.entries(packages)) {
    if (EXCLUDE_PACKAGES.has(pkgId)) continue;
    const license = info.licenses;
    const licenseStr = Array.isArray(license) ? license.join(' OR ') : license;
    if (!isAllowed(licenseStr)) {
      violations.push({ pkgId, license: licenseStr ?? '(none declared)' });
    }
  }

  if (violations.length > 0) {
    console.error(
      `license-check: ${violations.length} package(s) have a licence not on the GPL-3.0-compatible allow-list:\n`,
    );
    for (const v of violations) {
      console.error(`  ${v.pkgId} — ${v.license}`);
    }
    console.error(
      '\nIf this licence is genuinely GPL-3.0 compatible, add it to scripts/check-licenses.mjs with a one-line rationale. Otherwise this dependency cannot be adopted (DEC-016).',
    );
    process.exit(1);
  }

  console.log(
    `license-check: ${Object.keys(packages).length - EXCLUDE_PACKAGES.size} package(s) OK.`,
  );
});
