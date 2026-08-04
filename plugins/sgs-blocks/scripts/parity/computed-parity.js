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
const SELF_TEST = process.argv.includes('--self-test');
if (!SELF_TEST && (!DRAFT || !CLONE)) { console.error('ERROR: --draft <url> and --clone <url> are required.'); process.exit(2); }

// ── Fluid-typography equivalence (v1.2.0-fluid, 2026-08-04) ────────────────────────────────
// GROUND-TRUTH: theme/sgs-theme/theme.json settings.typography.fluid (read direct 2026-08-04):
// minViewportWidth 375px, maxViewportWidth 1200px, no minFontSize override. fontSizes[] read
// verbatim from the same file (x-small/medium are the only `"fluid": false` presets).
// The clamp-generation algorithm below is a line-for-line port of WordPress core's
// wp_get_typography_font_size_value() + wp_get_computed_fluid_typography_value()
// (wp-includes/block-supports/typography.php, fetched verbatim from
// WordPress/wordpress-develop trunk 2026-08-04 — quoted in
// .claude/reports/2026-08-04-parity-fluid-equivalence-fix.md). Root cause proven this session
// (.claude/reports/2026-08-04-fluid-typography-mobile-parity-hypothesis.md): the DRAFT is
// hand-authored flat px; the CLONE renders through WP's theme.json-driven fluid clamp(). A
// font-size "mismatch" below the 1200px ceiling that is EXACTLY the clamp() transform of the
// draft's own value is a faithful transfer, not a fidelity loss — Bean's decision: fix the
// MEASUREMENT (never theme.json, never disable fluid typography).
const THEME_FLUID = {
  minViewportWidth: 375,
  maxViewportWidth: 1200,
  minFontSizeLimit: 14,   // WP's own hardcoded default ($default_minimum_font_size_limit); this
                           // theme.json does not override typography.fluid.minFontSize.
  // Registered presets (theme.json settings.typography.fontSizes, verbatim). A base px value
  // that matches one of these EXACTLY uses ITS declared fluid setting (respects `fluid:false`
  // per-size, req. 3) instead of the generic auto-generation path below.
  presets: [
    { sizePx: 12, fluid: false },                    // x-small
    { sizePx: 14, fluid: { min: 13, max: 14 } },      // small
    { sizePx: 18, fluid: false },                     // medium
    { sizePx: 20, fluid: { min: 17, max: 20 } },      // large
    { sizePx: 24, fluid: { min: 20, max: 24 } },      // x-large
    { sizePx: 36, fluid: { min: 26, max: 36 } },      // xx-large
    { sizePx: 50, fluid: { min: 32, max: 50 } },      // hero
  ],
};
// DRIFT GUARD (adversarial-review finding, 2026-08-04): THEME_FLUID above is a hand-copied
// snapshot of theme.json, exactly the class of hardcoded-dict bug this project's own DB-first
// rule (R-31-1) exists to catch. If theme.json's fluid settings or fontSizes list ever change,
// a stale snapshot would confidently compute against the WRONG curve — silently masking a real
// regression OR wrongly failing a correct clone. Read theme.json LIVE at run time and fail
// CLOSED (never grant fluid-equivalence for the rest of the run) if it has drifted, rather than
// trusting the hardcoded copy. Runs once per process; the parsed live file, not the hardcoded
// object, becomes the source of truth for wpFluidBounds() from that point on.
const THEME_JSON_PATH = path.join(__dirname, '..', '..', '..', '..', 'theme', 'sgs-theme', 'theme.json');
let THEME_FLUID_VERIFIED = false;
function verifyThemeFluidFreshness() {
  try {
    const theme = JSON.parse(fs.readFileSync(THEME_JSON_PATH, 'utf8'));
    const fluid = (theme.settings && theme.settings.typography && theme.settings.typography.fluid) || {};
    const fontSizes = (theme.settings && theme.settings.typography && theme.settings.typography.fontSizes) || [];
    const px = (v) => (v == null ? null : parseFloat(String(v)));
    const drifts = [];
    if (px(fluid.minViewportWidth) !== THEME_FLUID.minViewportWidth) drifts.push(`minViewportWidth theme.json=${fluid.minViewportWidth} vs THEME_FLUID=${THEME_FLUID.minViewportWidth}`);
    if (px(fluid.maxViewportWidth) !== THEME_FLUID.maxViewportWidth) drifts.push(`maxViewportWidth theme.json=${fluid.maxViewportWidth} vs THEME_FLUID=${THEME_FLUID.maxViewportWidth}`);
    if (fluid.minFontSize) drifts.push(`theme.json now sets typography.fluid.minFontSize=${fluid.minFontSize} (an override THEME_FLUID.minFontSizeLimit=${THEME_FLUID.minFontSizeLimit} does not account for)`);
    for (const fs_ of fontSizes) {
      const sizePx = px(fs_.size);
      if (sizePx == null) continue;
      const known = THEME_FLUID.presets.find((p) => Math.abs(p.sizePx - sizePx) < 0.5);
      if (!known) { drifts.push(`theme.json has an unrecognised fontSize preset "${fs_.slug}"=${fs_.size} not in THEME_FLUID.presets`); continue; }
      const themeFluidFalse = fs_.fluid === false;
      const knownFluidFalse = known.fluid === false;
      if (themeFluidFalse !== knownFluidFalse) drifts.push(`preset "${fs_.slug}" fluid:false mismatch — theme.json=${themeFluidFalse} vs THEME_FLUID=${knownFluidFalse}`);
      if (!themeFluidFalse && !knownFluidFalse) {
        const tMin = px(fs_.fluid && fs_.fluid.min), tMax = px(fs_.fluid && fs_.fluid.max);
        if (tMin !== known.fluid.min || tMax !== known.fluid.max) drifts.push(`preset "${fs_.slug}" fluid min/max drifted — theme.json=${tMin}/${tMax} vs THEME_FLUID=${known.fluid.min}/${known.fluid.max}`);
      }
    }
    if (drifts.length) {
      console.error('\n⚠⚠⚠ FLUID-EQUIVALENCE DISABLED — THEME_FLUID has drifted from the live theme.json:');
      drifts.forEach((d) => console.error('    - ' + d));
      console.error('    Update THEME_FLUID in computed-parity.js to match, then re-run. Failing CLOSED: no font-size/line-height mismatch will be granted fluid-equivalence this run.\n');
      return false;
    }
    THEME_FLUID_VERIFIED = true;
    return true;
  } catch (e) {
    console.error(`\n⚠⚠⚠ FLUID-EQUIVALENCE DISABLED — could not read/parse theme.json at ${THEME_JSON_PATH}: ${e.message}\n`);
    return false;
  }
}
verifyThemeFluidFreshness();

