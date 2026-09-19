#!/usr/bin/env node
/**
 * resolve-js-content.js — the RENDER-AND-READ side of Stage -1.5 (Spec 31 §15, FR-31-26).
 *
 * THE PROVEN APPROACH (FR-31-26 preamble): a draft whose `<sc-for>` content lives only in a
 * `static ARRAY = [...]` class property has zero usable static text — the fix is NOT a custom
 * JS-array parser (rejected, duplicates the draft's own runtime unreliably) but rendering the
 * draft with its OWN `support.js`/`image-slot.js` runtime in a real headless browser and reading
 * the resolved DOM. Same pattern as Spec 33's `theme-extractor/measure.js` (render, read what the
 * runtime produced, never parse source) — this script extends that pattern to CONTENT, not style.
 *
 * This script does NOT inject markers itself (that is `js_content_resolver.py`'s job, in a
 * TEMPORARY copy of the draft — FR-31-26.2) and does NOT splice results back into the pipeline
 * mockup (FR-31-26.1, also the Python module's job, pure string/regex patching). This script's
 * ONLY responsibility: given an already-marker-injected draft copy, serve it over real HTTP,
 * render it, and read out each `data-sgs-resolve-id` group's resolved text (+ icon path if
 * present) as JSON. The Python caller applies FR-31-26.3's fail-soft fallback on any failure here.
 *
 * WHY REAL HTTP, NOT file:// (confirmed live, FR-31-26 preamble): the draft's own `support.js`
 * calls `fetch()` to self-load and to load sibling `dc-import` components; `file://` blocks fetch
 * under browser security. We serve the draft's PARENT DIRECTORY so sibling files (support.js,
 * image-slot.js, other .dc.html files) resolve at their relative paths exactly as authored.
 *
 * Usage:  node resolve-js-content.js --draft <path> [--out <file>]
 *         (prints JSON to stdout; --out also writes it to a file)
 *
 * Run via PowerShell on Windows (the Git-Bash nvm shim is broken — STOP-16).
 */
'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

function parseArgs(argv) {
  const out = { draft: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--draft') out.draft = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

// Minimal static-file server (no new dependency — Node's built-in http module). Serves `rootDir`
// on an OS-assigned ephemeral port (port 0). Returns { server, port, close() }.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const safeRelative = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
        const filePath = path.join(rootDir, safeRelative);
        // Never serve outside rootDir.
        if (!filePath.startsWith(path.resolve(rootDir))) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500);
        res.end('Server error');
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        close: () => new Promise((res2) => server.close(() => res2())),
      });
    });
  });
}

// ── The in-page capture function (serialised into the browser context) ──────────────────────────
// Reads every `[data-sgs-resolve-id]` element, groups by marker value, and for each element reads
// the resolved text content plus an optional icon `<path d>` (FR-31-26.2: markers, not document
// order — the runtime clones the marked item-template element once per resolved array item, so
// every rendered instance still carries the same marker value).
const CAPTURE_SRC = function () {
  const groups = {};
  document.querySelectorAll('[data-sgs-resolve-id]').forEach((el) => {
    const markerId = el.getAttribute('data-sgs-resolve-id');
    if (!markerId) return;
    const text = (el.textContent || '').trim();
    const pathEl = el.querySelector('path[d]');
    const item = { text };
    if (pathEl) {
      const d = pathEl.getAttribute('d');
      if (d) item.iconPath = d;
    }
    if (!groups[markerId]) groups[markerId] = [];
    groups[markerId].push(item);
  });
  return groups;
};

async function main() {
  const args = parseArgs(process.argv);
  if (!args.draft) {
    process.stderr.write('Usage: node resolve-js-content.js --draft <path> [--out <file>]\n');
    process.exit(2);
  }

  const draftAbs = path.resolve(args.draft);
  const rootDir = path.dirname(draftAbs);
  const fileName = path.basename(draftAbs);

  let serverHandle = null;
  let browser = null;
  try {
    if (!fs.existsSync(draftAbs)) {
      throw new Error('Draft file not found: ' + draftAbs);
    }

    serverHandle = await startServer(rootDir);
    const url = 'http://127.0.0.1:' + serverHandle.port + '/' + encodeURI(fileName);

    browser = await chromium.launch();
    const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    // Short settle timeout for any async component-mount logic (dc-import siblings, React
    // effects) that completes after the network goes idle.
    await page.waitForTimeout(1000);

    const groups = await page.evaluate('(' + CAPTURE_SRC.toString() + ')()');

    const json = JSON.stringify(groups, null, 2);
    if (args.out) fs.writeFileSync(args.out, json, 'utf8');
    process.stdout.write(json + '\n');
  } catch (e) {
    const message = (e && e.message) ? e.message : String(e);
    process.stdout.write(JSON.stringify({ error: message }) + '\n');
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (serverHandle) {
      await serverHandle.close().catch(() => {});
    }
  }
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ error: (e && e.message) ? e.message : String(e) }) + '\n');
  process.exit(1);
});
