#!/usr/bin/env node
/**
 * draft-responsive-probe.js — Universal-pipeline upgrade, Piece 2.
 *
 * THE PROBLEM (plain English): `computed-parity.js` measures draft-vs-CLONE fidelity
 * AFTER a clone exists — it hard-requires --draft AND --clone (verified: `if (!SELF_TEST
 * && (!DRAFT || !CLONE))` exits with an error). Claude Design drafts (`.dc.html`) compute
 * their responsive layout in JavaScript (a ResizeObserver-driven width -> boolean ->
 * inline-style-string chain — see `Eye Care Birmingham.dc.html::measure`), not CSS
 * `@media` queries, so there is nothing for the CONVERTER to read at extraction time
 * UNLESS the draft is actually rendered and measured at each width FIRST. This script is
 * that missing extraction-time step: draft-vs-ITSELF across widths, no clone involved.
 *
 * Design grounded in `.claude/reports/2026-09-14-claude-design-draft-pipeline-
 * harmonisation.md` §7 (the recommended mechanism) — quoting it directly: "Render each
 * route at each device tier and diff computed styles keyed by normalised text content
 * (the project's existing rule 4a, not a new invention)." §8 re-verified live before
 * writing this file (2026-09-14): `mobilePreview` is STILL hardcoded `false` at line 1806
 * of the real Ward End Eye Care draft — if a regenerated draft ever flips it, this script's
 * `mobilePreview` sanity check (below) will fail loudly rather than silently mismeasuring.
 *
 * SCOPE (deliberately narrow — matches this session's task, not the full pipeline):
 *   - ONE already-loaded route per run (the blank-canvas pages this session covers: Home/
 *     About/Help/Contact). Driving interaction states (mega-menu open, filter drawer, lens
 *     modal) to reach OTHER routes/states is explicitly out of scope — §8's "route coverage
 *     is the biggest practical risk" is real and unsolved, not silently assumed away.
 *   - A FOCUSED responsive-relevant property set (padding/margin/gap/grid-template-columns/
 *     display/flex-direction/font-size/line-height/align-items/justify-content), NOT
 *     computed-parity.js's full universal-minus-blocklist set — that tool measures VISUAL
 *     FIDELITY (everything that could differ); this one measures RESPONSIVE BEHAVIOUR
 *     (only what plausibly changes with width). Confirmed by the harmonisation report's own
 *     measured property breakdown on this exact draft: padding 18, gridTemplateColumns 8,
 *     fontSize 8, display 1 — the focused set covers every property that measurement found.
 *   - Widths default to 375/768/1440 -- this project's fixed SGS device-tier standard
 *     (CLAUDE.md "Responsive breakpoint discipline": mobile/tablet/desktop = 768/1024,
 *     ALWAYS, never the draft's own arbitrary breakpoints). The draft's real internal
 *     breakpoints (620/700/760/820/1010/1024/1060/1100/1160/1280 -- all real, grepped
 *     directly from the file) are numerous and per-section; this script does not try to
 *     discover or preserve them -- it maps the draft's continuous JS-driven behaviour onto
 *     the SAME fixed 3-tier system every CSS-breakpoint draft is mapped onto.
 *
 * NEVER parses support.js internals (§7's hard rule) -- every value here comes from
 * rendering + `getComputedStyle`, never from reading the runtime's own JS source.
 *
 * IDENTITY CORRELATION (2026-09-14, "connect the pieces" pass): a rendered `sc-for` item
 * cannot be matched to Piece 1's boundary by TEXT -- Piece 1 reads the SOURCE parse tree,
 * where an `sc-for` item is a template containing literal `{{ r.title }}`-shaped
 * placeholders, not real content (verified live against the real "reasons" sc-for: its
 * `sc_var_text` is literally `"{{ r.no }} {{ r.title }} {{ r.body }}"`, which can never
 * contain-match rendered text like "01 Fast Turnaround..."). So this script also captures a
 * STRUCTURAL signature per element -- own tag + immediate-children tag skeleton + sibling
 * repeat count under the same parent -- which Piece 1 can independently compute from its
 * SOURCE node (same definition: own tag + `find_all(True, recursive=False)` skeleton +
 * `hint-placeholder-count`). `sc_var_responsive_correlator.py` joins on this signature for
 * `sc-for` boundaries, falling back to text-containment for everything else (static
 * sections, headings) where source and rendered text genuinely do match.
 *
 * ROUTE COVERAGE (2026-09-14, "the 2 gaps" follow-up -- proof-of-concept, not a general
 * interaction-discovery engine): the module docstring above named "driving interaction
 * states (mega-menu open, filter drawer, lens modal) to reach other routes/states" as an
 * unsolved risk. `--click <selector>[,<selector>...]` proves the pattern on ONE real case --
 * verified live against the real Ward End Eye Care draft: `button[aria-label="Bag"]` genuinely
 * mounts the bag drawer (`sc-if value="{{ bagOpen }}"`, confirmed by its real copy "Nothing in
 * here yet." appearing only after the click -- NOT by guessing at text, an earlier attempt in
 * this session's own working notes wrongly checked for "Your bag", a DIFFERENT section's
 * copy, and wrongly looked like a failure). State persists across a viewport resize (also
 * verified live), so clicks happen ONCE after page load, before the width loop -- not
 * per-width. Generalising this to every interactive state on every route is still unbuilt
 * follow-up work; this flag proves the mechanism, it does not enumerate the state space.
 *
 * AUTOMATIC INTERACTION DETECTION (2026-09-14, generalising --click): `--click` proved the
 * mechanism on ONE hand-typed selector -- it does not find OTHER interactive states, and a
 * real survey of this exact draft found ~73 state-changing flags across three shapes: (A) a
 * plain boolean toggle, (B) a single enum/string field with several derived comparison
 * booleans (tabs, a mega-menu, a modal -- the majority shape), (C) a nested multi-step object
 * reached only through several sequential interactions (the lens-configuration flow). Trigger
 * wiring is inconsistent too -- most fire on click, at least one (the desktop mega-menu) fires
 * on `onMouseEnter` only.
 *
 * `--auto-detect [--max-depth N]` (default N=2) drives this automatically:
 *   1. DETECT -- scan the rendered DOM (never the source HTML/JS -- same "no parsing the
 *      runtime's own source" discipline as the rest of this file) for plausible triggers:
 *      `button`, `[role=button|switch|tab]`, and `a[href="#"]`/`a[href=""]` (a real external
 *      href, `target=_blank`, a submit-typed control, or submit/payment-shaped text such as
 *      "Pay now"/"Place order"/"Checkout" is classified UNSAFE and never clicked -- reported
 *      instead in `skipped_for_safety` with the reason).
 *   2. DRIVE -- click every safe candidate (plus a HOVER attempt for anything inside
 *      `nav`/`header` or carrying `aria-haspopup`, to reach the hover-only mega-menu); diff a
 *      lightweight structural signature (tag+text of every visible element) before/after. A
 *      >50% change is classified `route-change-suspected` and skipped -- driving a full
 *      route/page swap is explicitly out of scope (see ROUTE COVERAGE above); anything smaller
 *      that changed is a genuine localised state and gets the full per-width capture.
 *   3. RECURSE -- for each captured state, re-scan the newly-appeared subtree for further safe
 *      triggers and drive those too (each on its OWN fresh page, replaying the path from
 *      scratch, so sibling branches never contaminate each other), up to `--max-depth`. This is
 *      what reaches shape (B)'s derived-boolean groups (every tab gets its own depth-1 attempt)
 *      and makes a real attempt at shape (C)'s sequential steps -- but a genuinely deep flow
 *      (the lens configurator) can exceed the depth cap or need an interaction this tool
 *      doesn't drive (typing, dragging, picking a specific enum value before the next step
 *      appears); when that happens it is reported as `depth-cap-reached`/`depth-budget-
 *      exceeded`, NEVER silently dropped -- `--click` remains the manual escape hatch for
 *      exactly that case (still works exactly as before -- this is additive).
 *
 * Output additions when `--auto-detect` is used: `report.auto_detect.states[]` (one entry per
 * successfully driven state, same `elements`/`changed_properties` shape as the default-state
 * report, labelled by the trigger path that reached it), `report.auto_detect.gaps[]` (every
 * candidate the detector found but could not safely/automatically drive, each naming the
 * element + reason), `report.auto_detect.skipped_for_safety[]`.
 *
 * Usage:
 *   node draft-responsive-probe.js --draft <path|url> [--viewports 375,768,1440]
 *        [--out report.json] [--label <route-name>] [--click <selector>[,<selector>...]]
 *        [--auto-detect] [--max-depth 2]
 *   node draft-responsive-probe.js --self-test
 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const toURL = (s) => (!s ? s : (/^https?:\/\//i.test(s) ? s : pathToFileURL(path.resolve(s)).href));
const DRAFT = toURL(arg('draft'));
const VIEWPORTS = arg('viewports', '375,768,1440').split(',').map(Number);
const OUT = arg('out', '');
const LABEL = arg('label', 'draft');
const CLICK = arg('click', '');
const CLICK_SELECTORS = CLICK ? CLICK.split(',').map((s) => s.trim()).filter(Boolean) : [];
const AUTO_DETECT = process.argv.includes('--auto-detect');
const MAX_DEPTH = parseInt(arg('max-depth', '2'), 10);
const SELF_TEST = process.argv.includes('--self-test');
if (!SELF_TEST && !DRAFT) { console.error('ERROR: --draft <path|url> is required.'); process.exit(2); }

// The focused, responsive-relevant property set -- see module docstring for why this is
// NOT computed-parity.js's universal set.
const RESPONSIVE_PROPS = [
  'display', 'flex-direction', 'flex-wrap',
  'grid-template-columns', 'grid-template-rows',
  'gap', 'row-gap', 'column-gap',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'font-size', 'line-height',
  'align-items', 'justify-content', 'text-align',
];

// In-page capture. Content-keyed (rule 4a), same methodology as computed-parity.js but a
// standalone re-implementation (that file is a self-contained CLI script, not an importable
// module, and its capture logic carries fidelity-measurement machinery -- pseudo-paint
// fallback, fluid-typography equivalence, BEM collision merge -- that is out of scope for
// a same-page across-widths diff, where there is no clone-vs-draft ambiguity to resolve).
const CAPTURE_SRC = `() => {
  const props = ${JSON.stringify(RESPONSIVE_PROPS)};
  const WS_RE = /[\\s\\u00A0\\u200B\\uFEFF]+/g;
  const STRIP_RE = /[^a-z0-9 £\\s\\u00A0\\u200B\\uFEFF]/g;
  const norm = (t) => (t || '').toLowerCase().replace(STRIP_RE, '').replace(WS_RE, ' ').trim().slice(0, 300);
  const px = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const normVal = (p, v) => {
    if (v == null) return v;
    if ((p === 'grid-template-columns' || p === 'grid-template-rows') && v !== 'none') return String(v.split(' ').filter(Boolean).length);
    return v.replace(/(-?\\d+\\.\\d+)px/g, (m, n) => Math.round(parseFloat(n)) + 'px');
  };
  const SKIP_TAGS = { STYLE: 1, SCRIPT: 1, NOSCRIPT: 1, SVG: 1, PATH: 1, TEMPLATE: 1, LINK: 1, META: 1, TITLE: 1, HEAD: 1 };

  // Structural sibling-group signature -- an sc-for-rendered item's TEXT never matches its
  // SOURCE template placeholder text (see module docstring), but its shape does: own tag +
  // immediate-children tag skeleton, repeated N times under the same parent. Computed once
  // per parent, attached to each qualifying child, independent of the text-key walk below.
  const childSkeleton = (el) => Array.from(el.children).map((c) => c.tagName.toLowerCase());
  const groupInfo = new WeakMap();
  const parents = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    if (el.parentElement) parents.add(el.parentElement);
  }
  for (const parent of parents) {
    const bySig = new Map();
    for (const child of parent.children) {
      if (SKIP_TAGS[child.tagName]) continue;
      const sig = child.tagName.toLowerCase() + '>' + childSkeleton(child).join(',');
      if (!bySig.has(sig)) bySig.set(sig, []);
      bySig.get(sig).push(child);
    }
    for (const [sig, group] of bySig) {
      if (group.length < 2) continue;
      for (const child of group) groupInfo.set(child, { group_signature: sig, group_size: group.length });
    }
  }

  const out = [];
  const keyCounts = {};
  const walk = document.body.querySelectorAll('*');
  for (const el of walk) {
    if (SKIP_TAGS[el.tagName]) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue; // not rendered/visible at this width
    const ownText = norm(el.textContent);
    if (!ownText) continue;
    const cs = getComputedStyle(el);
    const css = {};
    for (const p of props) css[p] = normVal(p, cs.getPropertyValue(p));
    const baseKey = el.tagName.toLowerCase() + '|' + ownText;
    keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
    const key = baseKey + '#' + keyCounts[baseKey]; // disambiguate repeated identical text
    const group = groupInfo.get(el);
    out.push({
      key, tag: el.tagName.toLowerCase(), css,
      group_signature: group ? group.group_signature : null,
      group_size: group ? group.group_size : null,
    });
  }
  return { elements: out, rootClientWidth: document.documentElement.clientWidth, windowInnerWidth: window.innerWidth };
}`;

async function captureAtWidth(page, width, mobilePreviewCheck) {
  await page.setViewportSize({ width, height: 1200 });
  // Give the ResizeObserver-driven re-render a tick to settle (the draft recomputes `mob`/
  // `narrow`/`wide` off a ResizeObserver callback, not synchronously on resize).
  await page.waitForTimeout(300);
  const result = await page.evaluate('(' + CAPTURE_SRC + ')()');
  if (mobilePreviewCheck && result.rootClientWidth !== result.windowInnerWidth) {
    // §8's named open risk, live-checked every run rather than assumed still false: if a
    // regenerated draft ever flips `mobilePreview` on, the measured root width stops
    // matching the real viewport and every capture below would be silently wrong. Fail
    // loudly instead.
    throw new Error(
      `mobilePreview sanity check failed at width=${width}: rootClientWidth=${result.rootClientWidth} !== windowInnerWidth=${result.windowInnerWidth}. ` +
      `The draft may have flipped its 'mobilePreview' flag on -- re-verify before trusting this probe's output.`
    );
  }
  return result;
}

async function driveInteraction(page, clickSelectors) {
  // Clicked ONCE, before the width loop -- verified live that the resulting state (e.g. the
  // bag drawer) persists across a viewport resize, so re-clicking per width would be both
  // unnecessary and risky (a second click on a now-different element under the drawer could
  // close it again). A selector that never matches fails LOUDLY, not silently -- a route-
  // coverage capture that silently measured the closed state while claiming to measure the
  // open one would be worse than not attempting it at all.
  const clicked = [];
  for (const selector of clickSelectors) {
    const locator = page.locator(selector).first();
    const count = await page.locator(selector).count();
    if (count === 0) {
      throw new Error(`--click selector matched zero elements: ${selector}`);
    }
    await locator.click();
    await page.waitForTimeout(300);
    clicked.push(selector);
  }
  return clicked;
}

// Match elements across widths by their content key -- shared by the default-state probe and
// every auto-detected interaction state. An element present at every width is a genuine
// same-content comparison; present-at-some-widths-only is reported separately (structural
// change, not a property diff -- out of scope for this script, which measures RESPONSIVE
// VALUES, not structural presence).
function summariseByWidth(byWidth, viewports) {
  const widthKeys = viewports.map((w) => String(w));
  const keySets = widthKeys.map((w) => new Set(byWidth[w].elements.map((e) => e.key)));
  const presentAtAll = keySets.reduce((acc, s) => new Set([...acc].filter((k) => s.has(k))));

  const elementsByKeyByWidth = {};
  for (const w of widthKeys) {
    elementsByKeyByWidth[w] = new Map(byWidth[w].elements.map((e) => [e.key, e]));
  }

  const results = [];
  for (const key of presentAtAll) {
    const perWidth = {};
    let changedProperties = new Set();
    let tag = null;
    let prevCss = null;
    // Structural group info -- read from the narrowest width's capture (a group's own
    // tag/skeleton/size is a structural fact of the DOM, not something that changes per
    // width; the narrowest width is captured first so it's a stable, arbitrary choice).
    let groupSignature = null;
    let groupSize = null;
    for (const w of widthKeys) {
      const el = elementsByKeyByWidth[w].get(key);
      perWidth[w] = el.css;
      tag = el.tag;
      if (groupSignature === null && el.group_signature) {
        groupSignature = el.group_signature;
        groupSize = el.group_size;
      }
      if (prevCss) {
        for (const p of RESPONSIVE_PROPS) {
          if (prevCss[p] !== el.css[p]) changedProperties.add(p);
        }
      }
      prevCss = el.css;
    }
    if (changedProperties.size === 0) continue; // not part of the responsive surface
    results.push({
      key, tag,
      group_signature: groupSignature,
      group_size: groupSize,
      changed_properties: [...changedProperties].sort(),
      values_by_width: perWidth,
    });
  }

  return {
    elements_total_at_narrowest: byWidth[widthKeys[0]].elements.length,
    elements_present_at_all_widths: presentAtAll.size,
    responsive_elements: results.length,
    elements: results,
  };
}

// ---------------------------------------------------------------------------------------
// AUTOMATIC INTERACTION DETECTION -- see module docstring "AUTOMATIC INTERACTION DETECTION".
// ---------------------------------------------------------------------------------------

// In-page scan for plausible interactive triggers. Deliberately reads only the RENDERED DOM
// (tag/role/aria-*/text/href) -- never the source HTML's `{{ }}` placeholders and never the
// runtime's own JS (same discipline as the rest of this file). Risk classification is
// text/attribute based so a submit- or payment-shaped control is never clicked blindly.
const SCAN_SRC = `() => {
  const RISKY_RE = /\\b(pay now|place order|checkout|submit|subscribe|sign up|sign in|log in|log out|register|delete account|remove account)\\b/i;
  const SAFE_SELECTORS = 'button, [role="button"], [role="switch"], [role="tab"], a[href="#"], a[href=""]';
  const norm = (t) => (t || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
  const out = [];
  for (const el of document.querySelectorAll(SAFE_SELECTORS)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue; // not rendered/visible
    const tag = el.tagName.toLowerCase();
    const text = norm(el.textContent);
    const ariaLabel = el.getAttribute('aria-label') || '';
    const href = el.getAttribute('href');
    const type = (el.getAttribute('type') || '').toLowerCase();
    const reasons = [];
    if (tag === 'a' && href && href !== '#' && href !== '' && !href.toLowerCase().startsWith('javascript:')) {
      reasons.push('external-looking href: "' + href + '"');
    }
    if (el.getAttribute('target') === '_blank') reasons.push('opens a new tab/window (target="_blank")');
    if (type === 'submit') reasons.push('submit-typed control (type="submit")');
    if (RISKY_RE.test(text) || RISKY_RE.test(ariaLabel)) {
      reasons.push('text/aria-label looks like a submit or payment action: "' + (text || ariaLabel) + '"');
    }
    out.push({
      tag, text, ariaLabel,
      role: el.getAttribute('role') || null,
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaSelected: el.getAttribute('aria-selected'),
      ariaChecked: el.getAttribute('aria-checked'),
      ariaHaspopup: el.getAttribute('aria-haspopup'),
      inNav: !!el.closest('nav, header'),
      safe: reasons.length === 0,
      skipReasons: reasons,
    });
  }
  return out;
}`;