// ── wpFluidBounds/wpFluidValueAt: SELF-TEST-ONLY replica of WP's generation formula ────────
// SUPERSEDED for live decisions (2026-08-04, post-review). Both dispatched reviews independently
// found the ORIGINAL design unsafe: it INFERRED which theme.json preset a measured px belonged
// to from numeric coincidence alone, then trusted THAT preset's declared bounds. Two presets can
// resolve to overlapping computed pixels at a given viewport, so a wrong-preset guess means wrong
// bounds — which means validating a genuinely broken clone against the WRONG curve and PASSING
// it. That is the exact failure mode this rule exists to prevent (correctness review, grounded in
// `sgs_font_size_value()`, plugins/sgs-blocks/includes/helpers-tokens.php:729-749: a NUMERIC
// attribute renders as a flat px string with NO clamp() at all — only a SLUG renders via
// `var(--wp--preset--font-size--slug)` — so numeric coincidence is not evidence of routing).
// FIX: `fluidEquivalentFontSize` below now reads the ACTUAL declared CSS text off the live
// element (captured by `declaredValue()` in CAPTURE_SRC) and parses ITS OWN literal clamp()
// expression — zero attribution guessing. These two functions are kept ONLY to construct the
// --self-test's synthetic "good-clone" fixture (which needs a real, WP-formula-correct clamp()
// string to embed) and as a cross-check that this file's understanding of the WP algorithm
// still matches theme.json (verifyThemeFluidFreshness above) — they are NOT called from
// fluidEquivalentFontSize/lineHeightIsMechanicalConsequence any more.
function wpFluidBounds(basePx) {
  const nonFluidPreset = THEME_FLUID.presets.find((p) => p.fluid === false && Math.abs(p.sizePx - basePx) < 0.5);
  if (nonFluidPreset) return null;
  if (basePx <= THEME_FLUID.minFontSizeLimit) return null;
  const factor = Math.min(0.75, Math.max(0.25, 1 - 0.075 * Math.log2(basePx)));
  const calculatedMin = Math.round(basePx * factor * 1000) / 1000;
  const min = calculatedMin <= THEME_FLUID.minFontSizeLimit ? THEME_FLUID.minFontSizeLimit : calculatedMin;
  return { min, max: basePx };
}
function wpFluidValueAt(basePx, viewportPx) {
  const bounds = wpFluidBounds(basePx);
  if (!bounds) return null;
  const { min, max } = bounds;
  if (viewportPx <= THEME_FLUID.minViewportWidth) return min;
  if (viewportPx >= THEME_FLUID.maxViewportWidth) return max;
  const denom = THEME_FLUID.maxViewportWidth - THEME_FLUID.minViewportWidth;
  const offset = Math.round((THEME_FLUID.minViewportWidth / 100) * 1000) / 1000;
  let linearFactor = 100 * ((max - min) / denom);
  linearFactor = Math.round(linearFactor * 1000) / 1000;
  if (linearFactor === 0) linearFactor = 1;
  const vw = viewportPx / 100;
  const preferred = min + (vw - offset) * linearFactor;
  return Math.min(max, Math.max(min, preferred));
}

