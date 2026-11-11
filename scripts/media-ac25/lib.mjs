import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Playwright is installed under scripts/computed-route; resolve it from there. */
export function loadPlaywright() {
  const req = createRequire(path.join(here, '..', 'computed-route', 'package.json'));
  return req('playwright');
}

export const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

/** URL path to a safe file stem. */
export function pageStem(p) {
  if (p === '/' || p === '') return 'home';
  let d = p;
  try { d = decodeURIComponent(p); } catch (e) { /* keep raw */ }
  return d.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9._-]+/g, '__').slice(0, 150) || 'home';
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    } else out._.push(a);
  }
  return out;
}

/** Glob (* only) to RegExp. */
export function globToRe(g) {
  return new RegExp('^' + String(g).replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '.*') + '$');
}