// A lightweight structural signature (tag + text of every visible element) used purely to
// detect WHETHER an interaction changed anything and how much -- deliberately cheaper than
// CAPTURE_SRC's full getComputedStyle walk, since this runs once per candidate attempted,
// not once per state actually captured.
const SIGNATURE_SRC = `() => {
  const norm = (t) => (t || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const text = norm(el.textContent);
    if (!text) continue;
    out.push(el.tagName.toLowerCase() + '|' + text);
  }
  return out;
}`;

function describeTrigger(cand) {
  const name = cand.text || cand.ariaLabel || `<${cand.tag}>`;
  const role = cand.role ? ` [role=${cand.role}]` : '';
  return `${cand.tag}${role} "${name}"`;
}

function pathLabel(path) {
  return path.map((s) => describeTrigger(s.cand) + (s.action === 'hover' ? ' [hover]' : '')).join(' -> ');
}

// Symmetric-difference diff between two structural signatures -- `ratio` is how much of the
// page's visible content changed (used to distinguish a localised state change, e.g. a drawer
// opening, from what looks like a full route/page swap, which is out of scope here).
function diffSignatures(before, after) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((s) => !beforeSet.has(s));
  const removed = before.filter((s) => !afterSet.has(s));
  const union = new Set([...before, ...after]);
  const ratio = union.size === 0 ? 0 : (added.length + removed.length) / union.size;
  return { added, removed, ratio };
}

