#!/usr/bin/env node
// Records every media paint of each URL at 375, 768 and 1440 (Spec 49 AC-25 BEFORE/AFTER capture).
// Usage: node capture.mjs --base URL --label NAME --out DIR [--urls FILE] [--rate SECONDS] [--workers N]
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, VIEWPORTS, pageStem, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.base || !args.out) {
  console.error('Usage: node capture.mjs --base URL --label NAME --out DIR [--urls FILE] [--rate SECONDS] [--workers N]');
  process.exit(2);
}
const base = String(args.base).replace(/\/+$/, '');
const rate = Number(args.rate || 0) * 1000;
const workers = Math.max(1, Number(args.workers || 1));
const label = args.label || 'capture';
fs.mkdirSync(args.out, { recursive: true });

let paths = ['/'];
if (args.urls) {
  paths = fs.readFileSync(args.urls, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => (/^https?:/.test(l) ? new URL(l).pathname + new URL(l).search : l));
}
paths = [...new Set(paths)];

/** Runs inside the page: returns every media paint. */
function collect() {
  const scrollX = window.scrollX, scrollY = window.scrollY;
  const out = [];
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const fileKey = (u) => {
    if (!u) return '';
    if (u.startsWith('data:')) return 'data-' + hash(u.slice(0, 400));
    let p = u.split('#')[0].split('?')[0];
    try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
    let name = p.split('/').pop().replace(/\.[A-Za-z0-9]{2,5}$/, '');
    for (let i = 0; i < 4; i++) name = name.replace(/-\d+x\d+$/, '').replace(/-scaled$/, '').replace(/-e\d{10,}$/, '');
    return name.toLowerCase();
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: +(r.left + scrollX).toFixed(2), y: +(r.top + scrollY).toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
  };
  const ctxOf = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cls = [...(n.classList || [])];
      const wp = cls.find((c) => /^wp-block-sgs-[\w-]+$/.test(c));
      if (wp) return wp;
      const sg = cls.find((c) => /^sgs-[a-z0-9-]+$/.test(c) && !c.includes('__'));
      if (sg) return sg;
    }
    return '';
  };
  const hiddenAncestor = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { if (getComputedStyle(n).display === 'none') return true; } return false; };
  const sel = (el, pseudo) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + (pseudo || '');
  const splitTop = (s) => { const parts = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur.trim()); return parts; };

  for (const el of document.querySelectorAll('img, video, iframe, svg')) {
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    const box = rectOf(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || box.width <= 0 || box.height <= 0 || hiddenAncestor(el)) continue;
    let kind = tag, key = '', src = '';
    if (tag === 'img') { src = el.currentSrc || el.src; key = fileKey(src); }
    else if (tag === 'video') { src = el.currentSrc || el.src || el.querySelector('source')?.src || el.poster || ''; key = fileKey(src) || fileKey(el.poster); }
    else if (tag === 'iframe') { src = el.src || ''; try { const u = new URL(src, location.href); key = (u.hostname + u.pathname).toLowerCase().replace(/\/+$/, ''); } catch (e) { key = src; } }
    else {
      if (el.parentElement && el.parentElement.closest('svg')) continue;
      if (box.width < 64 && box.height < 64) continue;
      if (el.closest('.sgs-icon, button, nav, [class*="sgs-icon"]')) continue;
      const vb = el.getAttribute('viewBox') || '';
      const d = (el.querySelector('path')?.getAttribute('d') || '').slice(0, 60);
      key = 'svg-' + hash(vb + '|' + d); kind = 'svg';
    }
    out.push({ kind, key, src, box, fit: cs.objectFit, position: cs.objectPosition, context: ctxOf(el), selector: sel(el) });
  }

  for (const el of document.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'IMG', 'VIDEO', 'IFRAME'].includes(el.tagName) || el.closest('svg')) continue;
    const cs0 = getComputedStyle(el);
    if (cs0.display === 'none') continue;
    for (const pseudo of [null, '::before', '::after']) {
      const cs = pseudo ? getComputedStyle(el, pseudo) : cs0;
      if (pseudo && (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none')) continue;
      const bi = cs.backgroundImage;
      if (!bi || bi === 'none' || !bi.includes('url(')) continue;
      const box = rectOf(el);
      if (box.width <= 0 || box.height <= 0 || cs.visibility === 'hidden' || hiddenAncestor(el)) continue;
      const layers = splitTop(bi), sizes = splitTop(cs.backgroundSize), poss = splitTop(cs.backgroundPosition), reps = splitTop(cs.backgroundRepeat), atts = splitTop(cs.backgroundAttachment);
      layers.forEach((layer, i) => {
        const m = layer.match(/url\((["']?)(.*?)\1\)/);
        if (!m) return;
        const at = (a) => a[i % a.length] || a[0] || '';
        out.push({ kind: 'bg', key: fileKey(m[2]), src: m[2], box, pseudo: pseudo || 'element', bgSize: at(sizes), bgPosition: at(poss), bgRepeat: at(reps), bgAttachment: at(atts), context: ctxOf(el), selector: sel(el, pseudo) });
      });
    }
  }
  return { paints: out, docHeight: document.documentElement.scrollHeight };
}

async function autoScroll(page, vh) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = Math.min(80, Math.ceil(h / (vh * 0.8)) + 1);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * vh * 0.8);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
}

const { chromium } = loadPlaywright();
const queue = paths.flatMap((p) => VIEWPORTS.map((v) => ({ p, v })));
let lastHit = 0;
const stats = { pages: new Set(), paints: 0, errors: 0, files: 0, bad: [] };
const t0 = Date.now();

async function throttle() {
  if (!rate) return;
  const wait = lastHit + rate - Date.now();
  lastHit = Math.max(Date.now(), lastHit + rate);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function worker(browser) {
  const ctxs = {};
  for (const v of VIEWPORTS) ctxs[v.name] = await browser.newContext({ viewport: { width: v.width, height: v.height }, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
  for (;;) {
    const job = queue.shift();
    if (!job) break;
    const { p, v } = job;
    const page = await ctxs[v.name].newPage();
    const consoleErrors = [], failed = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e.message).slice(0, 300)));
    page.on('response', (r) => { if (r.status() >= 400) failed.push({ status: r.status(), url: r.url().slice(0, 200) }); });
    const url = base + p;
    let status = 0, error = null, result = { paints: [], docHeight: 0 };
    try {
      await throttle();
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      status = resp ? resp.status() : 0;
      await autoScroll(page, v.height);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); setTimeout(r, 4000); })))).catch(() => {});
      await page.waitForTimeout(300);
      result = await page.evaluate(collect);
    } catch (e) { error = String(e.message).slice(0, 300); }
    const rec = { label, base, path: p, url, viewport: v.name, status, error, consoleErrors, failedRequests: failed, docHeight: result.docHeight, paints: result.paints };
    fs.writeFileSync(path.join(args.out, `${pageStem(p)}.${v.name}.json`), JSON.stringify(rec, null, 1));
    stats.pages.add(p); stats.files++; stats.paints += result.paints.length; stats.errors += consoleErrors.length;
    if (error || status >= 400 || !status) stats.bad.push({ path: p, vp: v.name, status, error });
    await page.close();
  }
}

const browser = await chromium.launch();
await Promise.all(Array.from({ length: workers }, () => worker(browser)));
await browser.close();
const secs = Math.round((Date.now() - t0) / 1000);
const summary = { label, base, pages: stats.pages.size, files: stats.files, paints: stats.paints, consoleErrors: stats.errors, badPages: stats.bad, seconds: secs };
fs.writeFileSync(path.join(args.out, '_summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
