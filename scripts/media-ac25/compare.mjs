#!/usr/bin/env node
// Compares two capture folders (Spec 49 AC-25). Exit 1 when any unallowed difference exists.
// Usage: node compare.mjs BEFORE_DIR AFTER_DIR [--allow FILE] [--tolerance PX] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, globToRe } from './lib.mjs';

/** Normalise a paint to {kind, w, h, fit, px, py, repeat, attachment}. */
export function normalise(p) {
  const isBg = p.kind === 'bg';
  const fit = isBg ? bgFit(p.bgSize) : (p.fit || 'fill');
  const pos = isBg ? p.bgPosition : p.position;
  const [x, y] = parsePosition(pos || (isBg ? '0% 0%' : '50% 50%'));
  return {
    w: p.box.width, h: p.box.height, x: p.box.x, y: p.box.y, fit,
    size: isBg && fit === 'size' ? p.bgSize : '',
    px: x, py: y,
    repeat: isBg ? firstWord(p.bgRepeat) === 'no-repeat' ? 'no-repeat' : p.bgRepeat : 'no-repeat',
    attachment: isBg ? p.bgAttachment : 'scroll',
  };
}
const firstWord = (s) => String(s || '').trim().split(/\s+/)[0];
function bgFit(s) {
  const v = String(s || '').trim();
  if (v === 'cover' || v === 'contain') return v;
  if (v === 'auto' || v === 'auto auto') return 'none';
  return 'size';
}
function parseOne(tok) {
  if (tok === 'left' || tok === 'top') return { f: 0 };
  if (tok === 'center') return { f: 0.5 };
  if (tok === 'right' || tok === 'bottom') return { f: 1 };
  if (tok.endsWith('%')) return { f: parseFloat(tok) / 100 };
  if (tok.endsWith('px')) return { px: parseFloat(tok) };
  return { f: 0.5 };
}
function parsePosition(s) {
  const t = String(s).trim().split(/\s+/);
  const xs = parseOne(t[0] || 'center');
  const ys = parseOne(t[1] || 'center');
  return [xs, ys];
}
const posEq = (a, b) => (a.f !== undefined && b.f !== undefined ? Math.abs(a.f - b.f) < 0.01 : a.px !== undefined && b.px !== undefined ? Math.abs(a.px - b.px) <= 1 : false);
const posStr = (a) => (a.f !== undefined ? (a.f * 100).toFixed(0) + '%' : a.px + 'px');

/** Returns list of {property, before, after} differences between two normalised paints. */
export function diffPaints(a, b, tol = 1) {
  const d = [];
  if (Math.abs(a.w - b.w) > tol) d.push({ property: 'width', before: a.w, after: b.w });
  if (Math.abs(a.h - b.h) > tol) d.push({ property: 'height', before: a.h, after: b.h });
  if (a.fit !== b.fit) d.push({ property: 'fit', before: a.fit, after: b.fit });
  else if (a.fit === 'size' && a.size !== b.size) d.push({ property: 'size', before: a.size, after: b.size });
  if (!posEq(a.px, b.px) || !posEq(a.py, b.py)) d.push({ property: 'position', before: posStr(a.px) + ' ' + posStr(a.py), after: posStr(b.px) + ' ' + posStr(b.py) });
  if (a.repeat !== b.repeat) d.push({ property: 'repeat', before: a.repeat, after: b.repeat });
  if (a.attachment !== b.attachment) d.push({ property: 'attachment', before: a.attachment, after: b.attachment });
  return d;
}

function loadDir(dir) {
  const m = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    m.set(f, j);
  }
  return m;
}

function groupByKey(paints) {
  const g = new Map();
  const sorted = [...paints].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  for (const p of sorted) {
    const k = p.key || '(no-key:' + p.kind + ')';
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  }
  return g;
}

