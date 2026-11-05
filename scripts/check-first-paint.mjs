#!/usr/bin/env node
// First-paint gate against a LIVE site (plans/2026-11-04-clean-first-paint.md, F-lite).
//   node scripts/check-first-paint.mjs --site <target> [--check] [--update-baseline] [--json out]
//        [--only cls,css,look,name] [--pages /,/shop/] [--runs 3]
// Checks: CLS (largest session window), late CSS in the delivered HTML, JS-off look (report-only),
// stylesheet-name stability. Data: scripts/data/first-paint.json. Runs strictly one load at a time.
import { chromium } from './computed-route/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.FIRST_PAINT_DATA || path.join(HERE, 'data', 'first-paint.json');
const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const siteKey = opt('site');
const only = new Set(String(opt('only', 'cls,css,look,name')).split(','));
const CHECK = args.includes('--check');
const UPDATE = args.includes('--update-baseline');
const RUNS = Number(opt('runs', 3));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const site = data.sites[siteKey];
if (!site) { console.error(`unknown --site ${siteKey}; known: ${Object.keys(data.sites).join(', ')}`); process.exit(2); }
const pages = opt('pages') ? String(opt('pages')).split(',') : site.pages;
const LIMIT = data.cls.limit, TOL = data.cls.tolerance;
const bust = (u) => u + (u.includes('?') ? '&' : '?') + 'cb=' + Date.now() + Math.floor(Math.random() * 1000);

