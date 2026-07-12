#!/usr/bin/env node
/**
 * computed-parity.js — RELIABLE, DRAFT-AGNOSTIC clone-vs-draft parity (SGS pipeline).
 * Spec 20 v1.1.0 (Clone Fidelity Measurement). The number tracks VISIBLE fidelity and
 * PAIRS with Bean's eye — it never closes alone (Spec 31 §7b / R-31-13).
 *
 * THE dependable parity method (CLAUDE.md root-cause rule 4a / STOP-42, D259 2026-07-03):
 * compare the EFFECTIVE (computed) value on the actual rendered element, matched by its
 * CONTENT — NOT source-declaration-diff (blind to inherited values) and NOT wrapper-class-
 * keying (raw <section> vs block wrapper -> false positives). Both pages render in the
 * same headless browser at each viewport.
 *
 * UNIVERSAL by design (like the converter): it does NOT allowlist a hand-picked property
 * set (that over-fits one draft). It compares EVERY computed CSS property, minus a small,
 * documented BLOCKLIST — so any property any draft uses is covered automatically (FR-20-2).
 * NOTHING in this file encodes a page/client/selector — it is draft-agnostic (FR-20-2/5).
 *
 * MEANINGFUL score (not inflated by matching defaults): a property counts only when it
 * DIFFERS between draft and clone, OR is non-default on the draft (vs a bare same-tag
 * reference element). So `draft==clone==initial` boring defaults are ignored, while a
 * differing default (e.g. base font-size 16 vs 18 on inherited text) IS caught.
 *
 * ── v1.1.0 dimension set + VISIBLE-FIDELITY thresholding (D314; qc-council-hardened 2026-07-12) ──
 * The v1.0.0 tool reported 76-77% on page 8 while the independent D314 ledger + Bean's eye
 * put VISIBLE fidelity at ~94-95%. The gap was a CLASS of over-counts the "meaningful" filter
 * still let through. FR-20-3a requires the headline % track what the eye sees. Fixes, each
 * gated by a rendered-INVISIBILITY predicate (a qc-council correction: NEVER blanket-suppress
 * a class by label — a blanket exclude hides a real gap and re-breaks the very trust this tool
 * exists to provide; every sub-visible route carries a proven-invisible condition):
 *   (1) font-family PRIMARY-ONLY (FR-20-3a). `Inter, sans-serif` vs `Inter, system-ui, …`
 *       render identically (same primary; the fallback tail only paints if the primary fails).
 *       Compare the first family token; a DIFFERING primary still scores (a real font swap).
 *       Was 39% of page-8 mismatches.
 *   (2) BLOCKLIST clone-only / non-visual props: `interactivity` (experimental, clone-side,
 *       zero paint) + `appearance` when the element is already styled (explicit bg/border) —
 *       `appearance:none` on an UNSTYLED native control IS visible, so that case still scores.
 *   (3) SUB-VISIBLE representational twins → a reported-but-UNSCORED `sub_visible[]` bucket
 *       (FR-20-3a; the bucket does not drag numerator OR denominator). Each ONLY when proven
 *       invisible on THIS pair:
 *         · line-height px — ONLY when BOTH sides are single-line (leading is invisible on one
 *           line); a multi-line element with different leading still SCORES.
 *         · margin-*→0px — ONLY when the clone's parent is flex/grid with a `gap` >= the dropped
 *           margin AND the element is not the last child (gap replaces the margin); an
 *           uncompensated dropped margin is real lost whitespace and still SCORES.
 *         · align-items normal↔stretch — genuinely identical (normal computes to stretch) → a
 *           MATCH (handled in propMatches, not even a mismatch).
 *       NOTE (qc-council): justify-content normal↔center, flex-grow 0↔1, display flex↔block are
 *       context-dependent (VISIBLE when free space exists) → they are KEPT SCORED, never bucketed.
 *
 * ── v1.1.0 added scored/context dimensions ──
 *   · TAG (FR-20-9) — per matched pair, draft tag vs clone tag, scored + reported SEPARATELY
 *     from CSS (`tag.*`). A tag divergence (`button→span`, `p→div`) is EXPECTED convert-
 *     divergence (Rule 1) — REPORTED, never auto-failed; it must not dilute/be-diluted-by CSS.
 *   · CLASS names (FR-20-10) — captured as INFORMATIONAL context only (`classes:{draft,clone}`),
 *     NEVER scored. Rule 1 (CONVERT-don't-mirror): the clone uses `wp-block-sgs-*`, not the draft
 *     BEM — class-name equality is architecturally wrong to score and would re-introduce the
 *     wrapper-vs-raw class-keying false positives this spec was built to kill. Computed CSS is the
 *     proof the styling transferred. NO code path lets a class diff touch any pct/match/mismatch.
 *   · FORCE-LOAD lazy/below-fold before measuring (FR-20-11) — a below-fold `loading="lazy"` image
 *     is in the DOM but unpainted when a headless capture fires (proven live: the D314 story-image
 *     false-negative). We scroll the full document height + set `loading=eager` + `decode()` + settle
 *     BEFORE capture, so a below-fold element is measured at its real size, never as absent/zero.
 *
 * ── Container-dependent absolutes (documented limits, FR-20-6) ──
 * grid-template-columns/rows compare TRACK COUNT (resolved px is container-dependent noise);
 * url()/gradient compare PRESENCE; rendered geometry (width/height/inline-size/block-size/
 * transform) is blocklisted (container-dependent — the converter's fixed-height transfers show
 * via aspect-ratio/object-fit/min-height which ARE compared). SVG internals (fill/stroke) are
 * skipped (icon-fill is a separate client-facing block control, not a fidelity item).
 *
 * ── Retained v1.0.0 machinery (proven; NOT rewritten) ──
 * chrome scoping (root-level header/footer/nav + sgs-header/footer tokens), Unicode-whitespace
 * anchor normalisation, deepest-element-wins box collisions, alignfull counter-margin blocklist,
 * inline-wrapper hoist (button labels in a <span>), stable image identity (alt else src-basename),
 * duplicate-text occurrence disambiguation (key#N), auto↔0px min-* twins.
 *
 * Usage:
 *   node computed-parity.js --draft <url|path> --clone <url|path> \
 *        [--viewports 375,768,1440] [--out report.json] [--exclude <text substrings>]
 *   (serve a local draft, or pass its file path directly — standalone Playwright loads file://.)
 * Run on Windows via PowerShell (Git Bash node wrapper is flaky).
 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }
// Accept either an http(s) URL or a local file path (agnostic — the orchestrator passes the
// mockup file path; standalone Playwright loads file:// fine, unlike the MCP sandbox).
const toURL = (s) => (!s ? s : (/^https?:\/\//i.test(s) ? s : pathToFileURL(path.resolve(s)).href));
const DRAFT = toURL(arg('draft')), CLONE = toURL(arg('clone'));
const VIEWPORTS = arg('viewports', '375,768,1440').split(',').map(Number);
const OUT = arg('out', '');
const EXCLUDE = arg('exclude', '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
if (!DRAFT || !CLONE) { console.error('ERROR: --draft <url> and --clone <url> are required.'); process.exit(2); }

// Blocklist (documented, FR-20-6). NONE of these is a property_suffixes property the converter
// transfers EXCEPT width/height (rendered geometry; a documented limit). Vendor-prefixed props
// (start with '-') and interaction/animation timing are dropped as non-visual. `interactivity`
// (v1.1.0) is an experimental clone-side property with zero paint — never a fidelity signal.
const BLOCK = new Set([
  // rendered geometry (container-dependent — documented limit)
  'width', 'height', 'inline-size', 'block-size', 'min-width',
  'min-inline-size', 'min-block-size', 'max-inline-size', 'max-block-size',
  'perspective-origin', 'transform-origin', 'transform', 'translate', 'scale', 'rotate',
  // WP-block-MODEL artifacts: the clone's elements are position:relative;inset:0;z-index:1
  // (a WordPress wrapper default) vs the draft's raw-HTML static — a model difference, not a
  // fidelity gap, that otherwise flags on nearly every element.
  'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'text-wrap', 'text-wrap-mode', 'text-wrap-style', 'white-space-collapse',
  // colour-MIRROR props (all inherit `color`, so one colour diff counts many times) — the
  // real colour signal is `color` + `background-color`; border colour is kept via width/style.
  'outline-color', 'outline-style', 'outline-width', 'outline-offset', 'column-rule-color',
  'text-decoration-color', 'text-emphasis-color', 'caret-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-color',
  // clone-only / non-visual (v1.1.0, FR-20-3a): `interactivity` is experimental + clone-side.
  'interactivity',
  // interaction / animation / non-visual
  'cursor', 'will-change', 'scroll-behavior', 'user-select', 'pointer-events',
  'touch-action', 'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay', 'transition-behavior',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-range', 'animation-composition',
  'speak', 'quotes', 'unicode-bidi', 'isolation', 'mix-blend-mode',
]);
// Logical-property duplicates (border-block-end-*, margin-inline-*, inset-*, *-start-start-*)
// exactly mirror their physical longhands (border-bottom-*, margin-left-*, top/left) — drop
// them so a single spacing/border diff isn't counted 2-3x. Physical longhands are KEPT.
const LOGICAL_RE = /(inline|block-|inset|-start|-end)/;

// In-page capture. Returns {texts, images, links, textEls, boxEls, defaults, fullText}. Each
// el record = {tag, cls, css, sl, pd, pg, lc, styled} — css over ALL non-blocklisted props,
// plus the geometry/parent context the v1.1.0 sub-visible predicates need (§FR-20-3a):
//   sl     = single-line (line-height twin guard)
//   pd/pg  = parent display / parent gap px (margin-absorbed-by-gap guard)
//   lc     = is last element child (gap does not replace a last child's trailing margin)
//   styled = element has an explicit background/border (appearance-reset visibility guard)
//   cls    = class list (FR-20-10 informational context ONLY — never scored)
const CAPTURE_SRC = `() => {
  const CHROME_TAGS = { HEADER:1, FOOTER:1, NAV:1 };
  const CONTENT_SECTIONING_TAGS = { SECTION:1, ARTICLE:1, MAIN:1 };
  const isPageLevelChromeTag = (n) => {
    if (!CHROME_TAGS[n.tagName]) return false;
    for (let p = n.parentElement; p && p.tagName !== 'BODY' && p.tagName !== 'HTML'; p = p.parentElement) {
      if (CONTENT_SECTIONING_TAGS[p.tagName]) return false;  // nested inside real content
    }
    return true;
  };
  const chromeToken = (t) => t === 'sgs-header' || t === 'sgs-footer' ||
    t.startsWith('sgs-header__') || t.startsWith('sgs-header--') ||
    t.startsWith('sgs-footer__') || t.startsWith('sgs-footer--') ||
    t === 'sgs-header__skip-link' || t === 'skip-link' ||
    t === 'wp-block-template-part';
  const inChrome = (el) => {
    for (let n = el; n && n.tagName !== 'BODY' && n.tagName !== 'HTML'; n = n.parentElement) {
      if (isPageLevelChromeTag(n)) return true;
      for (const t of (n.classList || [])) if (chromeToken(t)) return true;
    }
    return false;
  };
  // normalise Unicode whitespace too (NBSP/zero-width/BOM), not just ASCII \\s.
  const WS_RE = /[\\s\\u00A0\\u200B\\uFEFF]+/g;
  const norm = (t) => (t||'').replace(WS_RE,' ').trim().toLowerCase().replace(/[^a-z0-9 £]/g,'').slice(0,80);
  const normFull = (t) => (t||'').replace(WS_RE,' ').trim().toLowerCase().replace(/[^a-z0-9 £]/g,'');
  const BLOCK = new Set(${JSON.stringify([...BLOCK])});
  const ALIGNFULL_EXTRA_BLOCK = new Set(['margin-left', 'margin-right']);
  const LOGICAL = /(inline|block-|inset|-start|-end)/;
  const SKIP_TAGS = { STYLE:1, SCRIPT:1, NOSCRIPT:1, SVG:1, PATH:1, TEMPLATE:1, LINK:1, META:1, TITLE:1, HEAD:1 };
  const px = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const normVal = (p, v) => {
    if (v == null) return v;
    if (/image|url|source/.test(p) && /url\\(/.test(v)) return /gradient/.test(v) ? 'gradient' : 'image';
    if ((p === 'grid-template-columns' || p === 'grid-template-rows') && v !== 'none') return String(v.split(' ').filter(Boolean).length);
    if (p === 'box-shadow') return v === 'none' ? 'none' : 'shadow';
    // round fractional px so 25.6px == 26px cross-browser/DPR
    return v.replace(/(-?\\d+\\.\\d+)px/g, (m, n) => Math.round(parseFloat(n)) + 'px');
  };
  const readAll = (el) => { const cs = getComputedStyle(el), r = {};
    const isAlignfull = el.classList && el.classList.contains('alignfull');
    for (let i = 0; i < cs.length; i++) { const p = cs[i];
      if (p.charCodeAt(0) === 45 || BLOCK.has(p) || LOGICAL.test(p)) continue;  // vendor '-' + blocklist + logical dupes
      if (isAlignfull && ALIGNFULL_EXTRA_BLOCK.has(p)) continue;  // alignfull-scoped margin blocklist
      r[p] = normVal(p, cs.getPropertyValue(p)); }
    return r; };
  // v1.1.0 per-element geometry/parent context for the sub-visible predicates.
  const ctx = (el) => {
    const cs = getComputedStyle(el);
    const lh = cs.lineHeight === 'normal' ? px(cs.fontSize) * 1.2 : px(cs.lineHeight);
    // single-line detection (the line-height sub-visible guard). A PURE inline box has
    // clientHeight 0, so its height heuristic is meaningless — count line BOXES via
    // getClientRects() instead (a wrapped inline yields >1 rect). inline-block/flex/block
    // are atomic layout boxes with a real clientHeight -> use the content-height/line ratio.
    // Default UNPROVEN -> false (keep the prop SCORED), NEVER true — the safe direction is to
    // never hide a possibly-visible leading gap (code-review bug #1, D315).
    const disp = cs.display || '';
    let sl;
    if (disp === 'inline') { sl = el.getClientRects().length <= 1; }
    else if (lh > 0 && el.clientHeight > 0) {
      const contentH = el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
      sl = contentH > 0 && contentH <= lh * 1.5;
    } else { sl = false; }
    const par = el.parentElement;
    const pcs = par ? getComputedStyle(par) : null;
    const pd = pcs ? pcs.display : '';
    const pg = pcs ? Math.max(px(pcs.rowGap), px(pcs.columnGap), px(pcs.gap)) : 0;
    const lc = par ? (el === par.lastElementChild) : false;
    return { sl, pd, pg, lc };
  };
  const clsList = (el) => Array.from(el.classList || []);
  const imgIdentity = (el) => {
    const a = norm(el.getAttribute('alt'));
    if (a) return a;
    const src = el.currentSrc || el.getAttribute('src') || el.getAttribute('data-src') || '';
    let base = '';
    try { base = new URL(src, location.href).pathname.split('/').filter(Boolean).pop() || ''; }
    catch (e) { base = String(src).split('/').filter(Boolean).pop() || ''; }
    return 'img#' + norm(base);
  };

  // per-tag defaults from bare (unstyled) elements -> the "initial" for the meaningful filter
  const defaults = {};
  const hold = document.createElement('div');
  hold.style.cssText = 'position:absolute;left:-99999px;top:0;width:200px;';
  document.body.appendChild(hold);
  ['div','p','span','a','h1','h2','h3','h4','h5','ul','li','blockquote','section','img','button','em','strong'].forEach(t => {
    const e = document.createElement(t); if (t === 'img') e.alt = ''; hold.appendChild(e); defaults[t] = readAll(e); });
  document.body.removeChild(hold);

  const texts = [], images = [], links = [], textEls = {};
  const dkeyOccurrence = {};
  const boxElsRaw = {};
  const mk = (el) => ({ tag: el.tagName.toLowerCase(), cls: clsList(el), css: readAll(el), ...ctx(el) });
  document.querySelectorAll('*').forEach((el) => {
    if (inChrome(el) || SKIP_TAGS[el.tagName]) return;
    const isHtmlOrBody = el.tagName === 'HTML' || el.tagName === 'BODY';
    if (el.tagName === 'IMG') { images.push(imgIdentity(el)); }
    if (el.tagName === 'A') { try { let h = new URL(el.href, location.href).pathname.replace(/\\/$/,'').replace(/^\\/[A-Za-z]:\\//, '/'); if (h) links.push(h); } catch(e){} }
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.textContent;
    const dkey = norm(direct);
    if (dkey.length >= 4) { texts.push(dkey);
      // INLINE-WRAPPER HOIST: when the direct text sits in a bare inline wrapper (the clone
      // renders button labels inside a <span>), the STYLING lives on the parent — anchor there.
      let anchorEl = el;
      const INLINE_WRAP = { SPAN:1, EM:1, STRONG:1, B:1, I:1 };
      while (INLINE_WRAP[anchorEl.tagName] && anchorEl.parentElement
             && anchorEl.parentElement.childElementCount === 1
             && norm(anchorEl.parentElement.innerText) === dkey
             && !inChrome(anchorEl.parentElement)
             && anchorEl.parentElement.tagName !== 'BODY') {
        anchorEl = anchorEl.parentElement;
      }
      const occ = (dkeyOccurrence[dkey] = (dkeyOccurrence[dkey] || 0) + 1);
      const slot = occ === 1 ? dkey : (dkey + '#' + occ);  // 2nd+ occurrence gets its own slot
      if (!textEls[slot]) textEls[slot] = mk(anchorEl); }
    if (!isHtmlOrBody && (el.childElementCount > 0 || el.tagName === 'IMG')) {
      const anchor = el.tagName === 'IMG' ? ('img:' + imgIdentity(el)) : norm(el.innerText);
      if (anchor.length >= 5) {
        const existing = boxElsRaw[anchor];
        // keep the DEEPEST/most-specific element on a same-key collision (ancestor gets overwritten).
        if (!existing || (existing.el && existing.el !== el && existing.el.contains(el))) {
          boxElsRaw[anchor] = { rec: mk(el), el };
        }
      }
    }
  });
  const boxEls = {};
  for (const k of Object.keys(boxElsRaw)) { boxEls[k] = boxElsRaw[k].rec; }
  const fullText = normFull(document.body ? document.body.innerText : '').slice(0, 200000);
  return { texts: [...new Set(texts)], images: [...new Set(images)], links: [...new Set(links)], textEls, boxEls, defaults, fullText };
}`;

// Force-load lazy/below-fold content BEFORE measuring (FR-20-11). A below-fold
// loading="lazy" image is in the DOM but not painted/sized until scrolled into view —
// it false-flags as missing/zero-size otherwise (the D314 story-image false-negative).
const FORCE_LOAD_SRC = `async () => {
  document.querySelectorAll('img[loading="lazy"]').forEach(i => { try { i.loading = 'eager'; } catch(e){} });
  const step = 600;
  let y = 0; const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  while (y < max) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); y += step; }
  window.scrollTo(0, 0);
  await Promise.all(Array.from(document.images).map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())));
}`;

async function capture(page, url, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.evaluate(FORCE_LOAD_SRC).catch(() => {});   // FR-20-11
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);
  return page.evaluate('(' + CAPTURE_SRC + ')()');
}
function findByAnchor(key, map, exact) {
  if (map[key]) return map[key];
  if (exact) return null;
  for (const k of Object.keys(map)) if ((key.includes(k) || k.includes(key)) && Math.min(key.length, k.length) > 12) return map[k];
  return null;
}
const excluded = (key) => EXCLUDE.some((x) => key.includes(x));
const primFam = (v) => (v || '').split(',')[0].trim().toLowerCase().replace(/["']/g, '');

// Is this pair a MATCH (visually equal despite a computed-string difference)?
function propMatches(prop, dv, cv) {
  if (dv === cv) return true;
  // font-family PRIMARY-ONLY (FR-20-3a): identical primary family renders identically; the
  // fallback tail only paints if the primary fails. A DIFFERING primary is a real swap → no match.
  if (prop === 'font-family') return primFam(dv) === primFam(cv);
  // auto↔0px min-* twins (no-constraint representation difference).
  if ((prop === 'min-height' || prop === 'min-width') &&
      ((dv === 'auto' && cv === '0px') || (dv === '0px' && cv === 'auto'))) return true;
  if (prop === 'font-weight') return Math.abs((parseInt(dv) || 400) - (parseInt(cv) || 400)) < 100;
  // align-items normal↔stretch: `normal` computes to `stretch` for align-items — genuinely
  // identical rendered behaviour (qc-council, Rater A). Also the left/right/flex-* canonicalisation.
  if (prop === 'align-items') {
    const ai = (x) => ({ normal: 'stretch', 'flex-start': 'start', 'flex-end': 'end', left: 'start', right: 'end' }[x] || x);
    return ai(dv) === ai(cv);
  }
  if (/(text-align|justify-content|justify-items|align-self)/.test(prop)) {
    const canon = (x) => ({ left: 'start', right: 'end', 'flex-start': 'start', 'flex-end': 'end', normal: 'start' }[x] || x);
    return canon(dv) === canon(cv);
  }
  return false;
}

// For a genuine mismatch, is it a SUB-VISIBLE representational twin (FR-20-3a)? Returns a
// bucket-name string (→ sub_visible[], EXCLUDED from the score) or null (→ a real, scored
// mismatch). Every route is gated by a proven-invisible condition on THIS pair (qc-council:
// NEVER blanket-suppress by label). `drec`/`crec` carry the geometry/parent context.
function subVisibleBucket(prop, dv, cv, drec, crec) {
  // appearance: the `appearance` property only PAINTS on native form controls (button/input/
  // select/textarea) — there `appearance:none` strips visible UA chrome, so it is SCORED
  // (code-review bug #2, D315: a native <button> carries a UA grey background, so a "styled"
  // heuristic wrongly read every button as styled and hid a real reset). On any NON-control
  // element `appearance` is a genuine visual no-op → bucketed. Scored whenever EITHER side is
  // a form control (the safe direction).
  if (prop === 'appearance') {
    const formish = (t) => /^(button|input|select|textarea)$/.test(t);
    return (formish(drec.tag) || formish(crec.tag)) ? null : 'appearance-noop';
  }
  // line-height px twin: leading is invisible when BOTH sides are single-line; a multi-line
  // element with different leading is a REAL visible spacing difference → scored.
  if (prop === 'line-height') return (drec.sl && crec.sl) ? 'line-height-single-line' : null;
  // margin→0px ABSORBED by a flex/grid gap: invisible ONLY when the DRAFT had a margin and the
  // CLONE dropped it to 0 (cm===0 && dm>0 — NOT the reverse, where the clone ADDS a margin =
  // real extra spacing; code-review bug #3, D315) AND the clone's parent is flex/grid with a
  // gap >= that margin AND the element is not the last child (a gap sits BETWEEN children — a
  // last child's trailing margin is not replaced by it). Else = real lost/added whitespace.
  if (/^margin-(top|right|bottom|left)$/.test(prop)) {
    const dm = parseFloat(dv) || 0, cm = parseFloat(cv) || 0;
    const absorbed = cm === 0 && dm > 0;
    const p = crec.pd || '';
    if (absorbed && /(flex|grid)/.test(p) && crec.pg >= dm && !crec.lc) return 'margin-absorbed-by-gap';
    return null;
  }
  return null;
}

// Compare one matched pair over ALL props; only MEANINGFUL props count (differs OR non-default
// on the draft). Sub-visible twins are diverted to `sub` (reported, unscored). Returns
// {total, match, diffs, sub}.
function comparePair(drec, crec, dDef) {
  let total = 0, match = 0; const diffs = [], sub = [];
  const ddef = dDef[drec.tag] || {};
  for (const p of Object.keys(drec.css)) {
    const dv = drec.css[p], cv = crec.css[p];
    if (cv === undefined) continue;
    const meaningful = (dv !== cv) || (ddef[p] !== undefined && dv !== ddef[p]);
    if (!meaningful) continue;
    if (propMatches(p, dv, cv)) { total++; match++; continue; }
    const bucket = subVisibleBucket(p, dv, cv, drec, crec);
    if (bucket) { sub.push({ prop: p, draft: dv, clone: cv, bucket }); continue; }  // unscored
    total++; diffs.push({ prop: p, draft: dv, clone: cv });
  }
  return { total, match, diffs, sub };
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const report = {
    draft: DRAFT, clone: CLONE,
    method: 'computed values, matched by content, all-props-minus-blocklist, meaningful-only, visible-fidelity (Spec 20 v1.1.0 / rule 4a). font-family primary-only; sub-visible twins bucketed (unscored) by invisibility predicate; tag scored separately; classes context-only.',
    viewports: {},
  };
  let gT = 0, gM = 0, gSub = 0, gTagT = 0, gTagM = 0;

  for (const vw of VIEWPORTS) {
    const d = await capture(page, DRAFT, vw);
    const c = await capture(page, CLONE, vw);
    const cT = new Set(c.texts), cI = new Set(c.images), cL = new Set(c.links);

    // Tier 1: content presence
    const has = (set, v) => set.has(v) || [...set].some(x => x.length > 5 && (x.includes(v) || v.includes(x)));
    const cFull = c.fullText || '';
    const dropText = d.texts.filter(t => !excluded(t) && !has(cT, t)
      && !(t.length >= 10 && cFull.includes(t)));
    const dropImg = d.images.filter(a => !cI.has(a) && ![...cI].some(x => x.includes(a) || a.includes(x)));
    const dropLink = d.links.filter(h => !cL.has(h));
    const cTot = d.texts.filter(t => !excluded(t)).length + d.images.length + d.links.length;
    const cDrop = dropText.length + dropImg.length + dropLink.length;
    const contentPct = cTot ? Math.round(100 * (cTot - cDrop) / cTot) : null;

    // Tier 2+3: CSS + TAG over text-leaf (fuzzy) + structural (exact), ALL props, meaningful-only.
    let T = 0, M = 0, tagT = 0, tagM = 0; const mis = [], unm = [], subv = [], tagMis = [];
    const runTier = (map, cloneMap, exact) => {
      for (const [key, drec] of Object.entries(map)) {
        if (excluded(key)) continue;
        const crec = findByAnchor(key, cloneMap, exact);
        if (!crec) { unm.push(key.slice(0, 44)); continue; }  // FR-20-4: unmatched, per dimension
        // TAG dimension (FR-20-9) — scored SEPARATELY from CSS; reported, never auto-failed.
        tagT++;
        if (drec.tag === crec.tag) tagM++;
        else tagMis.push({ text: key.slice(0, 40), draft_tag: drec.tag, clone_tag: crec.tag });
        // CSS dimension.
        const r = comparePair(drec, crec, d.defaults);
        T += r.total; M += r.match;
        if (r.diffs.length) mis.push({
          text: key.slice(0, 46), tag: drec.tag, diffs: r.diffs,
          // FR-20-10: class context ONLY — never scored, present for human/debug audit.
          classes: { draft: drec.cls || [], clone: crec.cls || [] },
        });
        if (r.sub.length) subv.push({ text: key.slice(0, 46), tag: drec.tag, sub: r.sub });
      }
    };
    runTier(d.textEls, c.textEls, false);
    runTier(d.boxEls, c.boxEls, true);

    const subCount = subv.reduce((n, e) => n + e.sub.length, 0);
    gT += T; gM += M; gSub += subCount; gTagT += tagT; gTagM += tagM;
    report.viewports[vw] = {
      content: { pct: contentPct, dropped_text: dropText, dropped_images: dropImg, dropped_links: dropLink },
      css: { pct: T ? Math.round(100 * M / T) : null, meaningful_props: T, match: M, unmatched_elements: unm, mismatches: mis },
      tag: { pct: tagT ? Math.round(100 * tagM / tagT) : null, pairs: tagT, match: tagM, mismatches: tagMis },
      sub_visible: { count: subCount, elements: subv },
    };
    console.log(`\n===== ${vw}px =====`);
    console.log(`  CONTENT  ${contentPct}%   (${cDrop} dropped: ${dropText.length} text / ${dropImg.length} img / ${dropLink.length} link)`);
    console.log(`  CSS      ${T ? Math.round(100 * M / T) : 0}%   (${M}/${T} MEANINGFUL props; ${mis.length} elements off; ${unm.length} draft els UNMATCHED; ${subCount} sub-visible excluded)`);
    console.log(`  TAG      ${tagT ? Math.round(100 * tagM / tagT) : 0}%   (${tagM}/${tagT} pairs; ${tagMis.length} tag divergences [reported, not failed])`);
    if (vw === VIEWPORTS[VIEWPORTS.length - 1]) {
      if (dropText.length) console.log('  dropped text: ' + dropText.slice(0, 8).map(t => '"' + t.slice(0, 26) + '"').join(', '));
      if (tagMis.length) console.log('  tag divergences: ' + tagMis.slice(0, 8).map(t => `"${t.text.slice(0, 20)}" ${t.draft_tag}->${t.clone_tag}`).join(', '));
      console.log('  -- CSS mismatches (top 24) --');
      for (const m of mis.slice(0, 24)) console.log(`    [${m.tag}] "${m.text.slice(0, 40)}": ` + m.diffs.map(x => `${x.prop} ${x.draft}->${x.clone}`).join('; '));
      if (mis.length > 24) console.log(`    ... +${mis.length - 24} more (see --out JSON)`);
    }
  }
  report.overall_css_pct = gT ? Math.round(100 * gM / gT) : null;
  report.overall_tag_pct = gTagT ? Math.round(100 * gTagM / gTagT) : null;
  report.sub_visible_total = gSub;
  console.log(`\n##### OVERALL CSS ${report.overall_css_pct}% (${gM}/${gT} meaningful props) | TAG ${report.overall_tag_pct}% (${gTagM}/${gTagT} pairs) | ${gSub} sub-visible excluded, ${VIEWPORTS.length} viewports. VISIBLE-fidelity (Spec 20 v1.1.0); pairs with Bean's eye, never closes alone. Excludes text: ${EXCLUDE.join(', ') || 'none'} #####`);
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log('report -> ' + OUT); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