function sigText(sig) {
  return sig.slice(sig.indexOf('|') + 1);
}

// Builds a Playwright locator from a SCAN_SRC candidate descriptor -- content-keyed (tag +
// role + accessible name), not an injected id, so the SAME descriptor relocates its element
// correctly on a completely fresh page load (a deterministic re-render of the same state
// produces the same DOM order) -- this is what makes multi-step REPLAY (below) possible
// without any DOM-mutation-order bookkeeping.
function locatorFor(page, cand) {
  const role = cand.role || (cand.tag === 'button' ? 'button' : cand.tag === 'a' ? 'link' : null);
  // `aria-label`, when present, OVERRIDES visible text in the browser's own accessible-name
  // computation -- so `getByRole` (which matches by accessible name) must prefer it too.
  // Found live against the real draft: `button[aria-label="Bag"]` renders visible text "Bag 0"
  // (a dynamic item-count badge appended to the label) -- matching on that VISIBLE text failed
  // every replay, because the button's real accessible name is "Bag", not "Bag 0". Text stays
  // the fallback for `hasText` (below), which genuinely does match visible text.
  const ariaName = cand.ariaLabel || cand.text || undefined;
  if (role) {
    try {
      return page.getByRole(role, ariaName ? { name: ariaName, exact: false } : undefined).first();
    } catch (e) { /* fall through to tag-based locator below */ }
  }
  if (cand.text) return page.locator(cand.tag).filter({ hasText: cand.text }).first();
  return page.locator(cand.tag).first();
}