// ── Source-verified fluid-equivalence (2026-08-04, post-review rewrite) ────────────────────
// Parses WP's OWN generated clamp() expression directly off the live element's declared CSS
// text (never a guess). WP authors the middle (preferred-value) term as
// `<base>rem + ((1vw - <offset>px) * <factor>)`, but the LIVE BROWSER algebraically simplifies
// this before `getPropertyValue()`/CSSOM returns it — VERIFIED live via Playwright, 2026-08-04:
// the authored `0.875rem + ((1vw - 3.75px) * 0.242)` comes back from Chromium as
// `-0.9075px + 0.875rem + 0.242vw` (distributed and reordered; -3.75*0.242=-0.9075 folded into
// a px constant). Parsing therefore does NOT match WP's authored shape — it sums every px/rem
// TERM into a constant (rem*16) and every vw term's coefficient into a factor, order-independent
// (mathematically identical to WP's own form: preferred(viewportPx) = constPx + factor*(vw%)).
// BLIND SPOT: recognises linear px/rem/vw calc() terms only — a clamp() using any other unit
// (%, em, ch, container query units) or a non-linear expression is NOT this generation pattern
// and DECLINES rather than guesses. A font-size set via any mechanism `declaredValue()` cannot
// see (deeper var() chain, cross-origin sheet, ambiguous cascade — see its own blind-spot
// comment) also DECLINES.
function parseClampExpr(text) {
  if (!text) return null;
  const outer = /^clamp\(\s*([-\d.]+)(px|rem)\s*,\s*(.+?)\s*,\s*([-\d.]+)(px|rem)\s*\)$/i.exec(String(text).trim());
  if (!outer) return null;
  const toPx = (v, u) => (u.toLowerCase() === 'rem' ? parseFloat(v) * 16 : parseFloat(v));
  const minPx = toPx(outer[1], outer[2]), maxPx = toPx(outer[4], outer[5]);
  const termRe = /([+-]?\s*[\d.]+)\s*(px|rem|vw)/gi;
  let term, constPx = 0, factor = 0, sawAny = false, consumed = 0;
  const mid = outer[3];
  while ((term = termRe.exec(mid))) {
    sawAny = true;
    consumed += term[0].length;
    const val = parseFloat(term[1].replace(/\s+/g, ''));
    const unit = term[2].toLowerCase();
    if (unit === 'px') constPx += val;
    else if (unit === 'rem') constPx += val * 16;
    else if (unit === 'vw') factor += val;
  }
  // Sanity check: every non-whitespace/operator/paren character in the middle term must have
  // been consumed as a recognised px/rem/vw token — if the browser emitted anything this parser
  // doesn't understand (a function call, an unrecognised unit), decline rather than silently
  // ignore it and compute against a partial/wrong reconstruction.
  const strippedLen = mid.replace(/[\s()+\-*]/g, '').length;
  if (!sawAny || consumed < strippedLen * 0.9) return null;
  return { minPx, maxPx, constPx, factor };
}
function evalClampAt(expr, viewportPx) {
  const preferred = expr.constPx + expr.factor * (viewportPx / 100);
  return Math.min(expr.maxPx, Math.max(expr.minPx, preferred));
}
// Tolerance ±0.5px: the capture pipeline's `normVal()` already rounds every fractional px to
// the nearest integer BEFORE it reaches here, so `crec.css['font-size']` is always an integer;
// ±0.5px absorbs exactly one round-half tie against our exact (unrounded) `evalClampAt()`
// prediction — it can NEVER swallow a real 1px+ regression (proven by the --self-test negative
// control, which plants a 4px-off mobile font-size and asserts it still misses).
const FLUID_TOLERANCE_PX = 0.5;
// Returns {equivalent, declined, predictedPx}. THREE conditions must ALL hold for `equivalent`:
//  1. The clone's DECLARED font-size text parses as WP's clamp() shape (else DECLINED — cannot
//     verify, treated as a normal miss, never guessed).
//  2. The clamp's own ceiling (maxPx) equals the DRAFT's flat value within tolerance — THIS is
//     the proof of correspondence: it confirms the clamp is a transform OF THIS element's own
//     draft value, not some unrelated clamp() that coincidentally evaluates near the right
//     pixel (the exact attack both reviews probed for). Not merely declined but scored as a
//     genuine miss when it fails, since a clamp existing with the WRONG ceiling is itself real
//     evidence of a transfer defect.
//  3. Evaluating that clamp() at the CURRENT viewport reproduces the clone's own computed value
//     (a parse-correctness sanity check; near-tautological when steps 1-2 hold, but catches a
//     malformed parse rather than silently trusting it).
function fluidEquivalentFontSize(drec, crec, viewportPx) {
  // BUG FOUND + FIXED (2026-08-04, caught by /qc-inline's own negative test on the drift guard
  // added earlier this session): verifyThemeFluidFreshness() SET `THEME_FLUID_VERIFIED` but
  // nothing ever READ it — the drift warning printed to console while every downstream check
  // kept silently trusting the (possibly stale) THEME_FLUID constants anyway. Proven live: a
  // deliberately-corrupted THEME_FLUID.minViewportWidth still passed the self-test's positive
  // fluid-equivalent assertion despite the drift banner firing. A gate that detects but doesn't
  // act is worse than no gate (it looks like protection while providing none). Also note: the
  // viewport-ceiling comparison below itself reads THEME_FLUID.maxViewportWidth, so an unverified
  // THEME_FLUID cannot be trusted for ANY branch here, not just the preset/formula ones — decline
  // outright rather than partially trust it.
  if (!THEME_FLUID_VERIFIED) return { equivalent: false, declined: true, predictedPx: null };
  if (viewportPx >= THEME_FLUID.maxViewportWidth) return { equivalent: false, declined: false, predictedPx: null };
  const expr = parseClampExpr(crec.declared && crec.declared.fontSize);
  if (!expr) return { equivalent: false, declined: true, predictedPx: null };
  const draftPx = parseFloat(drec.css['font-size']);
  if (!isFinite(draftPx)) return { equivalent: false, declined: true, predictedPx: null };
  if (Math.abs(expr.maxPx - draftPx) > FLUID_TOLERANCE_PX) return { equivalent: false, declined: false, predictedPx: null };
  const predictedPx = evalClampAt(expr, viewportPx);
  const actualPx = parseFloat(crec.css['font-size']);
  const equivalent = isFinite(actualPx) && Math.abs(predictedPx - actualPx) <= FLUID_TOLERANCE_PX;
  return { equivalent, declined: false, predictedPx };
}
// line-height (req. 4 + tolerance-compounding review finding): NOT an independent heuristic.
// REWRITTEN 2026-08-04 to eliminate compounded rounding error rather than widen the tolerance to
// tolerate it (a wider tolerance would also let a genuine regression through — the opposite of
// what's needed). The ORIGINAL version back-computed a ratio from FOUR already-integer-rounded
// measurements (dfs, dlh, cfs, clh), so rounding error from three separate roundings compounded
// into the comparison before a FOURTH rounding (clh) was compared against it — the tolerance
// budget for one rounding step was being asked to cover four. This version instead reads the
// clone's ACTUAL declared line-height multiplier (a bare unitless number is this framework's
// proven mechanism — evidence report §"line-height: consequence, not an independent cause") and
// multiplies it by `fsResult.predictedPx`, the EXACT (unrounded) clamp-evaluated font-size
// already derived above — not the rounded computed value. That removes 3 of the 4 rounding
// steps from the derivation entirely, leaving exactly ONE rounding step (the measured `clh`
// itself) to compare against, which is exactly what FLUID_TOLERANCE_PX was already calibrated
// for — no compounding, no widened/loosened tolerance, no new heuristic.
// BLIND SPOT: only a BARE unitless multiplier (`line-height:1.625`, no unit, no clamp(), no
// var()) is recognised as the mechanical-consequence pattern; an explicit px/clamp()/var()
// line-height is a DIFFERENT mechanism and DECLINES (never assumed derived).
function lineHeightIsMechanicalConsequence(drec, crec, fsResult) {
  if (!fsResult || !fsResult.equivalent || fsResult.predictedPx == null) return { equivalent: false, declined: false };
  const declared = (crec.declared && crec.declared.lineHeight || '').trim();
  const m = /^([\d.]+)$/.exec(declared);
  if (!m) return { equivalent: false, declined: true };  // px / clamp() / var() / % -> not the proven pattern
  const multiplier = parseFloat(m[1]);
  const expectedClh = fsResult.predictedPx * multiplier;
  const actualClh = parseFloat(crec.css['line-height']);
  const equivalent = isFinite(actualClh) && Math.abs(expectedClh - actualClh) <= FLUID_TOLERANCE_PX;
  return { equivalent, declined: false };
}

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

  // v1.2.0-fluid (2026-08-04): declared-value lookup for the fluid-equivalence check. Reads the
  // ACTUAL CSS text (not the resolved computed px) for font-size/line-height, walking UP the
  // ancestor chain (both properties are inherited — WP's fluid clamp() is typically declared
  // ONCE on body/:root :where(body) in the global-styles sheet and inherited by every text
  // element below with no closer override, per the live-verified pattern in the evidence
  // report). BLIND SPOTS (documented, never silently assumed away): (a) rule-matching
  // approximates cascade by "last matching rule in stylesheet source order wins" — it does NOT
  // model selector specificity or !important, so a lower-specificity LATER rule could
  // theoretically be picked over a higher-specificity EARLIER one (rare in this codebase's
  // generated CSS, which does not fight itself over font-size specificity); (b) var()
  // indirection is resolved ONE level only — a custom property whose value is itself another
  // var() will not resolve; (c) cross-origin stylesheets are inaccessible (CORS) and skipped.
  // Any of these DECLINE (return null) rather than guess — the caller then treats that element
  // as a normal, unforgiven mismatch (never grants fluid-equivalence on unverifiable evidence).
  const ruleIndex = []; const customProps = {};
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      // BUG FOUND + FIXED LIVE (2026-08-04, via Playwright against the sandybrown canary): modern
      // Chromium's CSS Nesting support means EVERY CSSStyleRule now exposes a .cssRules
      // property (an empty CSSRuleList when it has no nested rules) — so checking rule.cssRules
      // for truthiness was ALWAYS true and this walk recursed into it and skipped WITHOUT EVER
      // reading the rule's own .style, silently finding zero font-size/line-height declarations
      // on the entire live page (confirmed: a direct probe found the body selector's
      // font-size:clamp(...) rule sitting in global-styles-inline-css with cssRules = an empty
      // object, truthy but empty). Process a rule's OWN .style unconditionally, THEN also
      // recurse into .cssRules when it actually HAS nested entries (length > 0) — the two are
      // not mutually exclusive.
      const walk = (list) => {
        for (const rule of Array.from(list)) {
          if (rule.style) {
            for (const prop of ['font-size', 'line-height']) {
              const v = rule.style.getPropertyValue(prop);
              if (v && rule.selectorText) ruleIndex.push({ sel: rule.selectorText, prop, val: v.trim() });
            }
            for (let i = 0; i < rule.style.length; i++) {
              const name = rule.style[i];
              if (name && name.indexOf('--') === 0) customProps[name] = rule.style.getPropertyValue(name).trim();
            }
          }
          if (rule.cssRules && rule.cssRules.length > 0) walk(rule.cssRules);
        }
      };
      walk(rules);
    }
  } catch (e) { /* leave ruleIndex/customProps empty -> declaredValue always declines */ }
  // Resolves var(--name) AND var(--name, fallback) — the fallback portion is discarded (the
  // resolved custom-property value always wins when the property IS defined, which is the only
  // case this index can see; an UNDEFINED custom property correctly falls through to null below
  // rather than guessing the fallback was used).
  const resolveVar = (text) => {
    const m = /^var\\(\\s*(--[a-zA-Z0-9-]+)\\s*(?:,.*)?\\)$/.exec((text || '').trim());
    if (!m) return text;
    const resolved = customProps[m[1]];
    return resolved !== undefined ? resolved : null;  // unresolvable indirection -> caller declines
  };
  const declaredValue = (startEl, prop) => {
    for (let el = startEl; el && el.nodeType === 1; el = el.parentElement) {
      const inline = el.style && el.style.getPropertyValue(prop);
      if (inline) return resolveVar(inline.trim());
      let found = null;
      for (const r of ruleIndex) {
        if (r.prop !== prop) continue;
        let m = false; try { m = el.matches(r.sel); } catch (e) { m = false; }
        if (m) found = r.val;  // last match in source order wins (cascade approximation)
      }
      if (found) return resolveVar(found);
    }
    return null;
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
  const mk = (el) => ({ tag: el.tagName.toLowerCase(), cls: clsList(el), css: readAll(el),
    declared: { fontSize: declaredValue(el, 'font-size'), lineHeight: declaredValue(el, 'line-height') },
    ...ctx(el) });
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
// How many MEANINGFUL props a draft element carries when it has NO clone counterpart at all
// (FR-20-4 fix, 2026-08-04). For a matched pair `comparePair` calls a prop meaningful when it
// DIFFERS from the clone OR is non-default on the draft. With no clone record the first half is
// uncomputable, so only the non-default half is used — the conservative direction (it can only
// UNDER-count, never invent failures).
//
// WHY THIS EXISTS: an unmatched draft element used to `continue` before touching total/match, so
// an element the clone was MISSING ENTIRELY contributed nothing to the score and was invisible to
// the headline percentage. Measured live on Mama's 2026-08-04: the missing brand image sat in
// `unmatched_elements` while the report read "content 99%" — a real, eye-confirmed defect that
// the number could not see. A missing element is the WORST possible fidelity outcome; it must
// score as a total loss, not as an exemption.
function meaningfulCountUnmatched(drec, dDef) {
  const ddef = dDef[drec.tag] || {};
  let n = 0;
  for (const p of Object.keys(drec.css)) {
    if (ddef[p] !== undefined && drec.css[p] !== ddef[p]) n++;
  }
  return n;
}

function comparePair(drec, crec, dDef, viewportPx) {
  let total = 0, match = 0, declined = 0; const diffs = [], sub = [], fluid = [];
  const ddef = dDef[drec.tag] || {};
  // Computed ONCE per pair (not per-prop) so the line-height branch below can require it.
  // `fsResult` = {equivalent, declined, predictedPx} — see fluidEquivalentFontSize's docblock.
  const fsResult = fluidEquivalentFontSize(drec, crec, viewportPx);
  for (const p of Object.keys(drec.css)) {
    const dv = drec.css[p], cv = crec.css[p];
    if (cv === undefined) continue;
    const meaningful = (dv !== cv) || (ddef[p] !== undefined && dv !== ddef[p]);
    if (!meaningful) continue;
    if (propMatches(p, dv, cv)) { total++; match++; continue; }
    // FLUID-EQUIVALENCE (v1.2.0-fluid, 2026-08-04, source-verified per post-review rewrite): a
    // genuine PASS — counts toward match/total like any other pass — but recorded in its OWN
    // bucket so it stays visible rather than being silently absorbed into `match`. DECLINED
    // (evidence insufficient to verify either way) is counted separately and falls through to
    // the ordinary real-miss path below — never silently dropped, never guessed into a pass.
    if (p === 'font-size') {
      if (fsResult.equivalent) { total++; match++; fluid.push({ prop: p, draft: dv, clone: cv, basis: 'wp-fluid-clamp-source-verified' }); continue; }
      if (fsResult.declined) declined++;
    }
    if (p === 'line-height') {
      const lhResult = lineHeightIsMechanicalConsequence(drec, crec, fsResult);
      if (lhResult.equivalent) { total++; match++; fluid.push({ prop: p, draft: dv, clone: cv, basis: 'unitless-multiplier-source-verified' }); continue; }
      if (lhResult.declined) declined++;
    }
    const bucket = subVisibleBucket(p, dv, cv, drec, crec);
    if (bucket) { sub.push({ prop: p, draft: dv, clone: cv, bucket }); continue; }  // unscored
    total++; diffs.push({ prop: p, draft: dv, clone: cv });
  }
  return { total, match, diffs, sub, fluid, declined };
}

// ── --self-test (2026-08-04, rewritten post-review) ────────────────────────────────────────
// Proves the fluid-equivalence rule via the REAL pipeline (capture() + comparePair()), not a
// reimplementation — on-disk HTML fixtures stand in for "draft" and "clone", run through the
// actual browser + the actual comparison code this file ships.
//   1. POSITIVE: draft flat 16px/26px-lh vs a clone using the EXACT live clamp() formula
//      measured on the canary -> expect 0 real font-size/line-height misses, >=1 fluid-equivalent.
//   2. NEGATIVE CONTROL: same draft vs a clone with a flat, clamp-unrelated 10px/14px (not a
//      point on the 14-16px clamp curve, and not a clamp() at all) -> expect a REAL scored miss,
//      DECLINED (no parseable clamp() text), NOT fluid-equivalent. Per the task's own warning, a
//      negative control can be vacuous if the planted break never lands — so this reads the
//      fixture file back off disk and asserts the injected "10px" string is actually present
//      BEFORE trusting the comparison result.
//   3. UNPARSEABLE-SOURCE GUARD: a flat 11px clone against a 12px draft (no clamp() text at all)
//      -> DECLINED, never guessed into a pass, regardless of how "shrink-shaped" the numbers look.
//   4. MISATTRIBUTION REGRESSION (the exact bug both reviewers found in the ORIGINAL design):
//      draft=20px (which numerically coincides with the "large" preset's OWN declared size).
//      The clone renders a genuinely FLAT, non-fluid 17px (simulating a discrete device-tier
//      hardcode, or any other non-fluid mechanism) — 17px is exactly what the OLD preset-identity
//      guess would have predicted as "large"'s min bound at the 375px floor, so the ORIGINAL code
//      would have WRONGLY GRANTED fluid-equivalence here (validating a broken clone against a
//      curve it never actually used). The rewritten source-verified code MUST decline (no
//      clamp() in the clone's declared CSS) and score it as a real miss.
async function selfTest() {
  const dir = path.join(__dirname, '__fluid_selftest_fixtures__');
  fs.mkdirSync(dir, { recursive: true });
  const TEXT = 'she was struggling with breastfeeding her newborn';
  const TEXT2 = 'handmade in birmingham for the mum who deserves it';
  const write = (name, text, fontSize, lineHeight) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, `<!DOCTYPE html><html><body><p style="font-size:${fontSize};line-height:${lineHeight};margin:0;">${text}</p></body></html>`);
    return p;
  };
  const draftPath = write('draft.html', TEXT, '16px', '26px');
  // Exact live formula for base=16px measured on the canary (report §"the mechanism, traced to
  // source"): clamp(14px, 0.875rem + ((1vw - 3.75px) * 0.242), 16px). line-height follows the
  // SAME unitless multiplier (26/16 = 1.625) the framework uses everywhere.
  const goodClonePath = write('good-clone.html', TEXT, 'clamp(14px, 0.875rem + ((1vw - 3.75px) * 0.242), 16px)', '1.625');
  // Negative control: a flat, clamp-unrelated mobile font-size — NOT a point on any fluid curve
  // for base=16px (predicted clamp value at 375px is 14px; 10px is 4px off, far outside tolerance)
  // and NOT a clamp() at all, so this must DECLINE rather than be evaluated-and-rejected.
  const badClonePath = write('bad-clone.html', TEXT, '10px', '14px');
  // Unparseable-source guard: base=12px, clone flat 11px (no clamp() text at all).
  const guardDraftPath = write('guard-draft.html', TEXT, '12px', '18px');
  const guardClonePath = write('guard-clone.html', TEXT, '11px', '17px');
  // Misattribution regression (Test 4): base=20px exactly equals the "large" preset's declared
  // size (theme.json fontSizes: large=20px, fluid min 17/max 20). The OLD wpFluidBounds() would
  // have matched this numeric coincidence and used large's OWN bounds -> predicted 17px at
  // 375px (the viewport floor returns `min` exactly) -> WOULD have wrongly matched a flat,
  // non-fluid clone hardcoded to 17px. The clone here is a FLAT 17px (no clamp() at all).
  const misDraftPath = write('mis-draft.html', TEXT2, '20px', '30px');
  const misClonePath = write('mis-clone.html', TEXT2, '17px', '25.5px');

  // Confirm the planted breaks actually landed on disk (measurement-vs-vacuity guard, per task).
  const badOnDisk = fs.readFileSync(badClonePath, 'utf8');
  const guardOnDisk = fs.readFileSync(guardClonePath, 'utf8');
  const misOnDisk = fs.readFileSync(misClonePath, 'utf8');
  if (!badOnDisk.includes('10px')) { console.error('SELF-TEST SETUP FAILED: injected 10px break not found on disk in bad-clone.html'); process.exit(1); }
  if (!guardOnDisk.includes('11px')) { console.error('SELF-TEST SETUP FAILED: injected 11px break not found on disk in guard-clone.html'); process.exit(1); }
  if (!misOnDisk.includes('17px')) { console.error('SELF-TEST SETUP FAILED: injected 17px misattribution break not found on disk in mis-clone.html'); process.exit(1); }
  console.log('  [setup] confirmed all 3 planted breaks are present on disk (bad-clone.html has 10px, guard-clone.html has 11px, mis-clone.html has 17px)');

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const VW = 375;
  let failures = 0;
  const check = (label, cond, detail) => {
    console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
    if (!cond) failures++;
  };

  // --- Test 1: POSITIVE (fluid-equivalent font-size + line-height) ---
  {
    const d = await capture(page, toURL(draftPath), VW);
    const c = await capture(page, toURL(goodClonePath), VW);
    const drec = d.textEls[TEXT], crec = c.textEls[TEXT];
    check('positive fixture: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const fsMiss = r.diffs.some((x) => x.prop === 'font-size');
    const lhMiss = r.diffs.some((x) => x.prop === 'line-height');
    const fsFluid = r.fluid.some((x) => x.prop === 'font-size');
    const lhFluid = r.fluid.some((x) => x.prop === 'line-height');
    check('positive: font-size is NOT a real miss', !fsMiss, `draft=${drec.css['font-size']} clone=${crec.css['font-size']}`);
    check('positive: font-size IS bucketed fluid-equivalent', fsFluid);
    check('positive: line-height is NOT a real miss', !lhMiss, `draft=${drec.css['line-height']} clone=${crec.css['line-height']}`);
    check('positive: line-height IS bucketed fluid-equivalent (derived)', lhFluid);
    check('positive: declined count is 0 (clean pass, nothing unverifiable)', r.declined === 0);
  }

  // --- Test 2: NEGATIVE CONTROL (genuinely wrong mobile font-size must still miss) ---
  {
    const d = await capture(page, toURL(draftPath), VW);
    const c = await capture(page, toURL(badClonePath), VW);
    const drec = d.textEls[TEXT], crec = c.textEls[TEXT];
    check('negative fixture: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const fsMiss = r.diffs.some((x) => x.prop === 'font-size');
    const fsFluid = r.fluid.some((x) => x.prop === 'font-size');
    check('negative control: font-size IS still a real scored miss', fsMiss, `draft=${drec.css['font-size']} clone=${crec.css['font-size']} (flat 10px, no clamp() to verify)`);
    check('negative control: font-size is NOT granted fluid-equivalence', !fsFluid);
    check('negative control: declined (no clamp() text to verify) rather than silently guessed', r.declined >= 1);
  }

  // --- Test 3: UNPARSEABLE-SOURCE GUARD (flat clone value must never be guessed into a pass) ---
  {
    const d = await capture(page, toURL(guardDraftPath), VW);
    const c = await capture(page, toURL(guardClonePath), VW);
    const drec = d.textEls[TEXT], crec = c.textEls[TEXT];
    check('guard fixture: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const fsMiss = r.diffs.some((x) => x.prop === 'font-size');
    const fsFluid = r.fluid.some((x) => x.prop === 'font-size');
    check('unparseable-source guard: 12px->11px is still a real scored miss', fsMiss);
    check('unparseable-source guard: NOT granted fluid-equivalence despite resembling a shrink', !fsFluid);
    check('unparseable-source guard: declined, not guessed', r.declined >= 1);
  }

  // --- Test 4: MISATTRIBUTION REGRESSION (the exact bug the reviews found — see comment above) ---
  {
    const d = await capture(page, toURL(misDraftPath), VW);
    const c = await capture(page, toURL(misClonePath), VW);
    const drec = d.textEls[TEXT2], crec = c.textEls[TEXT2];
    check('misattribution fixture: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const fsMiss = r.diffs.some((x) => x.prop === 'font-size');
    const fsFluid = r.fluid.some((x) => x.prop === 'font-size');
    check('misattribution regression: 20px->17px (old code\'s exact false-pass case) IS a real scored miss', fsMiss, `draft=${drec.css['font-size']} clone=${crec.css['font-size']}`);
    check('misattribution regression: NOT granted fluid-equivalence (no clamp() in the clone\'s source)', !fsFluid);
    check('misattribution regression: declined (evidence insufficient), never guessed via preset identity', r.declined >= 1);
  }

  await browser.close();
  console.log(failures ? `\n${failures} SELF-TEST CHECK(S) FAILED` : '\nALL SELF-TEST CHECKS PASSED');
  process.exit(failures ? 1 : 0);
}

if (SELF_TEST) {
  selfTest().catch((e) => { console.error(e); process.exit(1); });
} else {
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const report = {
    draft: DRAFT, clone: CLONE,
    method: 'computed values, matched by content, all-props-minus-blocklist, meaningful-only, visible-fidelity (Spec 20 v1.2.0 / rule 4a). font-family primary-only; sub-visible twins bucketed (unscored) by invisibility predicate; tag scored separately; classes context-only. v1.2.0 (2026-08-04): a draft element with NO clone counterpart now scores its meaningful props as MISSES instead of being excluded from the score, and every pct carries its denominator.',
    viewports: {},
  };
  let gT = 0, gM = 0, gSub = 0, gTagT = 0, gTagM = 0, gFluid = 0, gFluidDeclined = 0;

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
    // `unmT` tracks how much of T came from MISSING elements, so the honest all-in score and the
    // legacy matched-only score can both be reported without one hiding the other.
    let T = 0, M = 0, tagT = 0, tagM = 0, unmT = 0, fluidDeclined = 0; const mis = [], unm = [], subv = [], tagMis = [], fluidv = [];
    const runTier = (map, cloneMap, exact) => {
      for (const [key, drec] of Object.entries(map)) {
        if (excluded(key)) continue;
        const crec = findByAnchor(key, cloneMap, exact);
        if (!crec) {
          // FR-20-4 (FIXED 2026-08-04): the draft element has NO clone counterpart — it is
          // MISSING from the clone. Previously this `continue`d before touching total/match, so
          // the worst possible outcome scored as nothing at all. Now every meaningful prop it
          // carried counts as a MISS (total += n, match += 0), and its tag counts as a miss too.
          const lost = meaningfulCountUnmatched(drec, d.defaults);
          unm.push({ text: key.slice(0, 44), tag: drec.tag, meaningful_props_lost: lost });
          T += lost; unmT += lost;
          tagT++;
          continue;
        }
        // TAG dimension (FR-20-9) — scored SEPARATELY from CSS; reported, never auto-failed.
        tagT++;
        if (drec.tag === crec.tag) tagM++;
        else tagMis.push({ text: key.slice(0, 40), draft_tag: drec.tag, clone_tag: crec.tag });
        // CSS dimension.
        const r = comparePair(drec, crec, d.defaults, vw);
        T += r.total; M += r.match; fluidDeclined += r.declined;
        if (r.diffs.length) mis.push({
          text: key.slice(0, 46), tag: drec.tag, diffs: r.diffs,
          // FR-20-10: class context ONLY — never scored, present for human/debug audit.
          classes: { draft: drec.cls || [], clone: crec.cls || [] },
        });
        if (r.sub.length) subv.push({ text: key.slice(0, 46), tag: drec.tag, sub: r.sub });
        if (r.fluid.length) fluidv.push({ text: key.slice(0, 46), tag: drec.tag, fluid: r.fluid });
      }
    };
    runTier(d.textEls, c.textEls, false);
    runTier(d.boxEls, c.boxEls, true);

    const subCount = subv.reduce((n, e) => n + e.sub.length, 0);
    const fluidCount = fluidv.reduce((n, e) => n + e.fluid.length, 0);
    gT += T; gM += M; gSub += subCount; gTagT += tagT; gTagM += tagM; gFluid += fluidCount; gFluidDeclined += fluidDeclined;
    report.viewports[vw] = {
      // DENOMINATORS ARE MANDATORY (2026-08-04). `content` previously reported a bare `pct` with
      // no match/total, so "content 99%" could not be checked against anything — a percentage
      // over an unstated population. total/matched/dropped are now always present.
      content: {
        pct: contentPct, total: cTot, matched: cTot - cDrop, dropped: cDrop,
        dropped_text: dropText, dropped_images: dropImg, dropped_links: dropLink,
      },
      css: {
        // `pct` is the HONEST score: missing elements included as misses.
        pct: T ? Math.round(100 * M / T) : null,
        meaningful_props: T, match: M,
        // `pct_matched_only` is the LEGACY score (pre-2026-08-04): computed over matched pairs
        // only, ignoring elements absent from the clone. Kept for run-to-run comparability with
        // older artefacts — NEVER quote it as fidelity; it cannot see a missing element.
        pct_matched_only: (T - unmT) ? Math.round(100 * M / (T - unmT)) : null,
        meaningful_props_lost_to_unmatched: unmT,
        unmatched_elements: unm, mismatches: mis,
      },
      tag: { pct: tagT ? Math.round(100 * tagM / tagT) : null, pairs: tagT, match: tagM, mismatches: tagMis },
      sub_visible: { count: subCount, elements: subv },
      // fluid_equivalent (v1.2.0-fluid, 2026-08-04): font-size/line-height "mismatches" that are
      // exactly WP's own fluid clamp() transform of the draft's flat value at this viewport —
      // counted as PASSES (in css.match above) but kept visible in their own bucket per the
      // requirement that this NOT be silently absorbed.
      fluid_equivalent: { count: fluidCount, elements: fluidv },
      // fluid_declined (2026-08-04, adversarial-review follow-up): font-size/line-height
      // mismatches where the evidence to VERIFY a fluid transform was insufficient (no parseable
      // clamp() text, or no bare unitless line-height multiplier) — never guessed, always folded
      // into the ordinary real-miss count (visible in `css.mismatches`), counted separately here
      // ONLY so the "how many did we decline rather than guess" question is answerable.
      fluid_declined: fluidDeclined,
    };
    console.log(`\n===== ${vw}px =====`);
    console.log(`  CONTENT  ${contentPct}%   (${cTot - cDrop}/${cTot}; ${cDrop} dropped: ${dropText.length} text / ${dropImg.length} img / ${dropLink.length} link)`);
    console.log(`  CSS      ${T ? Math.round(100 * M / T) : 0}%   (${M}/${T} MEANINGFUL props; ${mis.length} elements off; ${subCount} sub-visible excluded; ${fluidCount} fluid-equivalent [scored as PASS]; ${fluidDeclined} fluid-declined [unverifiable, scored as normal miss])`);
    if (unm.length) {
      console.log(`  ⚠ MISSING  ${unm.length} draft element(s) have NO counterpart in the clone — ${unmT} meaningful prop(s) scored as LOST (was: excluded from the score entirely).`);
      for (const u of unm.slice(0, 6)) console.log(`      [${u.tag}] "${u.text}" (${u.meaningful_props_lost} props)`);
    }
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
  report.fluid_equivalent_total = gFluid;
  report.fluid_declined_total = gFluidDeclined;
  console.log(`\n##### OVERALL CSS ${report.overall_css_pct}% (${gM}/${gT} meaningful props) | TAG ${report.overall_tag_pct}% (${gTagM}/${gTagT} pairs) | ${gSub} sub-visible excluded | ${gFluid} fluid-equivalent (scored PASS) | ${gFluidDeclined} fluid-declined (unverifiable, scored as normal miss), ${VIEWPORTS.length} viewports. VISIBLE-fidelity (Spec 20 v1.2.0; missing elements SCORED as misses); pairs with Bean's eye, never closes alone. Excludes text: ${EXCLUDE.join(', ') || 'none'} #####`);
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log('report -> ' + OUT); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
}
