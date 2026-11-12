#!/usr/bin/env node
// Page-weight gate against a LIVE site (.claude/plans/archive/2026-11-03-page-weight-budget.md, "Gate").
//   node scripts/check-page-weight.mjs --site <target> [--check] [--update-baseline] [--json out]
//        [--pages /,/shop/] [--runs 3] [--width 1440]
//   node scripts/check-page-weight.mjs --selftest
// Sums the transferred (compressed) bytes of every CSS and JS response from the site's own origin that a cold page
// load makes, including late loads after a scroll to network idle, and takes the median of --runs loads per page.
// Third-party files (payment forms, captchas) are reported beside the verdict but never judged. "Own" means the
// origin the page finally loaded from (after redirects) plus any `assetOrigins` the site lists (a CDN host).
// A page that answers 400 or above is not measured: the run stops with exit code 2.
// Verdict per page and kind (css, js): a page over budget fails when it exceeds its baseline plus
// the tolerance (the baseline only ratchets down); a page under budget fails when it goes over budget.
// Data: scripts/data/page-weight.json. Runs strictly one load at a time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.PAGE_WEIGHT_DATA || path.join(HERE, 'data', 'page-weight.json');
const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const KB = 1024;

/** Classify one response as 'css', 'js' or null from its resource type, then its content type, then its URL. */
export function kindOf(resourceType, contentType, url) {
  if (resourceType === 'stylesheet') return 'css';
  if (resourceType === 'script') return 'js';
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/css')) return 'css';
  if (ct.includes('javascript') || ct.includes('ecmascript')) return 'js';
  const p = String(url || '').split(/[?#]/)[0].toLowerCase();
  if (p.endsWith('.css')) return 'css';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'js';
  return null;
}

/** Sum responses [{kind, bytes, url, thirdParty}] into {css, js, cssFiles, jsFiles, thirdPartyCss, thirdPartyJs}; a URL
 *  counted twice is counted once. Only the site's own files count towards css/js: third-party files (another origin,
 *  such as a payment provider's form or a captcha) are summed apart and never judged, because SGS cannot shrink them. */
export function sumWeights(responses) {
  const seen = new Set();
  const out = { css: 0, js: 0, cssFiles: 0, jsFiles: 0, thirdPartyCss: 0, thirdPartyJs: 0 };
  for (const r of responses) {
    if (!r.kind || seen.has(r.url)) continue;
    seen.add(r.url);
    if (r.thirdParty) { out[r.kind === 'css' ? 'thirdPartyCss' : 'thirdPartyJs'] += r.bytes; continue; }
    out[r.kind] += r.bytes;
    out[r.kind + 'Files'] += 1;
  }
  return out;
}

/** Verdict for one measured value (bytes) against the budget (bytes), its baseline (bytes or undefined) and the tolerance. */
export function judge(value, budget, baseline, tolerance) {
  if (value <= budget) return { ok: true, why: 'under budget' };
  if (baseline === undefined || baseline === null) return { ok: false, why: 'over budget with no baseline' };
  if (baseline <= budget) return { ok: false, why: 'over budget (its baseline was under)' };
  if (value > baseline + tolerance) return { ok: false, why: `over baseline ${(baseline / KB).toFixed(1)} KB + tolerance` };
  return { ok: true, why: 'over budget, within baseline (known debt)' };
}

/** New baseline: only ever lowers; a missing baseline takes the measured value. */
export function ratchet(oldBaseline, value) {
  return oldBaseline === undefined || oldBaseline === null ? value : Math.min(oldBaseline, value);
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function selftest() {
  const cases = [];
  const eq = (name, got, want) => cases.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);
  eq('stylesheet by resource type', kindOf('stylesheet', '', 'x'), 'css');
  eq('module script by content type', kindOf('fetch', 'text/javascript; charset=utf-8', 'x'), 'js');
  eq('css by extension with query', kindOf('other', '', 'https://a/b.css?ver=1'), 'css');
  eq('image is neither', kindOf('image', 'image/webp', 'a.webp'), null);
  eq('sum dedupes a repeated URL', sumWeights([{ kind: 'css', bytes: 10, url: 'a' }, { kind: 'css', bytes: 10, url: 'a' }, { kind: 'js', bytes: 5, url: 'b' }, { kind: null, bytes: 99, url: 'c' }]), { css: 10, js: 5, cssFiles: 1, jsFiles: 1, thirdPartyCss: 0, thirdPartyJs: 0 });
  eq('third-party bytes are kept apart', sumWeights([{ kind: 'js', bytes: 7, url: 'a' }, { kind: 'js', bytes: 900, url: 'https://js.stripe.com/x.js', thirdParty: true }]), { css: 0, js: 7, cssFiles: 0, jsFiles: 1, thirdPartyCss: 0, thirdPartyJs: 900 });
  eq('under budget passes', judge(90 * KB, 100 * KB, 200 * KB, 3 * KB).ok, true);
  eq('debt within baseline passes', judge(195 * KB, 100 * KB, 194 * KB, 3 * KB).ok, true);
  eq('regression over baseline fails', judge(198 * KB, 100 * KB, 194 * KB, 3 * KB).ok, false);
  eq('over budget, no baseline fails', judge(120 * KB, 100 * KB, undefined, 3 * KB).ok, false);
  eq('once under budget, going over fails', judge(101 * KB, 100 * KB, 95 * KB, 3 * KB).ok, false);
  eq('ratchet never raises', ratchet(100, 120), 100);
  eq('ratchet lowers', ratchet(100, 80), 80);
  eq('ratchet seeds', ratchet(undefined, 80), 80);
  eq('median of three', median([3, 1, 2]), 2);
  let bad = 0;
  for (const [n, ok, got, want] of cases) { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); }
  console.log(`${cases.length - bad}/${cases.length} self-test cases pass`);
  process.exit(bad ? 1 : 0);
}

async function measure(chromium, url, width, assetOrigins = []) {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width, height: 900 } });
  try {
    const pg = await ctx.newPage();
    const responses = [];
    const pending = [];
    pg.on('requestfinished', (req) => {
      pending.push((async () => {
        const res = await req.response().catch(() => null);
        if (!res) return;
        const kind = kindOf(req.resourceType(), res.headers()['content-type'], req.url());
        if (!kind) return;
        const sizes = await req.sizes().catch(() => null);
        // Transferred = response body as received on the wire (compressed) plus headers, as the browser counts transferSize.
        const bytes = sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0;
        responses.push({ kind, bytes, url: req.url(), origin: new URL(req.url()).origin });
      })());
    });
    const bust = url + (url.includes('?') ? '&' : '?') + 'pwcb=' + Date.now();
    const doc = await pg.goto(bust, { waitUntil: 'load', timeout: 90000 });
    // An error page, a 404 or a bot challenge is light and would pass (or ratchet a baseline down): refuse it.
    if (!doc || doc.status() >= 400) throw new Error(`${url} answered ${doc ? doc.status() : 'nothing'}; not measured`);
    const own = new Set([new URL(pg.url()).origin, ...assetOrigins]);
    await pg.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    // Scroll down a viewport at a time, then back, so scripts and styles that load as a section comes into view count.
    await pg.evaluate(async () => {
      const pause = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(window.innerHeight * 0.8)) { window.scrollTo(0, y); await pause(250); }
      window.scrollTo(0, document.documentElement.scrollHeight); await pause(800); window.scrollTo(0, 0);
    });
    await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await Promise.all(pending);
    for (const r of responses) r.thirdParty = !own.has(r.origin);
    return { ...sumWeights(responses), files: responses.map((r) => ({ kind: r.kind, kb: +(r.bytes / KB).toFixed(1), thirdParty: !!r.thirdParty, url: r.thirdParty ? r.url : r.url.replace(/^https?:\/\/[^/]+/, '') })) };
  } finally { await ctx.close(); await br.close(); }
}