// ---------- CLS ----------
const OBSERVER = () => {
  window.__ls = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__ls.push({ t: e.startTime, v: e.value, n: e.sources.map((s) => { let n = s.node; if (n && n.nodeType !== 1) n = n.parentElement; return n ? n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '') : '?'; }) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

function largestWindow(entries) {
  let best = 0, cur = 0, start = 0, last = -1e9;
  for (const e of entries) { if (e.t - last > 1000 || e.t - start > 5000) { cur = 0; start = e.t; } cur += e.v; last = e.t; if (cur > best) best = cur; }
  return best;
}

async function clsLoad(br, url, w, h, throttled) {
  const ctx = await br.newContext({ viewport: { width: w, height: h } });
  try {
    const pg = await ctx.newPage();
    const c = await ctx.newCDPSession(pg);
    await c.send('Network.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (throttled) {
      await c.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 7e5 / 8 });
      await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await pg.addInitScript(OBSERVER);
    await pg.goto(bust(url), { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(throttled ? 5000 : 3000);
    const ls = await pg.evaluate(() => window.__ls || []);
    const by = {};
    for (const e of ls) for (const n of e.n) by[n] = (by[n] || 0) + e.v;
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    return { cls: largestWindow(ls), top: top ? `${top[0]} (${top[1].toFixed(3)})` : '-' };
  } finally { await ctx.close(); }
}

async function clsPage(br, p, w, h) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await clsLoad(br, site.url + p, w, h, false));
  runs.sort((a, b) => a.cls - b.cls);
  const med = runs[Math.floor(runs.length / 2)];
  const thr = await clsLoad(br, site.url + p, w, h, true);
  const worst = thr.cls > med.cls ? thr : med;
  return { score: +worst.cls.toFixed(3), median: +med.cls.toFixed(3), throttled: +thr.cls.toFixed(3), top: worst.top };
}

// ---------- Late CSS ----------
function lateCss(html) {
  const found = [];
  const cut = html.search(/<\/head\s*>/i);
  const attr = (tag, n) => { const m = tag.match(new RegExp('\\s' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return m ? (m[2] ?? m[3] ?? m[4]) : null; };
  let styleN = 0;
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    const hasOnload = /\sonload\s*=/i.test(tag);
    const isSheet = rel.includes('stylesheet') || (rel.includes('preload') && (attr(tag, 'as') || '').toLowerCase() === 'style' && hasOnload);
    if (!isSheet) continue;
    const handle = attr(tag, 'id') || (attr(tag, 'href') || '').split('?')[0].split('/').pop();
    if (cut >= 0 && m.index > cut) found.push({ kind: 'link-after-head', handle });
    if (hasOnload && (/media\s*=\s*["']?print/i.test(tag) || rel.includes('preload'))) found.push({ kind: 'onload-swap', handle });
  }
  for (const m of html.matchAll(/<style\b[^>]*>/gi)) {
    styleN++;
    if (cut >= 0 && m.index > cut) found.push({ kind: 'style-after-head', handle: attr(m[0], 'id') || `inline#${styleN}` });
  }
  return found;
}

// ---------- Stylesheet name ----------
const collectedName = (html) => {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) if (/id=["']sgs-blocks-collected-css["']/.test(m[0])) { const h = m[0].match(/href=["']([^"']+)["']/); return h ? h[1].split('/').pop().split('?')[0] : null; }
  return null;
};

async function rawHtml(ctx, ua, url) {
  const r = await ctx.request.get(bust(url), { headers: { 'user-agent': ua, 'cache-control': 'no-cache', pragma: 'no-cache' }, timeout: 60000 });
  return { status: r.status(), html: await r.text() };
}

// ---------- JS-off look ----------
const BANDS = 8;
async function shot(br, url, w, h, js) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js, reducedMotion: 'reduce' });
  try {
    const pg = await ctx.newPage();
    await pg.goto(bust(url), { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(js ? 3000 : 1000);
    await pg.addStyleTag({ content: '[data-sgs-fx~="marquee"],[data-sgs-fx~="marquee"] *{visibility:hidden!important}*{animation:none!important;transition:none!important}' }).catch(() => {});
    return await pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  } finally { await ctx.close(); }
}
async function diffBands(pg, a, b) {
  return pg.evaluate(async ([A, B, bands]) => {
    const load = async (s) => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return x.getImageData(0, 0, bm.width, bm.height); };
    const [ia, ib] = [await load(A), await load(B)];
    const out = []; const bh = Math.floor(ia.height / bands);
    for (let k = 0; k < bands; k++) {
      let d = 0, n = 0;
      for (let y = k * bh; y < (k + 1) * bh; y++) for (let x = 0; x < ia.width; x++) { const i = (y * ia.width + x) * 4; n++; if (Math.abs(ia.data[i] - ib.data[i]) + Math.abs(ia.data[i + 1] - ib.data[i + 1]) + Math.abs(ia.data[i + 2] - ib.data[i + 2]) > 48) d++; }
      out.push(+(100 * d / n).toFixed(1));
    }
    return out;
  }, [a.toString('base64'), b.toString('base64'), BANDS]);
}

// ---------- main ----------
const fails = [];
const report = { site: siteKey, cls: [], lateCss: [], look: [], name: [] };
const key = (p, w) => `${p}@${w}`;
const base = (data.baseline[siteKey] ||= {});
const changed = [];
const row = (...c) => c.map((x, i) => String(x).padEnd([34, 6, 8, 8, 10, 0][i] ?? 0)).join(' ');
if (args.includes('--selftest')) {
  const bad = [];
  const expect = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
  const clean = '<html><head><link rel="stylesheet" id="a" href="/a.css"><style id="s">x{}</style></head><body><p>hi</p></body></html>';
  expect('clean head passes', lateCss(clean), []);
  expect('link after head', lateCss(clean.replace('<p>', '<link rel="stylesheet" id="late" href="/l.css"><p>')), [{ kind: 'link-after-head', handle: 'late' }]);
  expect('style after head', lateCss(clean.replace('<p>', '<style>y{}</style><p>')), [{ kind: 'style-after-head', handle: 'inline#2' }]);
  expect('print swap', lateCss(clean.replace('<style', `<link rel="stylesheet" id="sw" href="/s.css" media="print" onload="this.media='all'"><style`)), [{ kind: 'onload-swap', handle: 'sw' }]);
  expect('preload swap', lateCss(clean.replace('<style', `<link rel="preload" as="style" id="pl" href="/p.css" onload="this.rel='stylesheet'"><style`)), [{ kind: 'onload-swap', handle: 'pl' }]);
  expect('window: shifts 0.1+0.1 within 1s gap', +largestWindow([{ t: 0, v: 0.1 }, { t: 500, v: 0.1 }]).toFixed(2), 0.2);
  expect('window: 1s gap splits', +largestWindow([{ t: 0, v: 0.1 }, { t: 1500, v: 0.05 }]).toFixed(2), 0.1);
  expect('window: capped at 5s', +largestWindow([0, 900, 1800, 2700, 3600, 4500, 5400].map((t) => ({ t, v: 0.1 }))).toFixed(2), 0.6);
  expect('collected name', collectedName('<link rel="stylesheet" id="sgs-blocks-collected-css" href="https://x/sgs-css/sgs-1-abc.css?v=2">'), 'sgs-1-abc.css');
  expect('collected name absent', collectedName('<p>'), null);
  console.log(bad.length ? ['SELFTEST FAIL', ...bad].join(String.fromCharCode(10)) : 'selftest pass (10 cases)');
  process.exit(bad.length ? 1 : 0);
}

const br = await chromium.launch();
const ua = await (async () => { const c = await br.newContext(); const p = await c.newPage(); const u = await p.evaluate(() => navigator.userAgent); await c.close(); return u; })();
const ctx0 = await br.newContext({ userAgent: ua });

if (only.has('cls')) {
  console.log('\nCLS (largest session window; score = max(median of ' + RUNS + ' unthrottled, 1 throttled))');
  console.log(row('page', 'width', 'score', 'limit', 'verdict', 'top shifting element'));
  for (const p of pages) for (const [w, h] of data.widths) {
    const r = await clsPage(br, p, w, h);
    const b = base[key(p, w)];
    const limit = +Math.max(LIMIT, b === undefined ? LIMIT : b + TOL).toFixed(3);
    const ok = r.score <= limit;
    const verdict = ok ? (r.score > LIMIT ? 'pass*' : 'pass') : 'FAIL';
    if (!ok) fails.push(`CLS ${p}@${w}: ${r.score} > ${limit}`);
    console.log(row(p, w, r.score, limit, verdict, r.top));
    report.cls.push({ page: p, width: w, ...r, limit, verdict, baseline: b ?? null });
    if (UPDATE && (b === undefined || r.score < b)) { changed.push(`baseline ${siteKey} ${key(p, w)}: ${b ?? 'none'} -> ${r.score}`); base[key(p, w)] = r.score; }
  }
  console.log('(pass* = above the ' + LIMIT + ' target but within its baseline)');
}

if (only.has('css')) {
  console.log('\nLATE CSS (raw delivered HTML)');
  const allow = data.lateCssAllowlist.filter((a) => a.site === siteKey);
  for (const p of pages) {
    const { status, html } = await rawHtml(ctx0, ua, site.url + p);
    const hits = lateCss(html).filter((h) => !allow.some((a) => a.page === p && a.handle === h.handle));
    console.log(`${p}  HTTP ${status}  ${hits.length ? 'FAIL' : 'pass'}`);
    for (const h of hits) { console.log(`   ${h.kind.padEnd(17)} ${h.handle}`); fails.push(`late CSS ${p}: ${h.kind} ${h.handle}`); }
    if (status !== 200) fails.push(`late CSS ${p}: HTTP ${status}`);
    report.lateCss.push({ page: p, status, hits });
  }
}

if (only.has('look')) {
  console.log('\nJS-OFF LOOK (report only): % of pixels differing per horizontal band, top to bottom, marquee hidden');
  const helper = await (await br.newContext()).newPage();
  for (const p of pages) for (const [w, h] of data.widths) {
    const bands = await diffBands(helper, await shot(br, site.url + p, w, h, false), await shot(br, site.url + p, w, h, true));
    console.log(row(p, w, '') + bands.join(' '));
    report.look.push({ page: p, width: w, bands });
  }
}

if (only.has('name')) {
  console.log('\nCOLLECTED STYLESHEET NAME (two uncached fetches)');
  for (const p of pages) {
    const a = collectedName((await rawHtml(ctx0, ua, site.url + p)).html);
    const b = collectedName((await rawHtml(ctx0, ua, site.url + p)).html);
    const ok = a !== null && a === b;
    console.log(`${p}  ${ok ? 'pass' : 'FAIL'}  ${a}  ${b}`);
    if (!ok) fails.push(`stylesheet name ${p}: ${a} vs ${b}`);
    report.name.push({ page: p, a, b, ok });
  }
}

await br.close();
if (UPDATE) {
  if (changed.length) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n'); console.log('\n' + changed.join('\n')); }
  else console.log('\nno baseline lowered');
}
if (opt('json')) fs.writeFileSync(String(opt('json')), JSON.stringify({ ...report, fails }, null, 1));
console.log(`\n${fails.length ? fails.length + ' failure(s)' : 'all checks pass'}`);
process.exit(CHECK && fails.length ? 1 : 0);