// Replays a full interaction path (from page load) on a FRESH page -- every branch gets its
// own clean state, so sibling explorations never contaminate each other. Returns the open
// page on success (caller must close it) or { ok: false } if any step's locator vanished.
async function replayPath(browser, draftUrl, path) {
  const page = await browser.newPage();
  await page.goto(draftUrl, { waitUntil: 'networkidle' });
  for (const step of path) {
    const loc = locatorFor(page, step.cand);
    if ((await loc.count()) === 0) {
      await page.close();
      return { ok: false, reason: 'locator matched zero elements' };
    }
    try {
      // A short, explicit timeout -- some real-draft candidates sit inside a CSS transition/
      // animation loop (e.g. a hover-transform tile) and Playwright's actionability check
      // ("element is not stable") never resolves within the default 30s, which would
      // otherwise hang the whole run on one candidate. A failure here is reported as a gap,
      // never allowed to crash the run or silently skip the rest of the queue.
      if (step.action === 'hover') await loc.hover({ timeout: 5000 });
      else await loc.click({ timeout: 5000 });
    } catch (e) {
      await page.close();
      return { ok: false, reason: `${step.action} did not complete within 5s (${e.message.split('\n')[0]})` };
    }
    await page.waitForTimeout(250);
  }
  return { ok: true, page };
}

