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
 * Usage:
 *   node draft-responsive-probe.js --draft <path|url> [--viewports 375,768,1440]
 *        [--out report.json] [--label <route-name>] [--click <selector>[,<selector>...]]
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

  // Match elements across widths by their content key. An element present at every width
  // is a genuine same-content comparison; present-at-some-widths-only is reported
  // separately (structural change, not a property diff -- out of scope for this script,
  // which measures RESPONSIVE VALUES, not structural presence).
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
    label,
    draft: draftUrl,
    viewports,
    // Self-documenting: a report from an interaction-driven capture must never be mistaken
    // for the default (closed/unclicked) state -- empty array means "default page state,
    // nothing clicked", matching every report this script produced before --click existed.
    interaction: { clicked },
    elements_total_at_narrowest: byWidth[widthKeys[0]].elements.length,
    elements_present_at_all_widths: presentAtAll.size,
    responsive_elements: results.length,
    elements: results,
  };
}

async function main() {
  if (SELF_TEST) return selfTest();
  const report = await probe(DRAFT, VIEWPORTS, LABEL, CLICK_SELECTORS);
  const interactionNote = report.interaction.clicked.length
    ? ` (interaction: clicked ${report.interaction.clicked.join(' -> ')})`
    : '';
  console.log(`draft-responsive-probe: ${report.responsive_elements} responsive element(s) of ${report.elements_present_at_all_widths} present at all ${VIEWPORTS.length} widths (${report.elements_total_at_narrowest} total at the narrowest width)${interactionNote}.`);
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

    console.log('draft-responsive-probe.js self-test: PASS (responsive element detected, static element excluded, 4-card structural group detected, route-coverage --click proven, bad-selector negative control)');
  } finally {
    fs.unlinkSync(fixturePath);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
