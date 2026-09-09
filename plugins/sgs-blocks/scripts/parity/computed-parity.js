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
 * ── v1.3.0 (qc-council, 2026-09-08) ──
 * Two proven false-negative gaps closed, both council-falsified against fresh live measurement
 * before being fixed (not from a single agent's report):
 *   (1) PSEUDO-ELEMENT PAINT FALLBACK — SGS paints backgrounds/gradient borders on ::after/
 *       ::before (sgs_block_background_layer_css/sgs_border_gradient_css), which readAll() never
 *       queried. Every such block false-flagged as "background/border missing". Fixed as a
 *       fallback in readAll(): the pseudo value is used ONLY when the element's own value is a
 *       non-painting default, so a genuinely unpainted element still scores as empty.
 *   (2) TAG-DEFAULTS CENSUS WIDENED — the per-tag defaults census covered only 16 tags; any
 *       unmatched element of a missing tag (found live: <article>, e.g. the testimonial cards)
 *       scored ZERO lost props by construction, regardless of actual severity. List widened +
 *       both consumers now fall back to `dDef.div` rather than `{}` for a genuinely novel tag.
 * NOT fixed this pass (documented, not silently dropped): a node-MATCHING bug where, when
 * several nested elements share identical normalised text, the box-collision resolver can land
 * on a wrapper that structurally cannot carry the box-level property actually being compared
 * (e.g. a border painted on an ancestor <section>, matched against a descendant it doesn't own).
 * This needs its own design pass — a "deepest wins" vs "shallowest wins" flip fixes one confirmed
 * case and breaks another, per council findings 2026-09-08. Tracked, not guessed at.
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
const os = require('os');
const { execFileSync } = require('child_process');
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
  // Re-synced to theme.json 2026-09-09 (D1007, commits ea877e35a/67253fb03) — that change moved
  // EVERY registered font-size preset to fluid:false and renamed/added slugs (x-small + medium
  // removed, "regular"=16px added). Production scoring (fluidEquivalentFontSize) does not read
  // this list — it parses the clone's OWN declared clamp() text directly — so this re-sync only
  // restores verifyThemeFluidFreshness()'s drift gate; it cannot move any scored result (Step 0's
  // own on-fail condition, verified after this edit by re-running against page 2742).
  presets: [
    { sizePx: 14, fluid: false },   // small
    { sizePx: 16, fluid: false },   // regular
    { sizePx: 20, fluid: false },   // large
    { sizePx: 24, fluid: false },   // x-large
    { sizePx: 36, fluid: false },   // xx-large
    { sizePx: 50, fluid: false },   // hero
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
// Step 10 (measurement-integrity, 2026-09-09, R-31-1/FR-20-2): renamed BLOCK_LEGACY. This
// literal was previously the ENTIRE blocklist with zero DB binding — measured drift: 5 of the
// DB's 10 excluded_properties rows (overflow-x, overflow-y, flex-grow, flex-shrink, flex-basis)
// were absent here and scored live, while every entry below has no DB record at all. The DB is
// now the authoritative source (see queryExcludedPropertiesDB below); this literal is KEPT
// functioning as a legacy layer rather than silently dropped, but reconciling each entry
// against the DB (a genuine reason + decider row, or removal) is future work this step does
// NOT invent wholesale — a fabricated "decided_by" for 60+ entries nobody actually decided on
// would be worse than the gap it claims to close. Do not add new entries here; add a DB row.
const BLOCK_LEGACY = new Set([
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
// Step 10: reads sgs-framework.db's excluded_properties table (css_property/reason/
// decided_by/date) at module load — the authoritative source per FR-20-2, never a hardcoded
// literal. On DB-unreachable this THROWS (no try/catch, no fallback to an empty or the legacy
// hardcoded set) — a silently empty exclusion list would score every DB-decided exclusion as
// a real defect, which is worse than the tool refusing to run at all.
function queryExcludedPropertiesDB() {
  const dbPath = path.join(os.homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db').replace(/\\/g, '/');
  const pyScript = `import sqlite3, json\nconn = sqlite3.connect("file:${dbPath}?mode=ro", uri=True)\nrows = conn.execute("SELECT css_property FROM excluded_properties").fetchall()\nprint(json.dumps([r[0] for r in rows]))`;
  const out = execFileSync('python', ['-c', pyScript], { encoding: 'utf8' });
  return JSON.parse(out);
}
const DB_EXCLUDED_PROPERTIES = queryExcludedPropertiesDB();
{
  const dbOnlyNew = DB_EXCLUDED_PROPERTIES.filter((p) => !BLOCK_LEGACY.has(p));
  const toolOnlyLegacy = [...BLOCK_LEGACY].filter((p) => !DB_EXCLUDED_PROPERTIES.includes(p));
  if (dbOnlyNew.length) console.log(`  [excluded_properties DB] binding ${dbOnlyNew.length} DB row(s) not previously in the tool's blocklist: ${dbOnlyNew.join(', ')}`);
  console.log(`  [excluded_properties DB] ${toolOnlyLegacy.length} legacy tool-only exclusion(s) have no DB row yet (unreconciled, kept functioning) — see BLOCK_LEGACY's own comment.`);
}
// The MERGED, effective blocklist: every DB row is authoritative and always included; the
// legacy literal keeps functioning until each entry is individually reconciled (Step 10's own
// scope — see BLOCK_LEGACY's comment).
const BLOCK = new Set([...BLOCK_LEGACY, ...DB_EXCLUDED_PROPERTIES]);
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
  // v1.4.0 (2026-09-08): cap raised 80 -> 300. Nothing else in this file depends on the literal
  // 80 (grepped) -- it was just a bound on the anchor-key length, and the tight bound is what
  // caused a wrapper and its own first child (whose innerText necessarily SHARES the wrapper's
  // opening text) to collide on an identical truncated key even when their real, full text
  // differs. 300 is generous enough that this stops happening for ordinary paragraph-length
  // content while still keeping keys bounded.
  // Step 5 (measurement-integrity, 2026-09-09, D-3/M3): strip-then-trim, not trim-then-strip.
  // The old order trimmed BEFORE stripping the non-alphanumeric class, so text beginning with a
  // stripped character (the draft's literal "★★★★★ Excellent") had no leading WHITESPACE for
  // trim() to remove -- trim is a no-op on a leading star. Stripping the stars afterward then
  // exposed the space that sat between them and the real text as a phantom LEADING space,
  // which survived because nothing re-trimmed after the strip. Reordered: strip class first
  // (keeping the WS_RE-recognised whitespace variants -- NBSP/zero-width/BOM -- so they still
  // collapse to a real space rather than being silently deleted and merging two words), THEN
  // collapse whitespace, THEN trim. Both functions reordered together -- they must stay
  // consistent or the two key namespaces (norm vs normFull) desynchronise.
  // qc-council regression fix (2026-09-09): STRIP_RE preserved a literal space and the specific
  // unicode whitespace variants, but NOT \\s (which also covers newline/tab/CR/form-feed).
  // Browsers commonly insert a REAL newline character in .innerText at a block-level element
  // boundary (e.g. a <span> immediately followed by an <h2> — very common: a section-heading
  // label + its heading), and this runs BEFORE WS_RE now (Step 5's strip-then-trim reorder), so
  // that newline was silently DELETED rather than collapsed to a space — gluing "Our signature"
  // and "Zookies..." into "our signaturezookies" with no space, breaking the ancestor-anchor
  // match for every element under that heading. Verified live: two runs of the identical tool
  // against the identical clone content, one with the pre-phase code and one with this bug,
  // produced DIFFERENT key text at this exact boundary. Adding \\s restores the old behaviour
  // (newline collapses to a space) without reintroducing the star-glyph phantom-space bug
  // Step 5 was built to fix (verified: norm('★★★★★ Excellent') === norm('Excellent') still holds).
  const STRIP_RE = /[^a-z0-9 £\\s\\u00A0\\u200B\\uFEFF]/g;
  const norm = (t) => (t||'').toLowerCase().replace(STRIP_RE,'').replace(WS_RE,' ').trim().slice(0,300);
  const normFull = (t) => (t||'').toLowerCase().replace(STRIP_RE,'').replace(WS_RE,' ').trim();
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
  // v1.3.0 pseudo-element paint fallback (qc-council, 2026-09-08): SGS deliberately paints
  // backgrounds (sgs_block_background_layer_css) and gradient borders (sgs_border_gradient_css)
  // on a ::after/::before layer instead of the element itself, so the element's OWN
  // background/border reads as transparent/none by design. Previously the tool never looked at
  // a pseudo-element at all, so every block using this pattern false-flagged as "paint missing"
  // (measurement-vs-eye.md: "pseudo-elements" is part of the mandatory extended set). This is a
  // FALLBACK only — the pseudo value is used ONLY when the element's own value is a non-painting
  // default, so an element that genuinely paints nothing on either layer still reports as empty.
  const PSEUDO_PAINT_PROPS = ['background-color', 'background-image',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'];
  const isEmptyPaint = (p, v) => {
    if (v == null) return true;
    if (/-color$/.test(p)) return v === 'rgba(0, 0, 0, 0)' || v === 'transparent' || v === '';
    if (/-width$/.test(p)) return (parseFloat(v) || 0) === 0;
    if (/-style$/.test(p)) return !v || v === 'none';
    if (p === 'background-image') return !v || v === 'none';
    return false;
  };
  const mergePseudoPaint = (el, r) => {
    for (const pseudo of ['::after', '::before']) {
      let pcs; try { pcs = getComputedStyle(el, pseudo); } catch (e) { continue; }
      if (!pcs || !pcs.content || pcs.content === 'none') continue;  // pseudo generates no box
      for (const p of PSEUDO_PAINT_PROPS) {
        if (!isEmptyPaint(p, r[p])) continue;  // own element already paints this layer
        const pv = normVal(p, pcs.getPropertyValue(p));
        if (!isEmptyPaint(p, pv)) r[p] = pv;
      }
    }
  };
  // Step 9b (measurement-integrity, 2026-09-09): background-size/-position/-repeat and
  // border-image-slice are INERT on a replaced element (it paints via its own intrinsic
  // content, e.g. src) but LOAD-BEARING on a <div> — excluded PER ELEMENT TYPE here, never
  // via the global BLOCK set, which would silence every real defect on a non-replaced element
  // to remove noise in one place (KJC-2, settled).
  const REPLACED_TAGS = { IMG: 1, VIDEO: 1, IFRAME: 1, CANVAS: 1, EMBED: 1, OBJECT: 1 };
  const REPLACED_INERT_PROPS = new Set(['background-size', 'background-position', 'background-repeat', 'border-image-slice']);
  const readAll = (el) => { const cs = getComputedStyle(el), r = {};
    const isAlignfull = el.classList && el.classList.contains('alignfull');
    const isReplaced = !!REPLACED_TAGS[el.tagName];
    for (let i = 0; i < cs.length; i++) { const p = cs[i];
      if (p.charCodeAt(0) === 45 || BLOCK.has(p) || LOGICAL.test(p)) continue;  // vendor '-' + blocklist + logical dupes
      if (isAlignfull && ALIGNFULL_EXTRA_BLOCK.has(p)) continue;  // alignfull-scoped margin blocklist
      if (isReplaced && REPLACED_INERT_PROPS.has(p)) continue;  // per-element applicability (Step 9b)
      r[p] = normVal(p, cs.getPropertyValue(p)); }
    mergePseudoPaint(el, r);
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
  // v1.3.0 (qc-council, 2026-09-08): was 16 tags and silently omitted every other real HTML tag
  // (article/h6/footer/header/nav/figure/figcaption/table/form/input/label and more) — an
  // unmatched element of a missing tag always scored ZERO lost props regardless of severity
  // (meaningfulCountUnmatched's dDef[drec.tag] || {} fallback below), which is exactly how the
  // testimonial cards' real border loss contributed nothing to the score. List widened to cover
  // every tag SGS/WordPress markup plausibly emits; dDef.div is still the safety-net fallback
  // for anything genuinely novel, rather than trusting this list to be exhaustive forever.
  ['div','p','span','a','h1','h2','h3','h4','h5','h6','ul','ol','li','dl','dt','dd','blockquote',
   'section','article','header','footer','nav','main','aside','figure','figcaption','table',
   'thead','tbody','tr','td','th','form','fieldset','legend','label','input','textarea','select',
   'details','summary','time','address','picture','iframe','video','audio',
   'img','button','em','strong','b','i','small','mark'].forEach(t => {
    const e = document.createElement(t); if (t === 'img') e.alt = ''; hold.appendChild(e); defaults[t] = readAll(e); });
  document.body.removeChild(hold);

  const texts = [], images = [], links = [];
  const textElsRaw = {};
  const boxElsRaw = {};
  const mk = (el) => ({ tag: el.tagName.toLowerCase(), cls: clsList(el), css: readAll(el),
    declared: { fontSize: declaredValue(el, 'font-size'), lineHeight: declaredValue(el, 'line-height') },
    ...ctx(el) });
  // v1.3.0 collision resolution (Bean-directed design, 2026-09-08): a text collision (several
  // nested elements sharing identical normalised text — e.g. a wrapper <section> whose sole
  // child holds 100% of its text) used to always keep the DEEPEST element, silently discarding
  // whatever the OTHER candidate(s) actually painted. Proven live: a real border-top:1px on an
  // outer <section> vanished because the tool kept the borderless inner div instead.
  //
  // Fix, two tiers:
  // (1) BEM SAME-FAMILY MERGE — deterministic, no guessing. Every composite mirroring
  //     sgs/container (hero, trust-bar, cta-section, container itself, plus block-private
  //     composites like form/modal/post-grid) renders its content-band child as
  //     sgs-<own-block-name>__inner — e.g. sgs-container__inner, sgs-form__inner,
  //     sgs-modal__inner (Spec 00 §3.1's sgs-<block>__<element>--<modifier> convention). When a
  //     collision's candidates share the SAME BEM block token between an ancestor and a
  //     descendant, they are proven-by-construction to be the SAME component's own layers, not
  //     a genuine nested block (a deliberately nested block carries a DIFFERENT block token and
  //     is correctly left alone). Merge them PER-PROPERTY: each CSS property comes from
  //     whichever of the two elements' OWN value differs from THAT element's bare-tag default —
  //     so a border correctly comes from the ancestor and a flex layout correctly comes from the
  //     descendant, in one merged record. (Per-property, not a whole-element "which one is more
  //     styled" vote — a whole-element vote was tested and falsified: it's biased by how many
  //     CSS longhands a property FAMILY happens to expand into, not by visual importance.)
  // (2) STATISTICAL FALLBACK — when no BEM relationship is found, keep every candidate and let
  //     the comparison step (runTier, below) try the draft element against each one, keeping
  //     whichever pairing has the fewest mismatches, rather than committing to one blind
  //     structural rule for a collision shape nobody has proven a cause for.
  const SGS_BEM_RE = /^sgs-([a-z](?:[a-z0-9]|-(?!-))*)(?:__([a-z](?:[a-z0-9]|-(?!-))*))?(?:--([a-z][a-z0-9-]*))?$/;
  const parseSgsBem = (cls) => {
    if (typeof cls !== 'string' || !cls.startsWith('sgs-')) return null;
    const m = SGS_BEM_RE.exec(cls);
    return m ? { block: m[1], element: m[2] || null, modifier: m[3] || null } : null;
  };
  const blockTokensOf = (cand) => {
    const s = new Set();
    for (const c of (cand.rec.cls || [])) { const bem = parseSgsBem(c); if (bem) s.add(bem.block); }
    return s;
  };
  // v1.3.1 fix (same session): the first cut of this mechanism found only ONE pair via a
  // pairwise (i,j) scan and discarded every OTHER candidate in a 3+-element collision chain
  // outright — silently dropping the true outer box whenever the scan happened to match two
  // INNER candidates to each other first. Proven live: the featured product-card's real border
  // (on the outermost sgs-container+sgs-product-card wrapper) was lost this way because the
  // scan paired two of its DEEPER same-family descendants before ever reaching the outer one.
  // Fixed by finding the TRUE outermost candidate for this anchor first (the only reliable
  // starting point — nothing containing it shares this exact text, or it wouldn't be in this
  // anchor's candidate set at all), then collecting EVERY candidate that shares the outermost's
  // BEM block family, however deep — never just the first pair found.
  //
  // v1.3.2 fix (same session, caught by Bean asking whether the draft's own CSS was actually
  // checked): matching on the BLOCK token alone is too loose. norm()'s anchor key is truncated
  // to 80 chars (pre-existing), so a grid wrapper (e.g. sgs-gift-section__cards, both cards'
  // combined text) and its OWN FIRST REPEATED CHILD (sgs-gift-section__card, singular — a
  // completely different, unrelated box, not a layer) can share the same BLOCK token
  // ('gift-section') purely by English pluralisation, with neither literally being a wrapper's
  // "inner" content-band. Matching on block alone merged their properties into a synthetic
  // hybrid that no single draft element actually declares — proven live: reported "draft"
  // background/border/padding values that don't exist anywhere in the draft's own CSS for the
  // wrapper element, traced to exactly this false collision. The verified real pattern (grepped
  // across class-sgs-container-wrapper.php + every block's render.php) is always the SPECIFIC
  // element token inner — sgs-container__inner, sgs-form__inner, sgs-modal__inner,
  // sgs-post-grid__inner — never a same-block sibling/repeater relationship. Restricted to that.
  const familyClusterFor = (candidates) => {
    const outerCand = candidates.find(c => !candidates.some(o => o !== c && o.el !== c.el && o.el.contains(c.el)));
    if (!outerCand) return null;
    const outerBlocks = blockTokensOf(outerCand);
    if (!outerBlocks.size) return null;
    const isVerifiedInnerLayer = (cand) => (cand.rec.cls || []).some((cls) => {
      const bem = parseSgsBem(cls);
      return bem && bem.element === 'inner' && outerBlocks.has(bem.block);
    });
    const members = candidates.filter(c => c === outerCand || isVerifiedInnerLayer(c));
    if (members.length < 2) return null;
    // Outermost-first order (fewest OTHER members containing it), so the per-property merge
    // below checks the architecturally "most real" box first.
    return members.slice().sort((a, b) =>
      members.filter(m => m !== a && m.el !== a.el && m.el.contains(a.el)).length
      - members.filter(m => m !== b && m.el !== b.el && m.el.contains(b.el)).length);
  };
  const mergeFamilyBoxRecords = (membersOuterFirst) => {
    const base = membersOuterFirst[0].rec;
    const mergedCss = {};
    const allKeys = new Set();
    for (const m of membersOuterFirst) for (const k of Object.keys(m.rec.css)) allKeys.add(k);
    for (const k of allKeys) {
      let chosen;
      for (const m of membersOuterFirst) {
        const tagDef = defaults[m.rec.tag] || defaults.div || {};
        const v = m.rec.css[k];
        if (v !== undefined && tagDef[k] !== undefined && v !== tagDef[k]) { chosen = v; break; }  // first (outermost-first) member that meaningfully differs from ITS OWN default wins this property
      }
      if (chosen === undefined) {
        const fallback = membersOuterFirst.find(m => m.rec.css[k] !== undefined);
        chosen = fallback ? fallback.rec.css[k] : undefined;  // nobody differs from default — value is immaterial, keep any
      }
      mergedCss[k] = chosen;
    }
    return { ...base, css: mergedCss };
  };
  // v1.4.0 unified anchor-key mechanism (2026-09-08). Two previously-separate bugs share one
  // root cause: the anchor key was TEXT-ONLY, so it was either too SPARSE (an element with
  // short/no text — an icon button, a spacer, a badge count — got no key at all and was
  // structurally invisible to the whole comparison) or too COLLISION-PRONE (two DIFFERENT
  // elements whose first N chars of text happened to match got the SAME key — the proven
  // gift-section wrapper/child bug, only partly addressed by the BEM same-family merge above).
  // One mechanism now covers both: every key is TAG-prefixed (helps disambiguate a
  // same-truncated-prefix collision between two different tags, on top of the raised cap
  // above); and an element whose OWN text is too short to be a reliable key falls back to a
  // STRUCTURAL key — this element's tag + its position among same-tag siblings under its
  // parent, anchored to the nearest ANCESTOR that DOES have real (matchable) text — rather
  // than being dropped from the comparison entirely. The ancestor anchor is what makes this
  // safe to compare cross-document: raw DOM depth/position never matches between a draft page
  // and its WordPress clone, but an ancestor's visible TEXT does, and a faithfully-cloned
  // repeated structure (e.g. 4 trust-bar badge icons) preserves sibling order underneath it.
  // Step 7 (measurement-integrity, 2026-09-09, D-2/M2, qc-council-corrected): renamed from
  // siblingIndexAmongSameTag and made TAG-AGNOSTIC (counts position among ALL element
  // children, not just same-tag ones). A same-tag-scoped index still desynchronised on a real
  // tag substitution: if a draft sibling changes tag on the clone, every SURVIVING same-tag
  // sibling after it renumbers, so even a stripped-of-tag key string still diverged via its
  // index component (found live: Seat A's council report shows exactly this shape on
  // mamas-munches' testimonial cards, where a p->blockquote substitution shifts sibling
  // indices). A pure positional index is unaffected by any sibling's tag changing.
  const siblingIndexAmongSiblings = (el) => {
    if (!el.parentElement) return 0;
    let i = 0;
    for (const sib of el.parentElement.children) {
      if (sib === el) return i;
      i++;
    }
    return i;
  };
  // Step 8 (measurement-integrity, 2026-09-09, D-3/M1): a clone-injected screen-reader-only
  // element (e.g. sgs/option-picker's <legend class="sgs-sr-only">Pack size</legend>) is
  // visually hidden via a clip technique, so it has zero rendered area but its text STILL
  // appears in .innerText (which respects display:none/visibility:hidden but not the
  // clip-based sr-only pattern). Injected mid-string, it shifts the ancestor anchor's whole
  // 300-char window and poisons every descendant's structural key at once. Detected via
  // bounding-box area rather than a class-name list — universal across every sr-only
  // implementation (clip-rect, clip-path, 1px width/height), not just this project's own
  // ".sgs-sr-only" convention.
  const isVisuallyHidden = (el) => {
    // qc-council regression fix (2026-09-09): a display:contents element paints NO box of its
    // own (0x0 rect) while its children render fully and normally -- a mainstream modern-CSS
    // idiom for "this div groups semantically but shouldn't create a grid/flex item of its own".
    // The bounding-rect check alone can't tell "genuinely invisible" (sr-only) from "no box by
    // design, children fully visible" (display:contents), and ancestorVisibleInnerText removes
    // the WHOLE clone subtree keyed on this check -- so a display:contents wrapper's real,
    // visible children were being deleted from the ancestor-text comparison, producing a false
    // "element missing from the clone" report on a perfectly matching element. Verified live
    // through the real capture()->runTier() pipeline before this fix.
    if (getComputedStyle(el).display === 'contents') return false;
    const r = el.getBoundingClientRect();
    return r.width <= 1 && r.height <= 1;
  };
  const ancestorVisibleInnerText = (anc) => {
    const hiddenDescendants = [...anc.querySelectorAll('*')].filter(isVisuallyHidden);
    if (!hiddenDescendants.length) return anc.innerText;
    // Clone rather than mutate the live DOM, so the real page (and every other anchor read
    // during this same capture pass) is completely unaffected. Walk both trees in lockstep
    // (querySelectorAll('*') order is deterministic document order on an unmutated subtree) to
    // find each hidden node's counterpart in the clone and remove it there instead.
    const clone = anc.cloneNode(true);
    const realAll = [...anc.querySelectorAll('*')];
    const cloneAll = clone.querySelectorAll('*');
    for (const hidden of hiddenDescendants) {
      const idx = realAll.indexOf(hidden);
      const cloneNode = cloneAll[idx];
      if (cloneNode && cloneNode.parentNode) cloneNode.parentNode.removeChild(cloneNode);
    }
    clone.style.cssText = 'position:absolute;left:-99999px;top:0;';
    document.body.appendChild(clone);
    const text = clone.innerText;
    document.body.removeChild(clone);
    return text;
  };
  const nearestQualifyingAncestorAnchor = (el, minLen) => {
    for (let anc = el.parentElement; anc && anc.tagName !== 'BODY' && anc.tagName !== 'HTML'; anc = anc.parentElement) {
      if (inChrome(anc)) continue;
      const t = norm(ancestorVisibleInnerText(anc));
      if (t.length >= minLen) return t;
    }
    return null;
  };
  const structuralAnchor = (el, minLen) => {
    const ancestorText = nearestQualifyingAncestorAnchor(el, minLen);
    // Step 7: tag STRIPPED from the key (was 'struct|' + el.tagName + '|' + ...). A legitimate
    // Rule-1 tag substitution previously made the key un-findable, charging every meaningful
    // property as lost instead of a single tag divergence. Demoted to a tie-break inside
    // pairAllCandidates (KJC-1 decision B) rather than removed outright.
    return ancestorText == null ? null : ('struct|' + siblingIndexAmongSiblings(el) + '|' + ancestorText);
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('*').forEach((el) => {
    // Step 3 (measurement-integrity, 2026-09-09, D-3): SKIP_TAGS is keyed uppercase (SVG,
    // PATH) but was tested against raw el.tagName, which browsers report LOWERCASE for inline
    // SVG elements -- so the intended skip never fired for svg/path/circle/rect/polygon/etc.
    // Prefer namespaceURI over an expanded tag list: it covers every SVG descendant tag (not
    // just the two named in SKIP_TAGS) with one check, and is immune to any future SVG tag
    // this file doesn't yet enumerate.
    if (inChrome(el) || SKIP_TAGS[el.tagName] || el.namespaceURI === SVG_NS) return;
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
      // Step 7: tag STRIPPED from the text key (was anchorEl.tagName + '|' + dkey). Same
      // reasoning as structuralAnchor above -- a tag substitution must not make the element
      // unmatchable; pairAllCandidates re-disambiguates same-text-different-tag candidates
      // once they land in the same key's candidate array.
      const textKey = dkey;
      (textElsRaw[textKey] = textElsRaw[textKey] || []).push({ rec: mk(anchorEl), el: anchorEl });
    } else if (!isHtmlOrBody && el.childElementCount === 0) {
      // Short/empty direct text — structural fallback instead of dropping the element.
      // Step 4 (measurement-integrity, 2026-09-09, D-1/M6): gated on childElementCount===0.
      // An element WITH children and no real direct text of its own is already captured below
      // by the box tier (its own innerText, or ITS OWN structural fallback at minLen 5) — giving
      // it a SECOND structural entry here scored the exact same CSS diff twice (Seat A measured
      // 100% overlap between boxEls and textEls). An element with real direct text (>=4 chars,
      // the branch above) still gets both a text-tier AND a box-tier entry when it also has
      // children — that dual anchoring is deliberate (fuzzy content match + exact structural
      // match serve different purposes) and is unaffected by this gate.
      const structKey = structuralAnchor(el, 4);
      if (structKey) (textElsRaw[structKey] = textElsRaw[structKey] || []).push({ rec: mk(el), el });
    }
    if (!isHtmlOrBody && (el.childElementCount > 0 || el.tagName === 'IMG')) {
      if (el.tagName === 'IMG') {
        const anchor = 'img:' + imgIdentity(el);
        if (anchor.length >= 5) (boxElsRaw[anchor] = boxElsRaw[anchor] || []).push({ rec: mk(el), el });
      } else {
        const anchorText = norm(el.innerText);
        // Step 7: tag STRIPPED from the box anchor (was el.tagName + '|' + anchorText). Same
        // tag-tolerant-matching reasoning as the text-tier keys above.
        const anchor = anchorText.length >= 5
          ? anchorText
          : structuralAnchor(el, 5);
        if (anchor) (boxElsRaw[anchor] = boxElsRaw[anchor] || []).push({ rec: mk(el), el });
      }
    }
  });
  // Shared collapse for BOTH raw maps — a text-node collision can be BEM same-family related
  // exactly like a box collision (the deterministic merge doesn't care which map it came from),
  // and otherwise falls back to the same array-of-candidates + downstream bestPairing (runTier)
  // that boxEls already had. textEls previously had NEITHER — a duplicate dkey silently
  // overwrote nothing (first-write-wins via an ordinal #2/#3 slot keyed by DOM order, with
  // no correctness check at all), which is now closed.
  const collapseRaw = (raw) => {
    const out = {};
    for (const k of Object.keys(raw)) {
      const candidates = raw[k];
      if (candidates.length === 1) { out[k] = candidates[0].rec; continue; }
      const cluster = familyClusterFor(candidates);
      out[k] = cluster
        ? mergeFamilyBoxRecords(cluster)
        : candidates.map(c => c.rec);  // no known relationship — try-all-candidates downstream
    }
    return out;
  };
  const boxEls = collapseRaw(boxElsRaw);
  const textEls = collapseRaw(textElsRaw);
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

// Step 9a (measurement-integrity, 2026-09-09, D-4): collapse a longhand family to ONE scored
// unit, DERIVED from sgs-framework.db (R-31-1 — no hardcoded family literal). property_suffixes
// carries the shorthand row (BorderWidth -> border-width) alongside its longhand siblings
// (BorderTopWidth -> border-top-width, ...) side by side; modifier_suffixes' side vocabulary
// (Top/Right/Bottom/Left) is what generates the longhand names. A longhand's shorthand is
// derived by removing a known side/corner infix from its css_property string and checking
// whether the result is ANOTHER row's css_property — no family name is ever hand-typed here.
// Queried once at module load via Python's stdlib sqlite3 (read-only, matching the project's
// own DB-read convention) since no Node sqlite driver is a project dependency.
function deriveLonghandFamilies() {
  const dbPath = path.join(os.homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db').replace(/\\/g, '/');
  const pyScript = `import sqlite3, json\nconn = sqlite3.connect("file:${dbPath}?mode=ro", uri=True)\nrows = conn.execute("SELECT suffix, css_property FROM property_suffixes WHERE css_property IS NOT NULL").fetchall()\nprint(json.dumps(rows))`;
  let rows;
  try {
    const out = execFileSync('python', ['-c', pyScript], { encoding: 'utf8' });
    rows = JSON.parse(out);
  } catch (e) {
    console.error('\n⚠⚠⚠ LONGHAND-COLLAPSE DISABLED — could not query sgs-framework.db property_suffixes: ' + e.message + '\n');
    return null;
  }
  const cssProps = new Set(rows.map((r) => r[1]));
  // The side/corner NAMING GRAMMAR (a CSS-specification fact, not project data): a corner is a
  // vertical+horizontal compound of the side vocabulary itself, never a separate hand-typed list.
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const CORNERS = ['top', 'bottom'].flatMap((v) => ['left', 'right'].map((h) => `${v}-${h}`));
  const family = {};
  for (const cssProp of cssProps) {
    for (const infix of [...SIDES, ...CORNERS]) {
      // Middle-infix reduction: border-top-width -> border-width (side/corner sits between
      // two other segments). Trailing-infix reduction: margin-top -> margin (side is the last
      // segment, no third segment after it).
      const middle = cssProp.replace(`-${infix}-`, '-');
      const trailing = cssProp.replace(new RegExp(`-${infix}$`), '');
      const candidate = middle !== cssProp ? middle : (trailing !== cssProp ? trailing : null);
      if (candidate && cssProps.has(candidate)) { family[cssProp] = candidate; break; }
    }
  }
  // Documented DB gap (not special-cased into this file as a literal): border-{top,right,
  // bottom,left}-style have no per-side property_suffixes rows, so they cannot be derived
  // into the border-style family here and each still scores individually. Confirmed via
  // `SELECT suffix, css_property FROM property_suffixes WHERE css_property LIKE '%border%
  // style%'` returning only the bare "BorderStyle" -> "border-style" shorthand row.
  return family;
}
const LONGHAND_FAMILIES = deriveLonghandFamilies();
// Step 11 (measurement-integrity, 2026-09-09): LAYOUT vs PAINT+TYPE property classification.
// Plain-English definition (written before coding, per the phase plan): LAYOUT is display,
// grid/flex, gap, alignment, box spacing (padding/margin/border-width), and geometry (aspect-
// ratio, box-sizing, overflow); PAINT+TYPE is colour, background, border style/colour/radius,
// font-*, line-height, and text-*. The exact boundary is a judgement call (KJC-style — the
// plan's own note: "the aggregate is the defect, even if the bucket boundaries need another
// pass"); what matters is that a STRUCTURE miss can never again be silently re-charged as N
// LAYOUT/PAINT misses.
const LAYOUT_PROP_RE = /^(display|align-items|align-self|align-content|justify-items|justify-self|justify-content|place-items|place-content|flex-direction|flex-wrap|flex-flow|overflow(-x|-y|-block|-inline)?|grid-template-(columns|rows|areas)|grid-auto-(columns|rows|flow)|grid-column|grid-row|gap|row-gap|column-gap|aspect-ratio|box-sizing|float|clear|visibility|padding(-top|-right|-bottom|-left)?|margin(-top|-right|-bottom|-left)?|border-(top|right|bottom|left)-width|border-width)$/;
function classifyPropertyBucket(prop) {
  return LAYOUT_PROP_RE.test(prop) ? 'layout' : 'paint_type';
}
function collapseLonghandFamilies(scored) {
  const groups = new Map();
  for (const s of scored) {
    const key = (LONGHAND_FAMILIES && LONGHAND_FAMILIES[s.prop]) || s.prop;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  // Step 9c (measurement-integrity, 2026-09-09): `passes` names the representative prop for
  // every FULLY-MATCHING family/prop unit, so the artefact can record PASSES as well as
  // mismatches — today it records only mismatches, so a future session auditing the score has
  // no way to confirm pass+fail sums to the reported denominator without re-running the tool.
  let total = 0, match = 0; const diffs = [], passes = [];
  for (const members of groups.values()) {
    total++;
    const failing = members.filter((m) => !m.isMatch);
    if (!failing.length) { match++; passes.push(members[0].prop); continue; }
    // qc-council regression fix (2026-09-09): push EVERY failing member's diff, not just the
    // first. The count is still collapsed to ONE unit (total++ above fires once per family,
    // regardless of how many members fail) — only the COUNT multiplying per longhand is what
    // this collapse exists to stop. Pushing only failing[0] silently discarded any SECOND,
    // independently-caused defect in the same family (e.g. top-border broken for one reason,
    // left-border broken for an unrelated one) — proven live: a fixture with two genuinely
    // unrelated border-width diffs reported only one of them, with the other invisible even in
    // the raw JSON, not merely uncounted. `failing` was never actually exposed on the returned
    // object either, contradicting this comment's own prior claim that "the developer detail is
    // still visible via failing".
    for (const f of failing) diffs.push(f.diff);
  }
  return { total, match, diffs, passes };
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
  // v1.3.0: fall back to the div defaults rather than {} for a tag not in the census list — an
  // empty ddef makes EVERY prop read as "no default to compare against", so an unmatched element
  // of a missing tag always scored 0 lost props no matter how much it actually lost (confirmed:
  // the 3 unmatched testimonial <article> cards' real border loss contributed nothing to the
  // score). div is the safest generic fallback (block-level, no special initial values).
  const ddef = dDef[drec.tag] || dDef.div || {};
  let n = 0;
  for (const p of Object.keys(drec.css)) {
    if (ddef[p] !== undefined && drec.css[p] !== ddef[p]) n++;
  }
  return n;
}

function comparePair(drec, crec, dDef, viewportPx) {
  let declined = 0; const sub = [], fluid = [];
  // Step 9a: every meaningfully-scored prop is collected here first (match or diff), THEN
  // collapsed by longhand family in one pass at the end — collapsing must apply to PASSES as
  // well as failures (a family with 3 matching sides + 1 real diff is still ONE unit, scored
  // as a miss), which is why this can't be a running total++/match++ as props are visited.
  const scored = [];
  const ddef = dDef[drec.tag] || dDef.div || {};  // v1.3.0: same fallback as meaningfulCountUnmatched
  // Computed ONCE per pair (not per-prop) so the line-height branch below can require it.
  // `fsResult` = {equivalent, declined, predictedPx} — see fluidEquivalentFontSize's docblock.
  const fsResult = fluidEquivalentFontSize(drec, crec, viewportPx);
  for (const p of Object.keys(drec.css)) {
    const dv = drec.css[p], cv = crec.css[p];
    if (cv === undefined) continue;
    const meaningful = (dv !== cv) || (ddef[p] !== undefined && dv !== ddef[p]);
    if (!meaningful) continue;
    if (propMatches(p, dv, cv)) { scored.push({ prop: p, isMatch: true }); continue; }
    // FLUID-EQUIVALENCE (v1.2.0-fluid, 2026-08-04, source-verified per post-review rewrite): a
    // genuine PASS — counts toward match/total like any other pass — but recorded in its OWN
    // bucket so it stays visible rather than being silently absorbed into `match`. DECLINED
    // (evidence insufficient to verify either way) is counted separately and falls through to
    // the ordinary real-miss path below — never silently dropped, never guessed into a pass.
    if (p === 'font-size') {
      if (fsResult.equivalent) { scored.push({ prop: p, isMatch: true }); fluid.push({ prop: p, draft: dv, clone: cv, basis: 'wp-fluid-clamp-source-verified' }); continue; }
      if (fsResult.declined) declined++;
    }
    if (p === 'line-height') {
      const lhResult = lineHeightIsMechanicalConsequence(drec, crec, fsResult);
      if (lhResult.equivalent) { scored.push({ prop: p, isMatch: true }); fluid.push({ prop: p, draft: dv, clone: cv, basis: 'unitless-multiplier-source-verified' }); continue; }
      if (lhResult.declined) declined++;
    }
    const bucket = subVisibleBucket(p, dv, cv, drec, crec);
    if (bucket) { sub.push({ prop: p, draft: dv, clone: cv, bucket }); continue; }  // unscored
    scored.push({ prop: p, isMatch: false, diff: { prop: p, draft: dv, clone: cv } });
  }
  const { total, match, diffs, passes } = collapseLonghandFamilies(scored);
  return { total, match, diffs, passes, sub, fluid, declined };
}

// ── runTier/bestPairing: the tier-scoring loop, extracted from main() (Step 2a, measurement-
// integrity phase 2026-09-09) so --self-test can reach the pairing machinery, the T/M
// accumulators, and the unmatched-charging path directly, instead of calling capture()+
// comparePair() alone and never reaching this code at all. ZERO behaviour change from the
// version formerly inlined in main() as two closures — proven by a byte-identical live re-run
// (see reports/parity-baseline/2026-09-09-pre-fix.json).
// Step 7 (measurement-integrity, 2026-09-09, D-2/M2, qc-council-corrected): replaces the
// single-best-pair bestPairing(). Once tag is stripped from the three key-construction sites
// above, a same-text-different-tag OR same-text-same-tag-repeated-instance collision can put
// 2+ candidates on BOTH the draft and clone side under one key — proven live on mamas-munches
// (a product-card's wrapper <div>, body <div> and <img> all anchor to the same ancestor text
// at "index 0 of their own tag"; council rater-structural traced this to Seat A's report
// entries 3/5/11/12). The old bestPairing() could only ever resolve ONE pair, silently losing
// the rest.
//
// A two-rater qc-council caught two defects in the design that would have shipped otherwise:
//   1. A same-tag-scoped sibling index still desynchronises the key across a real tag
//      substitution (renumbers every SURVIVING same-tag sibling after the substituted one) —
//      closed by making structuralAnchor's index tag-agnostic (siblingIndexAmongSiblings).
//   2. Pairing candidates by FEWEST DIFFS is unsafe: two same-tag candidates whose values got
//      swapped between them (a real defect — e.g. the wrapper's border leaked onto the body
//      instead) would greedily cross-pair to whichever combination scores fewer diffs, scoring
//      the swap as a PASS. That is the single most dangerous failure direction for a
//      measurement tool (a false-GOOD; see the phase plan's own Step 7 comment on this exact
//      risk). Fixed by pairing candidates in DOCUMENT ORDER instead — a decision made with
//      zero reference to the CSS being measured, so a defect can never steer which elements
//      get compared to which.
//
// Returns { pairs: [{drec,crec,r}, ...], unmatchedDraft: [...] }. Two passes:
//   Pass 1 (same-tag priority): partition both pools by tag; for each tag present on BOTH
//   sides, zip candidates in document order (the order they were collected in, which IS
//   document order for both the draft and clone captures) up to min(group lengths).
//   Pass 2 (cross-tag fallback — the genuine Rule-1 substitution case): whatever remains after
//   pass 1 (a tag had no counterpart on the other side) is zipped in document order across the
//   whole remaining pool, regardless of tag.
// Any draft candidates still unmatched after both passes (draft pool bigger than clone pool)
// are returned in unmatchedDraft for the caller to charge as lost.
function pairAllCandidates(draftCands, cloneCands, dDef, viewportPx) {
  const dPool = draftCands.slice();
  const cPool = cloneCands.slice();
  const pairs = [];
  const zipAndRemove = (dGroup, cGroup) => {
    const n = Math.min(dGroup.length, cGroup.length);
    for (let i = 0; i < n; i++) {
      const dc = dGroup[i], cc = cGroup[i];
      pairs.push({ drec: dc, crec: cc, r: comparePair(dc, cc, dDef, viewportPx) });
      dPool.splice(dPool.indexOf(dc), 1);
      cPool.splice(cPool.indexOf(cc), 1);
    }
  };
  const tags = new Set(dPool.map((d) => d.tag));
  for (const tag of tags) {
    const dGroup = dPool.filter((d) => d.tag === tag);
    const cGroup = cPool.filter((c) => c.tag === tag);
    if (dGroup.length && cGroup.length) zipAndRemove(dGroup, cGroup);
  }
  if (dPool.length && cPool.length) zipAndRemove(dPool.slice(), cPool.slice());
  return { pairs, unmatchedDraft: dPool };
}
function runTier(map, cloneMap, exact, dDef, viewportPx) {
  let T = 0, M = 0, tagT = 0, tagM = 0, unmT = 0, fluidDeclined = 0;
  // Step 9c: per-property PASS records, threaded alongside the existing mismatch records so
  // the artefact can report pass counts too (see collapseLonghandFamilies's `passes`).
  const mis = [], unm = [], subv = [], tagMis = [], fluidv = [], pairings = [], passv = [];
  // FR-20-4 (2026-08-04) + Step 7 correction (2026-09-09, qc-council): charges EVERY draft
  // candidate in the list, not just the first — the pre-existing bug this closes. A draft-side
  // collision with no clone counterpart used to charge only draftCands[0], silently dropping
  // any sibling candidate's lost props (rater-codepath flagged this before it shipped).
  const chargeUnmatched = (drecList, key) => {
    for (const drec0 of drecList) {
      const lost = meaningfulCountUnmatched(drec0, dDef);
      unm.push({ text: key.slice(0, 44), tag: drec0.tag, meaningful_props_lost: lost });
      T += lost; unmT += lost;
      tagT++;
    }
  };
  for (const [key, drecRaw] of Object.entries(map)) {
    if (excluded(key)) continue;
    const draftCands = Array.isArray(drecRaw) ? drecRaw : [drecRaw];
    const crecRaw = findByAnchor(key, cloneMap, exact);
    if (!crecRaw) {
      // The draft element(s) have NO clone counterpart at all — MISSING from the clone.
      chargeUnmatched(draftCands, key);
      continue;
    }
    const cloneCands = Array.isArray(crecRaw) ? crecRaw : [crecRaw];
    const { pairs, unmatchedDraft } = pairAllCandidates(draftCands, cloneCands, dDef, viewportPx);
    for (const { drec, crec, r } of pairs) {
      // TAG dimension (FR-20-9) — scored SEPARATELY from CSS; reported, never auto-failed.
      tagT++;
      if (drec.tag === crec.tag) tagM++;
      else tagMis.push({ text: key.slice(0, 40), draft_tag: drec.tag, clone_tag: crec.tag });
      // CSS dimension.
      T += r.total; M += r.match; fluidDeclined += r.declined;
      if (r.diffs.length) mis.push({
        text: key.slice(0, 46), tag: drec.tag, diffs: r.diffs,
        // FR-20-10: class context ONLY — never scored, present for human/debug audit.
        classes: { draft: drec.cls || [], clone: crec.cls || [] },
      });
      if (r.sub.length) subv.push({ text: key.slice(0, 46), tag: drec.tag, sub: r.sub });
      if (r.fluid.length) fluidv.push({ text: key.slice(0, 46), tag: drec.tag, fluid: r.fluid });
      if (r.passes.length) passv.push({ text: key.slice(0, 46), tag: drec.tag, passes: r.passes });
      // pairings: which draft record paired with which clone record (Step 2 fixture 6 needs this).
      pairings.push({ key, drec, crec });
    }
    // A draft candidate that shared this key but found no clone counterpart even after both
    // pairing passes (unequal candidate counts) is charged the same as a fully-unmatched
    // element — never silently dropped.
    if (unmatchedDraft.length) chargeUnmatched(unmatchedDraft, key);
  }
  return { T, M, tagT, tagM, unmT, fluidDeclined, mis, unm, subv, tagMis, fluidv, passv, pairings };
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
  // v1.4.0: textEls keys are now tag-prefixed ('P|...') rather than the bare text, and a
  // fixture's own <p> may resolve to an array on an unresolved collision — go through the same
  // findByAnchor() lookup + array-normalisation runTier() itself uses, rather than a direct
  // bracket lookup by the bare literal text (which no longer exists as a key).
  const findText = (map, text) => {
    const found = findByAnchor(text, map, false);
    return Array.isArray(found) ? found[0] : found;
  };
  let failures = 0;
  const check = (label, cond, detail) => {
    console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
    if (!cond) failures++;
  };

  // --- Test 1: POSITIVE (fluid-equivalent font-size + line-height) ---
  {
    const d = await capture(page, toURL(draftPath), VW);
    const c = await capture(page, toURL(goodClonePath), VW);
    const drec = findText(d.textEls, TEXT), crec = findText(c.textEls, TEXT);
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
    const drec = findText(d.textEls, TEXT), crec = findText(c.textEls, TEXT);
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
    const drec = findText(d.textEls, TEXT), crec = findText(c.textEls, TEXT);
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
    const drec = findText(d.textEls, TEXT2), crec = findText(c.textEls, TEXT2);
    check('misattribution fixture: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const fsMiss = r.diffs.some((x) => x.prop === 'font-size');
    const fsFluid = r.fluid.some((x) => x.prop === 'font-size');
    check('misattribution regression: 20px->17px (old code\'s exact false-pass case) IS a real scored miss', fsMiss, `draft=${drec.css['font-size']} clone=${crec.css['font-size']}`);
    check('misattribution regression: NOT granted fluid-equivalence (no clamp() in the clone\'s source)', !fsFluid);
    check('misattribution regression: declined (evidence insufficient), never guessed via preset identity', r.declined >= 1);
  }

  // ── Measurement-integrity phase fixtures (2026-09-09) ─────────────────────────────────────
  // Seven controls per .claude/reports/2026-09-09-council-seat-c-measurement.md §4. Fixtures
  // 1-5 and 7 MUST FAIL today (each proves a real, currently-unfixed ruler defect); fixture 6
  // MUST PASS today (the current tag-embedded key already prevents the collision it tests —
  // see KJC-1 in the phase plan for why this is the correct pre-Step-7 state, not a gap).
  const writeHtml = (name, bodyHtml) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, `<!DOCTYPE html><html><body>${bodyHtml}</body></html>`);
    return p;
  };

  // --- Fixture 1: BLOCKLIST — a DB-excluded property (overflow-x) must not be scored ---
  // (D-3/§5: overflow-x is one of 5 excluded_properties DB rows absent from the tool's
  // hardcoded BLOCK set. Bound to the DB at Step 10; today nothing excludes it.)
  {
    const TEXT_F1 = 'overflow x blocklist gap test unique wording here';
    const f1Draft = writeHtml('f1-draft.html', `<div style="overflow-x:hidden;">${TEXT_F1}</div>`);
    const f1Clone = writeHtml('f1-clone.html', `<div style="overflow-x:visible;">${TEXT_F1}</div>`);
    const d = await capture(page, toURL(f1Draft), VW);
    const c = await capture(page, toURL(f1Clone), VW);
    const drec = findText(d.textEls, TEXT_F1), crec = findText(c.textEls, TEXT_F1);
    check('fixture 1 setup: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    check('fixture 1 (blocklist): overflow-x is DB-excluded and must not be scored', !r.diffs.some((x) => x.prop === 'overflow-x'), `diffs=${JSON.stringify(r.diffs.map((x) => x.prop))}`);
  }

  // --- Fixture 2: TAG-TOLERANT MATCHING — draft <button> must pair with clone <label> ---
  // (D-2/Step 7: the anchor key embeds the tag, so a legitimate tag substitution makes the
  // element unmatchable and charges every property as lost instead of a tag divergence.)
  {
    const TEXT_F2 = 'pick your pack size right here friend today';
    const f2Draft = writeHtml('f2-draft.html', `<button>${TEXT_F2}</button>`);
    const f2Clone = writeHtml('f2-clone.html', `<label>${TEXT_F2}</label>`);
    const d = await capture(page, toURL(f2Draft), VW);
    const c = await capture(page, toURL(f2Clone), VW);
    const r = runTier(d.textEls, c.textEls, false, d.defaults, VW);
    check('fixture 2 (tag-tolerant matching): draft <button> pairs with clone <label>, not charged as unmatched', r.unm.length === 0, `unm=${JSON.stringify(r.unm)}`);
  }

  // --- Fixture 3: DEDUPE — a container with children + short direct text is scored ONCE ---
  // (D-1/M6/Step 4: an element enters BOTH textElsRaw [structural fallback] and boxElsRaw
  // [childElementCount>0], so a single authored diff is charged in both tiers. Uses
  // border-top-width [non-inherited, so the child <p> cannot independently pick up the same
  // diff via inheritance] and a <p> child rather than <span> [deliberately NOT in the
  // INLINE_WRAP hoist set, so the div's own direct text stays empty and enters textElsRaw via
  // ONLY the structural fallback — isolating this to exactly D-1's two-tier duplication rather
  // than also exercising the separate inline-wrapper-hoist mechanism]. border-top-style is held
  // IDENTICAL on both sides so only border-top-width differs.)
  {
    const TEXT_F3 = 'this is the visible child text for dedupe test';
    const f3Draft = writeHtml('f3-draft.html', `<section><div style="border-top-style:solid;border-top-width:2px;"><p>${TEXT_F3}</p></div></section>`);
    const f3Clone = writeHtml('f3-clone.html', `<section><div style="border-top-style:solid;border-top-width:4px;"><p>${TEXT_F3}</p></div></section>`);
    const d = await capture(page, toURL(f3Draft), VW);
    const c = await capture(page, toURL(f3Clone), VW);
    const textR = runTier(d.textEls, c.textEls, false, d.defaults, VW);
    const boxR = runTier(d.boxEls, c.boxEls, true, d.defaults, VW);
    const allBorderWidthDiffs = [...textR.mis, ...boxR.mis].flatMap((m) => m.diffs.filter((x) => x.prop === 'border-top-width'));
    check('fixture 3 (dedupe): one authored border-top-width diff scores exactly once, not once per tier', allBorderWidthDiffs.length === 1, `found ${allBorderWidthDiffs.length} occurrence(s)`);
  }

  // --- Fixture 3b: BLOCK-BOUNDARY WHITESPACE — norm() must not glue adjacent block-level
  // elements' text together (qc-council regression, 2026-09-09). A <span> immediately followed
  // by an <h2> is a common real pattern (a section-heading label + its heading); the browser's
  // own .innerText inserts a real newline at that boundary. STRIP_RE ran BEFORE WS_RE (Step 5's
  // reorder) and didn't preserve \s, so that newline was silently DELETED rather than collapsed
  // to a space -- verified live this glued "our signature" + "zookies..." into
  // "our signaturezookies" (no space) on the real mamas-munches site, breaking the ancestor
  // anchor for every element under that heading.
  {
    const f3bMarkup = `<section><span>Our signature</span><h2>Zookies unique wording control text</h2></section>`;
    const f3bPage = writeHtml('f3b.html', f3bMarkup);
    const d3b = await capture(page, toURL(f3bPage), VW);
    const sectionKey = Object.keys(d3b.boxEls).find((k) => k.includes('zookies'));
    check('fixture 3b (block-boundary whitespace): adjacent <span>+<h2> text keeps a space at the boundary, not glued', !!sectionKey && sectionKey.includes('signature zookies'), `key=${JSON.stringify(sectionKey)}`);
  }

  // --- Fixture 4: SVG SKIP — inline SVG and its children must never be captured ---
  // (D-3/Step 3: SKIP_TAGS is keyed uppercase but tested against raw el.tagName, which is
  // lowercase for inline SVG, so the skip never fires.)
  {
    const TEXT_F4 = 'svg skip test with unique wording present here';
    const svgMarkup = `<div><span>${TEXT_F4}</span><svg width="24" height="24"><path d="M3 12L12 3L21 12" stroke="red"></path></svg></div>`;
    const f4Draft = writeHtml('f4-draft.html', svgMarkup);
    const d = await capture(page, toURL(f4Draft), VW);
    const allRecs = [...Object.values(d.textEls), ...Object.values(d.boxEls)].flatMap((r) => (Array.isArray(r) ? r : [r]));
    const hasSvgTag = allRecs.some((r) => r.tag === 'svg' || r.tag === 'path');
    check('fixture 4 (SVG skip): no svg/path record captured despite lowercase inline-SVG tagName', !hasSvgTag, `tags=${JSON.stringify(allRecs.map((r) => r.tag))}`);
  }

  // --- Fixture 4b: display:contents WRAPPER — a genuinely visible element must not be reported
  // missing (qc-council regression, 2026-09-09). A `display:contents` div has a 0x0 box while
  // its children render fully -- a mainstream layout idiom (SGS wrappers never use it, so a
  // draft using it for a grid child hits this asymmetry against its clone). isVisuallyHidden
  // used to fire on the contents-wrapper's own zero-area rect, and ancestorVisibleInnerText then
  // deleted its ENTIRE subtree (including the genuinely visible child) from the ancestor text,
  // breaking the structural-anchor match for an unrelated trailing sibling.
  {
    const f4bMarkup = (wrapperStyle) => `<section><span>lead in</span><div style="${wrapperStyle}"><p>a real visible child paragraph unique wording xyz</p></div><b style="color:rgb(10,10,10)">Zz</b></section>`;
    const f4bDraft = writeHtml('f4b-draft.html', f4bMarkup('display:contents;'));
    const f4bClone = writeHtml('f4b-clone.html', f4bMarkup(''));
    const d4b = await capture(page, toURL(f4bDraft), VW);
    const c4b = await capture(page, toURL(f4bClone), VW);
    const r4b = runTier(d4b.textEls, c4b.textEls, false, d4b.defaults, VW);
    const bMatched = r4b.pairings.some((p) => p.drec.tag === 'b') || !r4b.unm.some((u) => u.tag === 'b');
    check('fixture 4b (display:contents): a byte-identical trailing sibling is not falsely reported missing', bMatched, `unm=${JSON.stringify(r4b.unm)}`);
  }

  // --- Fixture 5: LONGHAND COLLAPSE — one authored border-width diff counts as ONE, not four ---
  // (D-4/Step 9a: border-{top,right,bottom,left}-width are 4 separate computed longhands with
  // no collapse mechanism; border-*-color is already blocklisted separately. Varies ONLY
  // border-width [border-style held identical] so this isolates the DB-DERIVABLE width family
  // cleanly -- border-*-style has NO per-side property_suffixes rows [a documented DB gap, not
  // hand-patched here] and would still score 4 separate diffs if varied in the same fixture.)
  {
    const TEXT_F5 = 'longhand collapse test unique wording here now';
    const f5Draft = writeHtml('f5-draft.html', `<p style="border-style:solid;border-width:1px;">${TEXT_F5}</p>`);
    const f5Clone = writeHtml('f5-clone.html', `<p style="border-style:solid;border-width:3px;">${TEXT_F5}</p>`);
    const d = await capture(page, toURL(f5Draft), VW);
    const c = await capture(page, toURL(f5Clone), VW);
    const drec = findText(d.textEls, TEXT_F5), crec = findText(c.textEls, TEXT_F5);
    check('fixture 5 setup: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const borderDiffs = r.diffs.filter((x) => x.prop.startsWith('border'));
    // qc-council regression fix (2026-09-09): assert the SCORE collapses to one FAILING unit
    // (r.total - r.match === 1) -- border-*-style is non-default on the draft (matches the
    // clone, but still meaningful vs the div-default of 'none'), so it also scores as 4 PASSING
    // units (no DB-derivable style family exists, a documented gap); r.total alone therefore
    // isn't 1, but the failing share must still be exactly one unit -- while the raw diffs array
    // still names EVERY failing longhand for transparency (4, one per side).
    // collapseLonghandFamilies used to report only failing[0], silently discarding a second,
    // independently-caused defect in the same family. Asserting diffs.length===1 (the old
    // assertion) would have PASSED for that bug too, since it can't tell "collapsed the count"
    // from "hid the detail".
    check('fixture 5 (longhand collapse): one authored border-width difference scores as exactly ONE failing unit', (r.total - r.match) === 1, `total=${r.total} match=${r.match}`);
    check('fixture 5 (longhand collapse): every failing longhand is still individually visible, not just the first', borderDiffs.length === 4, `found ${borderDiffs.length}: ${JSON.stringify(borderDiffs.map((x) => x.prop))}`);
  }

  // --- Fixture 5b: TWO INDEPENDENT failures in one family must BOTH survive (qc-council
  // regression, 2026-09-09) --- collapseLonghandFamilies used to report only failing[0].diff,
  // so a SECOND longhand failing for a completely unrelated reason (not the same authored
  // declaration) vanished from the artefact entirely -- not merely uncounted, actually absent
  // from diffs[]. border-style is held identical so this isolates the width family from the
  // (documented, DB-gap) style family.
  {
    const TEXT_F5B = 'independent longhand failures regression control text';
    const f5bDraft = writeHtml('f5b-draft.html', `<p style="border-style:solid;border-top-width:2px;border-left-width:3px;">${TEXT_F5B}</p>`);
    const f5bClone = writeHtml('f5b-clone.html', `<p style="border-style:solid;border-top-width:6px;border-left-width:9px;">${TEXT_F5B}</p>`);
    const d = await capture(page, toURL(f5bDraft), VW);
    const c = await capture(page, toURL(f5bClone), VW);
    const drec = findText(d.textEls, TEXT_F5B), crec = findText(c.textEls, TEXT_F5B);
    check('fixture 5b setup: both elements captured', !!drec && !!crec);
    const r = comparePair(drec, crec, d.defaults, VW);
    const props = r.diffs.map((x) => x.prop);
    check('fixture 5b (independent-failures regression): border-top-width diff survives', props.includes('border-top-width'), `diffs=${JSON.stringify(props)}`);
    check('fixture 5b (independent-failures regression): border-left-width diff ALSO survives (not silently dropped)', props.includes('border-left-width'), `diffs=${JSON.stringify(props)}`);
  }

  // --- Fixture 6: TIE-BREAK CONTROL — same text, different tags, must pair by tag ---
  // (KJC-1: today the tag-embedded key already separates these into distinct map entries, so
  // this MUST PASS today. After Step 7 strips tag from the key, this same assertion must be
  // re-verified against the NEW same-tag tie-break inside bestPairing — see Step 7's QA gate.)
  {
    const TEXT_F6 = 'tag collision guard element one two three four five';
    const f6Draft = writeHtml('f6-draft.html',
      `<div style="color: rgb(10, 10, 10);">${TEXT_F6}</div><article style="color: rgb(20, 20, 20);">${TEXT_F6}</article>`);
    const f6Clone = writeHtml('f6-clone.html',
      `<div style="color: rgb(30, 30, 30);">${TEXT_F6}</div><article style="color: rgb(40, 40, 40);">${TEXT_F6}</article>`);
    const d = await capture(page, toURL(f6Draft), VW);
    const c = await capture(page, toURL(f6Clone), VW);
    const r = runTier(d.textEls, c.textEls, false, d.defaults, VW);
    const divPair = r.pairings.find((p) => p.drec.tag === 'div');
    const articlePair = r.pairings.find((p) => p.drec.tag === 'article');
    check('fixture 6 (tie-break control): draft <div> pairs with clone <div>, not clone <article>', !!divPair && divPair.crec.tag === 'div');
    check('fixture 6 (tie-break control): draft <article> pairs with clone <article>, not clone <div>', !!articlePair && articlePair.crec.tag === 'article');
  }

  // --- Fixture 6b: FALSE-GOOD REGRESSION CONTROL — same-tag candidates must pair by DOCUMENT
  // ORDER, never by fewest-diffs. (qc-council rater-structural, 2026-09-09: a fewest-diffs
  // pairing tie-break would greedily cross-wire two same-tag elements whose values got SWAPPED
  // between them, scoring a real defect as a pass — the single most dangerous failure
  // direction for a measurement tool. Two draft <div>s share IDENTICAL text and collide under
  // one key; their clone counterparts hold the SAME two values but SWAPPED. Document-order
  // pairing must report 2 real diffs; a fewest-diffs pairing would report 0.)
  {
    const TEXT_F6B = 'swap detection guard element text unique here';
    const f6bDraft = writeHtml('f6b-draft.html',
      `<section>guard context<div style="letter-spacing:2px;">${TEXT_F6B}</div><div style="letter-spacing:6px;">${TEXT_F6B}</div></section>`);
    const f6bClone = writeHtml('f6b-clone.html',
      `<section>guard context<div style="letter-spacing:6px;">${TEXT_F6B}</div><div style="letter-spacing:2px;">${TEXT_F6B}</div></section>`);
    const d = await capture(page, toURL(f6bDraft), VW);
    const c = await capture(page, toURL(f6bClone), VW);
    const r = runTier(d.textEls, c.textEls, false, d.defaults, VW);
    const letterSpacingDiffs = r.mis.flatMap((m) => m.diffs.filter((x) => x.prop === 'letter-spacing'));
    check('fixture 6b (false-good regression control): a real value swap between two same-tag siblings reports 2 diffs, not 0 (document-order pairing, not fewest-diffs)', letterSpacingDiffs.length === 2, `found ${letterSpacingDiffs.length}`);
  }

  // --- Fixture 7: OVER-EXCLUSION CONTROL — background-size scores on <div>, not on <img> ---
  // (Step 9b: background-size/-position/-repeat + border-image-slice are inert on a replaced
  // element but load-bearing on a <div> — exclusion must be per element type, never global.)
  {
    const TEXT_F7 = 'background size div scoring test unique text here';
    const f7Draft = writeHtml('f7-draft.html',
      `<div style="background-size:auto;">${TEXT_F7}</div><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" style="background-size:auto;" alt="bgimg">`);
    const f7Clone = writeHtml('f7-clone.html',
      `<div style="background-size:cover;">${TEXT_F7}</div><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" style="background-size:cover;" alt="bgimg">`);
    const d = await capture(page, toURL(f7Draft), VW);
    const c = await capture(page, toURL(f7Clone), VW);
    const divD = findText(d.textEls, TEXT_F7), divC = findText(c.textEls, TEXT_F7);
    const rDiv = comparePair(divD, divC, d.defaults, VW);
    check('fixture 7 (over-exclusion control): background-size DIFFERS and SCORES on a <div>', rDiv.diffs.some((x) => x.prop === 'background-size'));
    const imgD = d.boxEls['img:bgimg'], imgC = c.boxEls['img:bgimg'];
    check('fixture 7 setup: img elements captured', !!imgD && !!imgC);
    const rImg = comparePair(imgD, imgC, d.defaults, VW);
    check('fixture 7 (over-exclusion control): background-size on <img> must NOT score (per-element applicability)', !rImg.diffs.some((x) => x.prop === 'background-size'), `diffs=${JSON.stringify(rImg.diffs.map((x) => x.prop))}`);
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
  // Step 11: overall (all-viewports) accumulators for the four-dimension model.
  let gContentMatched = 0, gContentTotal = 0, gLayoutPass = 0, gLayoutFail = 0, gPaintPass = 0, gPaintFail = 0, gUnm = 0;

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
    // v1.3.0: a `boxEls` value may now be a SINGLE record (the common case, and always true for
    // textEls) or an ARRAY of candidates (an unresolved text collision with no known BEM-family
    // relationship — see the CAPTURE_SRC collision-resolution comment). runTier()/bestPairing()
    // try every draft candidate against every clone candidate and keep whichever pairing has the
    // fewest CSS mismatches — for the 1-vs-1 common case this is exactly the old single
    // comparePair() call, byte-identical behaviour.
    const rText = runTier(d.textEls, c.textEls, false, d.defaults, vw);
    const rBox = runTier(d.boxEls, c.boxEls, true, d.defaults, vw);
    const T = rText.T + rBox.T, M = rText.M + rBox.M;
    const tagT = rText.tagT + rBox.tagT, tagM = rText.tagM + rBox.tagM;
    const unmT = rText.unmT + rBox.unmT, fluidDeclined = rText.fluidDeclined + rBox.fluidDeclined;
    const mis = rText.mis.concat(rBox.mis), unm = rText.unm.concat(rBox.unm);
    const subv = rText.subv.concat(rBox.subv), tagMis = rText.tagMis.concat(rBox.tagMis);
    const fluidv = rText.fluidv.concat(rBox.fluidv);
    const passv = rText.passv.concat(rBox.passv);

    const subCount = subv.reduce((n, e) => n + e.sub.length, 0);
    const fluidCount = fluidv.reduce((n, e) => n + e.fluid.length, 0);
    // Step 9c: per-property PASS + FAIL counts, so the artefact can audit its own score --
    // today it records only mismatches, so pass+fail cannot be checked against the reported
    // denominator without re-running the tool. tally[prop].pass + .fail sums to the number of
    // times that property was a scored unit (post longhand-family-collapse) across this
    // viewport.
    const propertyTally = {};
    const tallyBump = (prop, field) => { (propertyTally[prop] = propertyTally[prop] || { pass: 0, fail: 0 })[field]++; };
    for (const m of mis) for (const d of m.diffs) tallyBump(d.prop, 'fail');
    for (const p of passv) for (const prop of p.passes) tallyBump(prop, 'pass');
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
        // Step 9c: property_pass_counts[prop] = {pass, fail} — auditable from the artefact
        // alone, without re-running the tool. Covers scored PAIRS only: sum(pass)+sum(fail)
        // equals meaningful_props MINUS meaningful_props_lost_to_unmatched, never the bare
        // meaningful_props total — an unmatched element has no clone value to compare against,
        // so meaningfulCountUnmatched() charges a raw per-property count with no pass/fail
        // dichotomy (and no family collapse) to route through this tally.
        property_pass_counts: propertyTally,
      },
      // `tag` is informational ONLY (FR-20-9) — a divergent tag is never scored as a defect,
      // here or anywhere else in this file (Bean-locked 2026-09-09, corrected same day as
      // shipped): CLAUDE.md Rule 1 is CONVERT, don't mirror — a native SGS block choosing its
      // OWN semantic tag (blockquote/cite/footer for a testimonial, a <label> instead of a
      // <button> for a picker option) is a legitimate implementation decision, not a DOM-
      // mirroring defect. `pct`/`match` are kept for backward artefact-shape compatibility
      // ONLY; do not read them as a fidelity signal — read `mismatches` as a plain list for
      // human context (e.g. spotting a genuinely wrong substitution), never as a percentage.
      tag: { pct: tagT ? Math.round(100 * tagM / tagT) : null, pairs: tagT, match: tagM, mismatches: tagMis },
      // Step 11 (measurement-integrity, 2026-09-09): four numbers, each with its own
      // denominator, replacing the single aggregate CSS % that let a structural matcher defect
      // masquerade as a CSS-transfer failure for a full session (Seat C recommendation). NO
      // headline aggregate is computed from these — read each dimension on its own terms.
      //   content   — identical to the `content` field above (texts/images/links present).
      //   structure — CORRECTED 2026-09-09 (Bean-directed, same-day fix): counts ONLY whether
      //               the draft element's CONTENT was found in the clone at all (a genuine
      //               unmatched element = a real defect). A tag divergence on an otherwise-
      //               matched element is NEVER charged here — see the `tag` field's own
      //               comment for why. matched = every successfully PAIRED element
      //               (tagT - unm.length, i.e. regardless of tag); total = tagT (same
      //               denominator as before).
      //   layout / paint_type — partitions property_pass_counts (Step 9c) by property
      //               classification (classifyPropertyBucket above); a STRUCTURE miss is never
      //               re-charged here (property_pass_counts only ever covers SCORED PAIRS).
      dimensions: (() => {
        const layout = { pass: 0, fail: 0 }, paint_type = { pass: 0, fail: 0 };
        for (const [prop, counts] of Object.entries(propertyTally)) {
          const bucket = classifyPropertyBucket(prop) === 'layout' ? layout : paint_type;
          bucket.pass += counts.pass; bucket.fail += counts.fail;
        }
        gContentMatched += cTot - cDrop; gContentTotal += cTot;
        gLayoutPass += layout.pass; gLayoutFail += layout.fail;
        gPaintPass += paint_type.pass; gPaintFail += paint_type.fail;
        gUnm += unm.length;
        const pctOf = (b) => (b.pass + b.fail ? Math.round(100 * b.pass / (b.pass + b.fail)) : null);
        const structureMatched = tagT - unm.length;
        return {
          content: { pct: contentPct, matched: cTot - cDrop, total: cTot },
          structure: { pct: tagT ? Math.round(100 * structureMatched / tagT) : null, matched: structureMatched, total: tagT },
          layout: { pct: pctOf(layout), matched: layout.pass, total: layout.pass + layout.fail },
          paint_type: { pct: pctOf(paint_type), matched: paint_type.pass, total: paint_type.pass + paint_type.fail },
        };
      })(),
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
    const dims = report.viewports[vw].dimensions;
    console.log(`\n===== ${vw}px =====`);
    console.log(`  CONTENT     ${dims.content.pct}%   (${dims.content.matched}/${dims.content.total})`);
    console.log(`  STRUCTURE   ${dims.structure.pct}%   (${dims.structure.matched}/${dims.structure.total} elements — content found in the clone at all; ${unm.length} unmatched. ${tagMis.length} tag divergence(s) logged for context, NOT scored — see the artefact's own \`tag\` field comment)`);
    console.log(`  LAYOUT      ${dims.layout.pct}%   (${dims.layout.matched}/${dims.layout.total} scored props — display, grid/flex, gap, alignment, box spacing, geometry)`);
    console.log(`  PAINT+TYPE  ${dims.paint_type.pct}%   (${dims.paint_type.matched}/${dims.paint_type.total} scored props — colour, background, border, radius, font-*, line-height, text-*)`);
    console.log(`  (legacy CSS ${T ? Math.round(100 * M / T) : 0}%, ${M}/${T} — single aggregate, kept for artefact back-compat only; ${subCount} sub-visible excluded, ${fluidCount} fluid-equivalent, ${fluidDeclined} fluid-declined)`);
    if (unm.length) {
      console.log(`  ⚠ MISSING  ${unm.length} draft element(s) have NO counterpart in the clone — ${unmT} meaningful prop(s) scored as LOST (was: excluded from the score entirely).`);
      for (const u of unm.slice(0, 6)) console.log(`      [${u.tag}] "${u.text}" (${u.meaningful_props_lost} props)`);
    }
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
  // Step 11: overall (all-viewports) four-dimension summary — NO aggregate headline computed
  // from these; each dimension is read on its own terms, with its own denominator.
  const gStructureMatched = gTagT - gUnm;
  report.dimensions = {
    content: { pct: gContentTotal ? Math.round(100 * gContentMatched / gContentTotal) : null, matched: gContentMatched, total: gContentTotal },
    // structure — CORRECTED 2026-09-09 (Bean-directed): counts ONLY whether the draft
    // element's content was found in the clone at all; a tag divergence is NEVER charged
    // (CLAUDE.md Rule 1 — a native SGS block's own semantic tag choice is not a mirroring
    // defect). See the per-viewport `structure` field's comment for the full reasoning.
    structure: { pct: gTagT ? Math.round(100 * gStructureMatched / gTagT) : null, matched: gStructureMatched, total: gTagT },
    layout: { pct: (gLayoutPass + gLayoutFail) ? Math.round(100 * gLayoutPass / (gLayoutPass + gLayoutFail)) : null, matched: gLayoutPass, total: gLayoutPass + gLayoutFail },
    paint_type: { pct: (gPaintPass + gPaintFail) ? Math.round(100 * gPaintPass / (gPaintPass + gPaintFail)) : null, matched: gPaintPass, total: gPaintPass + gPaintFail },
  };
  const gd = report.dimensions;
  console.log(`\n##### FOUR DIMENSIONS (${VIEWPORTS.length} viewports; no single aggregate) #####`);
  console.log(`  CONTENT     ${gd.content.pct}%   (${gd.content.matched}/${gd.content.total})`);
  console.log(`  STRUCTURE   ${gd.structure.pct}%   (${gd.structure.matched}/${gd.structure.total} elements — content found in the clone at all; tag identity NOT scored)`);
  console.log(`  LAYOUT      ${gd.layout.pct}%   (${gd.layout.matched}/${gd.layout.total} scored props)`);
  console.log(`  PAINT+TYPE  ${gd.paint_type.pct}%   (${gd.paint_type.matched}/${gd.paint_type.total} scored props)`);
  console.log(`  (legacy aggregate — kept for artefact back-compat only, never quote as fidelity: CSS ${report.overall_css_pct}%, TAG ${report.overall_tag_pct}%, ${gSub} sub-visible excluded, ${gFluid} fluid-equivalent, ${gFluidDeclined} fluid-declined. Excludes text: ${EXCLUDE.join(', ') || 'none'})`);
  console.log(`  VISIBLE-fidelity (Spec 20 v1.2.0; missing elements SCORED as misses); pairs with Bean's eye, never closes alone.`);
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log('report -> ' + OUT); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
}