async function main() {
  if (args.includes('--selftest')) return selftest();
  const { chromium } = await import('./computed-route/node_modules/playwright/index.mjs');
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const siteKey = opt('site');
  const site = data.sites[siteKey];
  if (!site) { console.error(`unknown --site ${siteKey}; known: ${Object.keys(data.sites).join(', ')}`); process.exit(2); }
  const CHECK = args.includes('--check');
  const UPDATE = args.includes('--update-baseline');
  const RUNS = Number(opt('runs', 3));
  const WIDTH = Number(opt('width', data.width || 1440));
  const pages = opt('pages') ? String(opt('pages')).split(',') : site.pages;
  if (UPDATE && (WIDTH !== (data.width || 1440) || RUNS !== 3)) { console.error(`--update-baseline needs the data file's width (${data.width || 1440}) and 3 runs, since baselines are kept for that measurement only`); process.exit(2); }
  const budget = { css: data.budgetKb.css * KB, js: data.budgetKb.js * KB };
  const tol = data.toleranceKb * KB;
  const base = (data.baseline[siteKey] ||= {});
  const report = { site: siteKey, when: new Date().toISOString(), width: WIDTH, runs: RUNS, pages: {} };
  let failed = 0;
  console.log(`page weight  ${siteKey}  ${WIDTH}px  median of ${RUNS}  budget CSS ${data.budgetKb.css} KB / JS ${data.budgetKb.js} KB (transferred)`);
  for (const p of pages) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(chromium, site.url + p, WIDTH, site.assetOrigins || []));
    const css = median(runs.map((r) => r.css)), js = median(runs.map((r) => r.js));
    const last = runs[runs.length - 1];
    const row = { css, js, cssFiles: last.cssFiles, jsFiles: last.jsFiles, thirdPartyKb: +((median(runs.map((r) => r.thirdPartyCss + r.thirdPartyJs))) / KB).toFixed(1), files: last.files.sort((a, b) => b.kb - a.kb) };
    for (const kind of ['css', 'js']) {
      const b = base[p] ? base[p][kind] : undefined;
      const v = judge(row[kind], budget[kind], b, tol);
      row[kind + 'Verdict'] = v;
      if (!v.ok) failed++;
    }
    report.pages[p] = row;
    const fmt = (k) => `${k.toUpperCase()} ${(row[k] / KB).toFixed(1).padStart(6)} KB (${row[k + 'Files']} files) ${row[k + 'Verdict'].ok ? 'ok  ' : 'FAIL'} ${row[k + 'Verdict'].why}`;
    console.log(`  ${p.padEnd(42)} ${fmt('css')}  |  ${fmt('js')}  |  third-party ${row.thirdPartyKb} KB (not judged)`);
    if (UPDATE) base[p] = { css: ratchet(base[p]?.css, css), js: ratchet(base[p]?.js, js), date: new Date().toISOString().slice(0, 10) };
  }
  if (opt('json')) fs.writeFileSync(String(opt('json')), JSON.stringify(report, null, 2));
  if (UPDATE) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n'); console.log(`baseline updated (only lowered) in ${path.relative(process.cwd(), DATA)}`); }
  if (CHECK && failed) { console.log(`${failed} page-weight verdict(s) failed`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(2); });
