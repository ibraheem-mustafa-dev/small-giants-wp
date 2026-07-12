#!/usr/bin/env node
/**
 * smoke-test.js — regression guards for computed-parity.js (Spec 20 v1.1.0 test-strategy).
 * Runs the tool on 4 fixture pairs and asserts the FR done-when conditions:
 *   FR-20-1  base-font delta caught on an inherited-base paragraph
 *   FR-20-9  a tag swap (button->span) is reported SEPARATELY; CSS still matches
 *   FR-20-10 zero shared class names + identical CSS -> 100% CSS, 0 class-driven mismatches;
 *            + a STATIC grep proves no class comparison feeds any score
 *   FR-20-11 a below-fold lazy image is PRESENT (not dropped) after force-load
 *
 * Run on Windows via PowerShell:  node fixtures/smoke-test.js
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = __dirname;
const TOOL = path.join(DIR, '..', 'computed-parity.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-smoke-'));
let failures = 0;
const ok = (name, cond, detail) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!cond) failures++; };

function run(draft, clone, vp) {
  const out = path.join(tmp, draft.replace(/\W/g, '_') + '.json');
  execFileSync('node', [TOOL, '--draft', path.join(DIR, draft), '--clone', path.join(DIR, clone),
    '--viewports', String(vp || 1024), '--out', out], { stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
const firstVp = (r) => r.viewports[Object.keys(r.viewports)[0]];
const allDiffs = (r) => firstVp(r).css.mismatches.flatMap(m => m.diffs.map(d => ({ ...d, text: m.text })));

console.log('\n=== computed-parity smoke test (Spec 20 v1.1.0) ===\n');

// FR-20-1 — inherited-base font-size delta must surface.
{
  const r = run('base-font-draft.html', 'base-font-clone.html');
  const hit = allDiffs(r).some(d => d.prop === 'font-size' && d.draft === '16px' && d.clone === '18px');
  ok('FR-20-1 base-font delta 16px->18px caught on inherited-base <p>', hit);
}

// FR-20-9 — tag swap reported separately; CSS not diluted by it.
{
  const r = run('tag-swap-draft.html', 'tag-swap-clone.html');
  const v = firstVp(r);
  const tagHit = (v.tag.mismatches || []).some(t => t.draft_tag === 'button' && t.clone_tag === 'span');
  ok('FR-20-9 tag divergence button->span reported in tag.mismatches[]', tagHit);
  // the button/span pair styling is identical -> its CSS diffs (if any) must not be tag-driven.
  const pairDiffs = allDiffs(r).filter(d => /add to basket/.test(d.text));
  ok('FR-20-9 tag dimension is separate from CSS (no synthetic tag prop in css diffs)',
    !pairDiffs.some(d => d.prop === 'tag' || d.prop === 'tagName'));
}

// FR-20-10 — zero shared classes + identical CSS -> 100% CSS, 0 class-driven mismatch.
{
  const r = run('class-agnostic-draft.html', 'class-agnostic-clone.html');
  const v = firstVp(r);
  ok('FR-20-10 identical CSS across zero-shared-class pair scores 100% CSS', v.css.pct === 100,
    `got ${v.css.pct}%`);
  const classyDiff = allDiffs(r).some(d => /class/i.test(d.prop));
  ok('FR-20-10 no class-name comparison feeds any mismatch', !classyDiff);
  // context IS present for audit (classes captured) even when there is no mismatch element:
  // assert the report method documents class-as-context (a proxy for capture wiring).
  ok('FR-20-10 method note documents classes as context-only', /class/i.test(r.method));
}

// FR-20-10 static — the tool source must not compare class names for scoring.
{
  const src = fs.readFileSync(TOOL, 'utf8');
  // classes may be READ into context (drec.cls / crec.cls) but never compared to drive a score.
  const compares = /\.cls\b[^\n]*===|===[^\n]*\.cls\b|classList[^\n]*===/.test(src);
  ok('FR-20-10 static: no `.cls === ` / classList equality feeds scoring', !compares);
}

// FR-20-11 — below-fold lazy image present (not dropped) after force-load.
{
  const r = run('lazy-image-draft.html', 'lazy-image-clone.html');
  const v = firstVp(r);
  ok('FR-20-11 below-fold lazy image not dropped (draft==clone -> 0 dropped images)',
    (v.content.dropped_images || []).length === 0, `dropped: ${JSON.stringify(v.content.dropped_images)}`);
}

// FR-20-3a guards — the 3 must-still-SCORE cases (code-review bugs #1-#3, D315). Each must
// appear as a SCORED css mismatch, NEVER routed into sub_visible[] (which would hide a real gap).
{
  const r = run('subvisible-guards-draft.html', 'subvisible-guards-clone.html');
  const v = firstVp(r);
  const scored = allDiffs(r);
  const subProps = (v.sub_visible.elements || []).flatMap(e => e.sub.map(s => `${s.bucket}:${s.prop}`));
  // 1. multi-line inline link line-height 24->32 must SCORE (not bucket).
  const lhScored = scored.some(d => d.prop === 'line-height' && d.draft === '24px' && d.clone === '32px');
  const lhBucketed = subProps.some(s => s.startsWith('line-height-single-line'));
  ok('FR-20-3a guard#1 multi-line inline line-height 24->32 is SCORED, not bucketed', lhScored && !lhBucketed,
    `scored=${lhScored} bucketed=${lhBucketed}`);
  // 2. native button appearance auto->none must SCORE.
  const apScored = scored.some(d => d.prop === 'appearance');
  ok('FR-20-3a guard#2 native <button> appearance auto->none is SCORED', apScored);
  // 3. clone-ADDED margin (0->16) in a flex+gap parent must SCORE (not "absorbed").
  const mScored = scored.some(d => /^margin-/.test(d.prop) && d.draft === '0px' && d.clone === '16px');
  const mBucketed = subProps.some(s => s.startsWith('margin-absorbed-by-gap'));
  ok('FR-20-3a guard#3 clone-added margin 0->16 is SCORED, not treated as absorbed', mScored && !mBucketed,
    `scored=${mScored} bucketed=${mBucketed}`);
}

console.log(`\n=== ${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} ===\n`);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
process.exit(failures === 0 ? 0 : 1);
