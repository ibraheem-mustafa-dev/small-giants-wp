/**
 * no-inline-land-verify.js — reusable LANDED harness for the no-inline styling rollout.
 *
 * For a manifest of blocks, it:
 *   1. Serialises each block (with an ASYMMETRIC box instance) into WP block markup,
 *      concatenates them, and PUTs them onto an existing test page via the REST API.
 *   2. Loads that page in headless Chromium at 1440 / 768 / 375 and, per block:
 *        (a) scans the block root + every descendant for an INLINE CSS property
 *            declaration (a `--var: value` VALUE is allowed; `padding:`/`color:` etc.
 *            is a violation) — this is DONE-checklist condition #1;
 *        (b) reads getComputedStyle for the box families and compares to the expected
 *            per-breakpoint values — this is condition #10 (LANDED, not just emitted).
 *   3. Prints a compact PASS/FAIL table and exits non-zero on any failure.
 *
 * Usage:
 *   node no-inline-land-verify.js <manifest.json>
 *
 * Creds: parsed from .claude/secrets/sandybrown.env
 *   (WP_URL_SANDYBROWN, WP_USER_SANDYBROWN, WP_APP_PWD_SANDYBROWN).
 *
 * Manifest shape:
 *   { "pageId": 1356,
 *     "blocks": [
 *       { "slug": "sgs/label",
 *         "rootSelector": ".wp-block-sgs-label",
 *         "attrs": { ...block attributes incl. the asymmetric box instance... },
 *         "expected": {
 *            "desktop": { "padding": "5px 17px 9px 23px", "margin": "...", "borderRadius": "..." },
 *            "tablet":  { ... },
 *            "mobile":  { ... }
 *         } } ] }
 *   Any expected key omitted for a breakpoint is not asserted (e.g. margin unset).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// --- creds -----------------------------------------------------------------
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../.claude/secrets/sandybrown.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return {
    url: env.WP_URL_SANDYBROWN.replace(/\/$/, ''),
    user: env.WP_USER_SANDYBROWN,
    appPwd: env.WP_APP_PWD_SANDYBROWN,
  };
}

// --- block serialisation ---------------------------------------------------
// Dynamic SGS blocks (save() => null) serialise as a self-closing comment.
function serialiseBlock(b) {
  const json = JSON.stringify(b.attrs || {});
  return `<!-- wp:${b.slug.replace(/^sgs\//, 'sgs/')} ${json} /-->`;
}

async function pushContent(creds, pageId, content) {
  const auth = 'Basic ' + Buffer.from(`${creds.user}:${creds.appPwd}`).toString('base64');
  const res = await fetch(`${creds.url}/wp-json/wp/v2/pages/${pageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ content, status: 'publish' }),
  });
  if (!res.ok) {
    throw new Error(`REST PUT failed: ${res.status} ${res.statusText}\n${await res.text()}`);
  }
  const data = await res.json();
  return data.link;
}

// --- inline-declaration scan (runs in the page) ----------------------------
// Returns an array of {tag, style} for any element whose inline style carries a
// REAL property declaration (not a --custom-property value).
const INLINE_SCAN = (rootSel) => {
  const root = document.querySelector(rootSel);
  if (!root) return { found: false, violations: [] };
  const violations = [];
  const els = [root, ...root.querySelectorAll('*')];
  for (const el of els) {
    const s = el.getAttribute('style');
    if (!s) continue;
    for (const decl of s.split(';')) {
      const d = decl.trim();
      if (!d) continue;
      const colon = d.indexOf(':');
      if (colon < 0) continue;
      const prop = d.slice(0, colon).trim();
      if (prop.startsWith('--')) continue; // custom-property VALUE — allowed
      violations.push({ tag: el.tagName.toLowerCase(), decl: d });
    }
  }
  return { found: true, violations };
};

const READ_BOX = (rootSel) => {
  const el = document.querySelector(rootSel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const sides4 = (p) => [cs[`${p}Top`], cs[`${p}Right`], cs[`${p}Bottom`], cs[`${p}Left`]].join(' ');
  return {
    padding: sides4('padding'),
    margin: sides4('margin'),
    // Block-controlled margin axis. On a constrained-layout page WP core forces
    // margin-left/right:auto !important (block centering) — no block can override
    // that (inline OR scoped), so left/right is NOT a block-fidelity signal; top/
    // bottom is. Assert marginTB, not full margin, for top-level blocks.
    marginTB: [cs.marginTop, cs.marginBottom].join(' '),
    borderRadius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '),
  };
};

const VIEWPORTS = { desktop: 1440, tablet: 768, mobile: 375 };

// Normalise "5px 17px 9px 23px" and a computed "5px 17px 9px 23px" for compare.
function norm(v) { return String(v).trim().replace(/\s+/g, ' '); }

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) { console.error('Usage: node no-inline-land-verify.js <manifest.json>'); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const creds = loadEnv();
  const pageId = manifest.pageId || 1356;

  const content = manifest.blocks.map(serialiseBlock).join('\n\n');
  process.stdout.write(`Pushing ${manifest.blocks.length} test blocks to page ${pageId}…\n`);
  const link = await pushContent(creds, pageId, content);
  process.stdout.write(`Published: ${link}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = []; // {slug, bp, rendered, inlineViolations, boxDiffs}
  try {
    for (const [bpName, width] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      await page.goto(`${link}?_cb=${Date.now()}`, { waitUntil: 'networkidle', timeout: 45000 });
      for (const b of manifest.blocks) {
        const scan = await page.evaluate(INLINE_SCAN, b.rootSelector);
        const box = await page.evaluate(READ_BOX, b.rootSelector);
        const exp = (b.expected && b.expected[bpName]) || {};
        const boxDiffs = [];
        if (box) {
          for (const fam of ['padding', 'margin', 'marginTB', 'borderRadius']) {
            if (exp[fam] != null && norm(box[fam]) !== norm(exp[fam])) {
              boxDiffs.push(`${fam}: got "${box[fam]}" want "${exp[fam]}"`);
            }
          }
        }
        results.push({
          slug: b.slug, bp: bpName,
          rendered: scan.found && box != null,
          inlineViolations: scan.found ? scan.violations : [],
          boxDiffs,
        });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  // --- report ---
  let anyFail = false;
  const bySlug = {};
  for (const r of results) { (bySlug[r.slug] ||= []).push(r); }
  process.stdout.write('\n=== LANDED verify — no-inline + box computed values ===\n');
  for (const [slug, rows] of Object.entries(bySlug)) {
    const notRendered = rows.filter((r) => !r.rendered).map((r) => r.bp);
    const inlineBad = rows.filter((r) => r.inlineViolations.length);
    const boxBad = rows.filter((r) => r.boxDiffs.length);
    const ok = notRendered.length === 0 && inlineBad.length === 0 && boxBad.length === 0;
    if (!ok) anyFail = true;
    process.stdout.write(`\n${ok ? 'PASS' : 'FAIL'}  ${slug}\n`);
    if (notRendered.length) process.stdout.write(`   not rendered @ ${notRendered.join(', ')} (check required content attrs)\n`);
    for (const r of inlineBad) {
      process.stdout.write(`   inline @ ${r.bp}: ${r.inlineViolations.map((v) => `${v.tag}{${v.decl}}`).join(', ')}\n`);
    }
    for (const r of boxBad) {
      process.stdout.write(`   box @ ${r.bp}: ${r.boxDiffs.join(' | ')}\n`);
    }
  }
  process.stdout.write(`\n${anyFail ? 'RESULT: FAIL' : 'RESULT: ALL PASS'}\n`);
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