export function comparePage(before, after, tol = 1) {
  const res = { matched: 0, changed: [], missing: [], added: [] };
  const gb = groupByKey(before), ga = groupByKey(after);
  for (const [k, list] of gb) {
    const other = ga.get(k) || [];
    list.forEach((p, i) => {
      const q = other[i];
      if (!q) { res.missing.push({ key: k, kind: p.kind, context: p.context, box: p.box }); return; }
      const diffs = diffPaints(normalise(p), normalise(q), tol);
      if (diffs.length) res.changed.push({ key: k, kind: p.kind + '->' + q.kind, context: p.context || q.context, diffs, moved: { dx: +(q.box.x - p.box.x).toFixed(1), dy: +(q.box.y - p.box.y).toFixed(1) } });
      else res.matched++;
    });
  }
  for (const [k, list] of ga) {
    const have = (gb.get(k) || []).length;
    list.slice(have).forEach((q) => res.added.push({ key: k, kind: q.kind, context: q.context, box: q.box }));
  }
  return res;
}

function loadAllow(file) {
  if (!file) return [];
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.allow || [];
  return arr.map((r) => {
    if (!r.reason) throw new Error('allow entry without reason: ' + JSON.stringify(r));
    return { page: globToRe(r.page || '*'), key: globToRe(r.key || '*'), property: globToRe(r.property || '*'), reason: r.reason };
  });
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('compare.mjs')) {
  const args = parseArgs(process.argv.slice(2));
  const [bdir, adir] = args._;
  if (!bdir || !adir) { console.error('Usage: node compare.mjs BEFORE_DIR AFTER_DIR [--allow FILE] [--tolerance PX] [--verbose]'); process.exit(2); }
  const tol = Number(args.tolerance || 1);
  const allow = loadAllow(args.allow);
  const isAllowed = (page, key, prop) => allow.find((a) => a.page.test(page) && a.key.test(key) && a.property.test(prop));
  const B = loadDir(bdir), A = loadDir(adir);
  const tot = { files: 0, matched: 0, changed: 0, missing: 0, added: 0, allowed: 0, violations: 0 };
  const lines = [];
  const files = new Set([...B.keys(), ...A.keys()]);
  for (const f of [...files].sort()) {
    const b = B.get(f), a = A.get(f);
    const label = f.replace(/\.json$/, '');
    if (!b || !a) {
      const miss = !a ? 'AFTER' : 'BEFORE';
      if (!isAllowed(label, '*', miss === 'AFTER' ? 'missing' : 'new')) { lines.push(`${label}: capture missing in ${miss}`); tot.violations++; }
      continue;
    }
    tot.files++;
    if (b.status !== a.status) {
      if (!isAllowed(label, '*', 'status')) { lines.push(`${label}: HTTP status ${b.status} -> ${a.status}`); tot.violations++; }
    }
    const r = comparePage(b.paints, a.paints, tol);
    tot.matched += r.matched;
    for (const c of r.changed) {
      tot.changed++;
      const bad = c.diffs.filter((d) => !isAllowed(label, c.key, d.property));
      tot.allowed += c.diffs.length - bad.length;
      if (bad.length) {
        tot.violations++;
        lines.push(`${label}: CHANGED ${c.key} [${c.context || '-'}] ${c.kind}: ` + bad.map((d) => `${d.property} ${d.before} -> ${d.after}`).join('; ') + (args.verbose ? ` (moved dx=${c.moved.dx} dy=${c.moved.dy})` : ''));
      }
    }
    for (const m of r.missing) { tot.missing++; if (isAllowed(label, m.key, 'missing')) tot.allowed++; else { tot.violations++; lines.push(`${label}: MISSING AFTER ${m.key} [${m.context || '-'}] ${m.kind} ${m.box.width}x${m.box.height}`); } }
    for (const n of r.added) { tot.added++; if (isAllowed(label, n.key, 'new')) tot.allowed++; else { tot.violations++; lines.push(`${label}: NEW AFTER ${n.key} [${n.context || '-'}] ${n.kind} ${n.box.width}x${n.box.height}`); } }
  }
  lines.forEach((l) => console.log(l));
  console.log('\nSummary');
  console.log('| page-viewports | matched | changed | missing after | new after | allowed | violations |');
  console.log('|---|---|---|---|---|---|---|');
  console.log(`| ${tot.files} | ${tot.matched} | ${tot.changed} | ${tot.missing} | ${tot.added} | ${tot.allowed} | ${tot.violations} |`);
  console.log(tot.violations ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(tot.violations ? 1 : 0);
}