// The detection + driving pipeline itself. See module docstring "AUTOMATIC INTERACTION
// DETECTION" for the full DETECT -> DRIVE -> RECURSE description.
async function autoDetect(draftUrl, viewports, maxDepth) {
  const browser = await chromium.launch();
  const states = [];
  const gaps = [];
  const skippedForSafety = [];
  let candidatesScanned = 0;

  try {
    const rootPage = await browser.newPage();
    await rootPage.goto(draftUrl, { waitUntil: 'networkidle' });
    const baselineSig = await rootPage.evaluate('(' + SIGNATURE_SRC + ')()');
    const rootCandidates = await rootPage.evaluate('(' + SCAN_SRC + ')()');
    await rootPage.close();
    candidatesScanned = rootCandidates.length;

    for (const c of rootCandidates) {
      if (!c.safe) skippedForSafety.push({ trigger: describeTrigger(c), reasons: c.skipReasons });
    }

    const queue = [];
    for (const c of rootCandidates.filter((c) => c.safe)) {
      queue.push({ path: [{ cand: c, action: 'click' }], baselineSig });
      // The hover-only mega-menu finding: also try hover for anything nav/header-scoped or
      // carrying aria-haspopup -- a click-only drive would never reach it.
      if (c.inNav || c.ariaHaspopup) queue.push({ path: [{ cand: c, action: 'hover' }], baselineSig });
    }

    const MAX_ATTEMPTS = 150; // disclosed budget, not a silent cap -- see the gap pushed below
    let attempts = 0;

    while (queue.length) {
      if (attempts >= MAX_ATTEMPTS) {
        gaps.push({
          type: 'budget-exceeded',
          trigger: null,
          reason: `${queue.length} further candidate path(s) not attempted (safety cap of ${MAX_ATTEMPTS} total interaction attempts reached for this run)`,
        });
        break;
      }
      const item = queue.shift();
      attempts += 1;
      const label = pathLabel(item.path);

      const { ok, page, reason: replayFailReason } = await replayPath(browser, draftUrl, item.path);
      if (!ok) {
        gaps.push({ type: 'trigger-not-reproducible', trigger: label, reason: `could not drive this trigger on replay -- ${replayFailReason}` });
        continue;
      }

      const afterSig = await page.evaluate('(' + SIGNATURE_SRC + ')()');
      const diff = diffSignatures(item.baselineSig, afterSig);

      if (diff.ratio > 0.5) {
        gaps.push({
          type: 'route-change-suspected',
          trigger: label,
          reason: `this interaction changed ~${Math.round(diff.ratio * 100)}% of the page's visible content -- looks like a route/page swap rather than a same-route interactive state, out of scope for this probe (see module docstring "ROUTE COVERAGE")`,
        });
        await page.close();
        continue;
      }
      if (diff.added.length === 0 && diff.removed.length === 0) {
        // No observable effect (e.g. an already-open toggle, or a handler with no visible
        // side effect) -- not a state, and not reported as a gap since nothing was missed.
        await page.close();
        continue;
      }

      // A genuine localised state change -- capture the full per-width responsive report,
      // exactly like a manual --click state.
      const byWidth = {};
      for (const w of viewports) byWidth[w] = await captureAtWidth(page, w, false);
      const summary = summariseByWidth(byWidth, viewports);
      states.push({ trigger: label, depth: item.path.length, ...summary });

      const depth = item.path.length;
      const deeperCandidates = await page.evaluate('(' + SCAN_SRC + ')()');
      const addedTexts = new Set(diff.added.map(sigText));
      const newlyAppeared = deeperCandidates.filter((c) => addedTexts.has(c.text));

      if (depth >= maxDepth) {
        const stillSafe = newlyAppeared.filter((c) => c.safe);
        if (stillSafe.length) {
          gaps.push({
            type: 'depth-cap-reached',
            trigger: label,
            reason: `reached this run's max depth (${maxDepth}); ${stillSafe.length} further trigger(s) inside this state were not explored (e.g. ${stillSafe.slice(0, 3).map(describeTrigger).join(', ')}) -- likely a multi-step flow (e.g. a configurator); drive it manually with --click`,
          });
        }
      } else {
        let queued = 0;
        const PER_STATE_BUDGET = 5;
        for (const nc of newlyAppeared) {
          if (!nc.safe) {
            skippedForSafety.push({ trigger: `${describeTrigger(nc)} (nested under ${label})`, reasons: nc.skipReasons });
            continue;
          }
          if (queued >= PER_STATE_BUDGET) {
            gaps.push({
              type: 'depth-budget-exceeded',
              trigger: label,
              reason: `${newlyAppeared.length - queued} further nested trigger(s) inside this state were not attempted (per-state budget of ${PER_STATE_BUDGET})`,
            });
            break;
          }
          queued += 1;
          queue.push({ path: [...item.path, { cand: nc, action: 'click' }], baselineSig: afterSig });
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  return { candidates_scanned: candidatesScanned, states, gaps, skipped_for_safety: skippedForSafety };
}

async function probe(draftUrl, viewports, label, clickSelectors) {
  const browser = await chromium.launch();
  let clicked;
  let byWidth;
  try {
    const page = await browser.newPage();
    await page.goto(draftUrl, { waitUntil: 'networkidle' });
    // driveInteraction can throw (a bad --click selector, by design -- fail loudly, never
    // silently capture the wrong state) -- the browser must still close either way, or a
    // failed run leaks a live Chromium process and hangs the caller. Found live: the
    // negative-control self-test case threw here with `browser.close()` still below it,
    // leaking a browser and hanging the whole script past its 100s self-test timeout.
    clicked = clickSelectors && clickSelectors.length ? await driveInteraction(page, clickSelectors) : [];
    byWidth = {};
    for (const w of viewports) {
      byWidth[w] = await captureAtWidth(page, w, true);
    }
  } finally {
    await browser.close();
  }

  const summary = summariseByWidth(byWidth, viewports);

  return {
    label,
    draft: draftUrl,
    viewports,
    // Self-documenting: a report from an interaction-driven capture must never be mistaken
    // for the default (closed/unclicked) state -- empty array means "default page state,
    // nothing clicked", matching every report this script produced before --click existed.
    interaction: { clicked },
    ...summary,
  };
}

async function main() {
  if (SELF_TEST) return selfTest();
  const report = await probe(DRAFT, VIEWPORTS, LABEL, CLICK_SELECTORS);
  const interactionNote = report.interaction.clicked.length
    ? ` (interaction: clicked ${report.interaction.clicked.join(' -> ')})`
    : '';
  console.log(`draft-responsive-probe: ${report.responsive_elements} responsive element(s) of ${report.elements_present_at_all_widths} present at all ${VIEWPORTS.length} widths (${report.elements_total_at_narrowest} total at the narrowest width)${interactionNote}.`);
  if (AUTO_DETECT) {
    report.auto_detect = await autoDetect(DRAFT, VIEWPORTS, MAX_DEPTH);
    const ad = report.auto_detect;
    console.log(
      `auto-detect: scanned ${ad.candidates_scanned} candidate trigger(s), drove ${ad.states.length} state(s), ` +
      `skipped ${ad.skipped_for_safety.length} for safety, ${ad.gaps.length} gap(s) reported (max-depth=${MAX_DEPTH}).`
    );
    for (const s of ad.states) {
      console.log(`  state: ${s.trigger} -- ${s.responsive_elements} responsive element(s)`);
    }
    for (const g of ad.gaps) {
      console.log(`  gap [${g.type}]: ${g.trigger || '(run-level)'} -- ${g.reason}`);
    }
  }
  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Written: ${OUT}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

async function selfTest() {
  const os = require('os');
  const fixturePath = path.join(os.tmpdir(), `draft-responsive-probe-self-test-${Date.now()}.html`);
  // A minimal fixture matching the REAL runtime shape (verified live, 2026-09-14: custom
  // tags like <sc-for> do NOT survive rendering -- 0 found in the real draft's rendered
  // DOM -- so this fixture deliberately does NOT wrap the responsive element in one; doing
  // so would test a shape that never actually occurs and mask exactly the bug this file's
  // own module-docstring records finding). One JS-computed responsive value (padding
  // changes below 700px, the same ResizeObserver-driven pattern as the real draft), plus
  // one genuinely non-responsive element (a negative control -- must NOT appear in output).
  const html = `<!doctype html><html><body>
    <div id="root"></div>
    <div id="cards"></div>
    <button id="open-drawer" onclick="window.__drawerOpen = true; render();">Open drawer</button>
    <div id="drawer"></div>

    <!-- Risky-shaped control -- --auto-detect must classify this UNSAFE and never click it. -->
    <button id="pay-now" onclick="window.__paidNeverShouldHappen = true; render();">Pay now</button>

    <!-- Enum-derived-boolean shape (the majority real-draft shape: tabs / a mega-menu / a
         modal -- one string field with several derived comparison booleans). Both members are
         top-level SAFE candidates, so --auto-detect should drive EACH independently. -->
    <div id="tabs">
      <button id="tab-a" role="tab" aria-selected="true" onclick="window.__tab='a'; render();">Tab A</button>
      <button id="tab-b" role="tab" aria-selected="false" onclick="window.__tab='b'; render();">Tab B</button>
    </div>
    <div id="tabpanel"></div>

    <!-- Nested multi-step shape (mirrors the real lens-configuration flow): each step only
         reveals the NEXT trigger, and the genuinely responsive payload sits behind a 3rd
         step -- deeper than this run's default --max-depth (2), so the self-test proves BOTH
         "reaches what the depth cap allows" AND "honestly reports what it couldn't reach". -->
    <button id="step1" onclick="window.__step1 = true; render();">Open step 1</button>
    <div id="step-area"></div>

    <!-- Route-like shape -- a same-route responsive probe must not follow this: it should be
         classified route-change-suspected and never treated as a captured state. -->
    <button id="nav-away" onclick="window.__routed = true; render();">Go elsewhere</button>
    <div id="mainarea"></div>

    <!-- Hover-only trigger (mirrors the real draft's desktop mega-menu, which mounts on
         onMouseEnter and has no click handler at all) -- --auto-detect must try HOVER for a
         nav-scoped/aria-haspopup element, not just click. -->
    <nav>
      <a href="#" id="mega-trigger" aria-haspopup="true" onmouseenter="window.__megaOpen = true; render();">Menu</a>
    </nav>
    <div id="mega-panel"></div>
    <script>
      function render() {
        const w = window.innerWidth;
        const pad = w < 700 ? '12px' : '32px';
        document.getElementById('root').innerHTML =
          '<div style="padding:' + pad + '">Responsive item</div>' +
          '<div style="padding:20px">Static item</div>';
        // A 4-member sc-for-rendered card group -- each card's TEXT differs (mirrors real
        // rendered content, never the source template's placeholder text) but the TAG +
        // CHILDREN SKELETON is identical across all 4 -- this is what group_signature/
        // group_size must detect.
        const cardPad = w < 700 ? '8px' : '16px';
        const cards = ['Fast turnaround', 'Free parking', 'Friendly staff', 'Same-day fit'];
        document.getElementById('cards').innerHTML = cards.map(function (t) {
          return '<div style="padding:' + cardPad + '"><h3>' + t + '</h3><p>Body copy</p></div>';
        }).join('');
        // A drawer that only mounts after a click -- mirrors the real draft's
        // sc-if-gated bag drawer (conditionally rendered, not just CSS-hidden), with a
        // responsive value of its own so route coverage proves it can measure content
        // that is invisible until the interaction is driven.
        if (window.__drawerOpen) {
          const drawerPad = w < 700 ? '10px' : '24px';
          document.getElementById('drawer').innerHTML =
            '<div style="padding:' + drawerPad + '">Drawer content</div>';
        } else {
          document.getElementById('drawer').innerHTML = '';
        }

        document.getElementById('tab-a').setAttribute('aria-selected', window.__tab === 'b' ? 'false' : 'true');
        document.getElementById('tab-b').setAttribute('aria-selected', window.__tab === 'b' ? 'true' : 'false');
        const tabPad = w < 700 ? '6px' : '18px';
        document.getElementById('tabpanel').innerHTML = window.__tab === 'b'
          ? '<div style="padding:' + tabPad + '">Tab B panel content</div>'
          : '<div style="padding:20px">Tab A panel content</div>';

        // 3-step nested reveal -- step1 reveals step2's trigger only, step2 reveals step3's
        // trigger only, step3 reveals the actually-responsive final content.
        let stepArea = '';
        if (window.__step1) {
          stepArea += '<button id="step2" onclick="window.__step2 = true; render();">Open step 2</button>';
        }
        if (window.__step1 && window.__step2) {
          stepArea += '<button id="step3" onclick="window.__step3 = true; render();">Open step 3</button>';
        }
        if (window.__step1 && window.__step2 && window.__step3) {
          const finalPad = w < 700 ? '9px' : '27px';
          stepArea += '<div style="padding:' + finalPad + '">Nested final content</div>';
        }
        document.getElementById('step-area').innerHTML = stepArea;

        const megaPad = w < 700 ? '11px' : '29px';
        document.getElementById('mega-panel').innerHTML = window.__megaOpen
          ? '<div style="padding:' + megaPad + '">Mega panel content</div>'
          : '';

        // Route-like swap -- hides most of the page and replaces it with unrelated content,
        // simulating a same-page "route" change rather than a localised interactive state.
        const ids = ['root', 'cards', 'tabs', 'tabpanel', 'step-area'];
        if (window.__routed) {
          document.getElementById('mainarea').innerHTML =
            '<h1>Totally different page</h1><p>Alpha</p><p>Bravo</p><p>Charlie</p><p>Delta</p><p>Echo</p><p>Foxtrot</p><p>Golf</p><p>Hotel</p>';
          ids.forEach(function (id) { document.getElementById(id).style.display = 'none'; });
        } else {
          document.getElementById('mainarea').innerHTML = '';
          ids.forEach(function (id) { document.getElementById(id).style.display = ''; });
        }
      }
      window.addEventListener('resize', render);
      render();
    </script>
  </body></html>`;
  fs.writeFileSync(fixturePath, html, 'utf8');
  try {
    const report = await probe(pathToFileURL(fixturePath).href, [375, 1440], 'self-test');
    const responsive = report.elements.find((e) => e.key.includes('responsive item'));
    const staticEl = report.elements.find((e) => e.key.includes('static item'));
    if (!responsive) throw new Error('SELF-TEST FAILED: the genuinely responsive element was not detected');
    if (!responsive.changed_properties.includes('padding-top')) throw new Error(`SELF-TEST FAILED: expected padding-top in changed_properties, got ${responsive.changed_properties}`);
    if (staticEl) throw new Error('SELF-TEST FAILED (negative control): the static element must NOT appear in the responsive-elements output');

    const cardEls = report.elements.filter((e) => e.group_signature === 'div>h3,p');
    if (cardEls.length !== 4) throw new Error(`SELF-TEST FAILED: expected 4 card-group members detected, got ${cardEls.length}`);
    for (const c of cardEls) {
      if (c.group_size !== 4) throw new Error(`SELF-TEST FAILED: expected group_size=4, got ${c.group_size} for key=${c.key}`);
      if (!c.changed_properties.includes('padding-top')) throw new Error(`SELF-TEST FAILED: card ${c.key} should show a changed padding-top`);
    }

    // Default (no --click) run must never see the drawer content -- it doesn't exist in
    // the DOM until clicked (sc-if-style conditional mount, matching the real draft).
    const drawerBeforeClick = report.elements.find((e) => e.key.includes('drawer content'));
    if (drawerBeforeClick) throw new Error('SELF-TEST FAILED: drawer content must be absent from a default (unclicked) capture');
    if (report.interaction.clicked.length !== 0) throw new Error(`SELF-TEST FAILED: default run must report interaction.clicked=[], got ${JSON.stringify(report.interaction.clicked)}`);

    // Route-coverage proof-of-concept: --click drives the interaction, then the drawer's
    // OWN responsive value is measured, exactly like the real "Bag" drawer.
    const clickedReport = await probe(pathToFileURL(fixturePath).href, [375, 1440], 'self-test-clicked', ['#open-drawer']);
    if (JSON.stringify(clickedReport.interaction.clicked) !== JSON.stringify(['#open-drawer'])) {
      throw new Error(`SELF-TEST FAILED: expected interaction.clicked=['#open-drawer'], got ${JSON.stringify(clickedReport.interaction.clicked)}`);
    }
    const drawerAfterClick = clickedReport.elements.find((e) => e.key.includes('drawer content'));
    if (!drawerAfterClick) throw new Error('SELF-TEST FAILED: drawer content must be measured once --click opens it');
    if (!drawerAfterClick.changed_properties.includes('padding-top')) throw new Error(`SELF-TEST FAILED: drawer content should show a changed padding-top, got ${drawerAfterClick.changed_properties}`);

    // Negative control: a --click selector that matches nothing must fail LOUDLY, never
    // silently capture the default state while claiming to have driven an interaction.
    let threw = false;
    try {
      await probe(pathToFileURL(fixturePath).href, [375, 1440], 'self-test-bad-selector', ['#does-not-exist']);
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error('SELF-TEST FAILED (negative control): a --click selector matching zero elements must throw, not silently no-op');

    // --- --auto-detect: boolean toggle + enum-derived-boolean (tabs) + risky-skip + route-
    // change classification, at this run's default --max-depth (2). ---
    const autoReport = await autoDetect(pathToFileURL(fixturePath).href, [375, 1440], 2);

    const drawerState = autoReport.states.find((s) => s.trigger.includes('Open drawer'));
    if (!drawerState) throw new Error('SELF-TEST FAILED: --auto-detect did not discover/drive the boolean-toggle "Open drawer" button');
    const drawerContentEl = drawerState.elements.find((e) => e.key.includes('drawer content'));
    if (!drawerContentEl || !drawerContentEl.changed_properties.includes('padding-top')) {
      throw new Error('SELF-TEST FAILED: auto-detected drawer state did not capture the drawer content\'s responsive padding');
    }

    // Tab A is the DEFAULT selection (aria-selected="true" from page load), so clicking it is
    // a genuine no-op -- correctly NOT reported as a state (the baseline capture already
    // covers Tab A's content; --auto-detect must not spam a report with no-op clicks). Tab B
    // is the reachable DERIVED state and must be captured -- this is the enum-derived-boolean
    // shape (tabs / a mega-menu / a modal) proven for real.
    const tabBState = autoReport.states.find((s) => s.trigger.includes('Tab B'));
    if (!tabBState) throw new Error('SELF-TEST FAILED: --auto-detect did not drive "Tab B" (enum-derived-boolean shape)');
    const tabBPanel = tabBState.elements.find((e) => e.key.includes('tab b panel content'));
    if (!tabBPanel || !tabBPanel.changed_properties.includes('padding-top')) {
      throw new Error('SELF-TEST FAILED: auto-detected Tab B state did not capture its panel\'s responsive padding');
    }
    const tabAState = autoReport.states.find((s) => s.trigger === 'button [role=tab] "Tab A"');
    if (tabAState) throw new Error('SELF-TEST FAILED: clicking the already-selected default "Tab A" produced no DOM change and must not be reported as a driven state');

    const megaHoverState = autoReport.states.find((s) => s.trigger.includes('Menu') && s.trigger.includes('[hover]'));
    if (!megaHoverState) throw new Error('SELF-TEST FAILED: --auto-detect did not try HOVER on the nav-scoped aria-haspopup "Menu" trigger (the real draft\'s mega-menu is hover-only)');
    const megaPanelEl = megaHoverState.elements.find((e) => e.key.includes('mega panel content'));
    if (!megaPanelEl || !megaPanelEl.changed_properties.includes('padding-top')) {
      throw new Error('SELF-TEST FAILED: auto-detected hover state did not capture the mega panel\'s responsive padding');
    }

    const payNowSkip = autoReport.skipped_for_safety.find((s) => s.trigger.includes('Pay now'));
    if (!payNowSkip) throw new Error('SELF-TEST FAILED: "Pay now" must be classified unsafe and listed in skipped_for_safety');
    const payNowState = autoReport.states.find((s) => s.trigger.includes('Pay now'));
    if (payNowState) throw new Error('SELF-TEST FAILED (negative control): "Pay now" must NEVER be clicked/driven -- it appeared in states');

    const routeGap = autoReport.gaps.find((g) => g.type === 'route-change-suspected' && g.trigger.includes('Go elsewhere'));
    if (!routeGap) throw new Error('SELF-TEST FAILED: the route-like "Go elsewhere" swap must be classified route-change-suspected, not driven as a state');
    const routeState = autoReport.states.find((s) => s.trigger.includes('Go elsewhere'));
    if (routeState) throw new Error('SELF-TEST FAILED (negative control): a route-like full-page swap must NEVER be captured as an interactive state');

    // Nested 3-step flow, max-depth=2: step1 -> step2 is reachable (depth 2), but the
    // responsive payload behind step3 (depth 3) exceeds the cap -- must be an HONEST gap,
    // never silently missing.
    const step2State = autoReport.states.find((s) => s.trigger.includes('Open step 1') && s.trigger.includes('Open step 2'));
    if (!step2State) throw new Error('SELF-TEST FAILED: nested step1 -> step2 (depth 2) should be reachable at max-depth=2');
    const depthGap = autoReport.gaps.find((g) => g.type === 'depth-cap-reached' && g.trigger.includes('Open step 2'));
    if (!depthGap) throw new Error('SELF-TEST FAILED: step3 (depth 3) must be reported as depth-cap-reached when max-depth=2, never silently dropped');
    const step3State = autoReport.states.find((s) => s.trigger.includes('Open step 3'));
    if (step3State) throw new Error('SELF-TEST FAILED: step3 should NOT be reachable at max-depth=2 -- if this fires, the depth cap is not being enforced');

    // Same nested flow with --max-depth 3 -- the tool DOES reach it when given enough depth,
    // proving the cap is the only thing standing between "gap" and "captured", not a hard
    // architectural limit.
    const autoReportDeep = await autoDetect(pathToFileURL(fixturePath).href, [375, 1440], 3);
    const step3StateDeep = autoReportDeep.states.find((s) => s.trigger.includes('Open step 3'));
    if (!step3StateDeep) throw new Error('SELF-TEST FAILED: with --max-depth 3 the nested step3 payload should be reached and captured');
    const nestedFinalEl = step3StateDeep.elements.find((e) => e.key.includes('nested final content'));
    if (!nestedFinalEl || !nestedFinalEl.changed_properties.includes('padding-top')) {
      throw new Error('SELF-TEST FAILED: step3\'s responsive final content was not captured at --max-depth 3');
    }

    console.log('draft-responsive-probe.js self-test: PASS (responsive element detected, static element excluded, 4-card structural group detected, route-coverage --click proven, bad-selector negative control, --auto-detect: boolean toggle + derived-enum tab state [default no-op correctly unreported] + hover-only trigger + risky-skip + route-change classification + honest depth-cap gap + deeper reach at higher --max-depth)');
  } finally {
    fs.unlinkSync(fixturePath);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
