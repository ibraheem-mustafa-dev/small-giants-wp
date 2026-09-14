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
 * NOT DONE HERE (named gap, not silently dropped): identity correlation back to Piece 1's
 * sc-for/sc-if boundaries. Verified live before writing this file that `<sc-for>`/`<sc-if>`
 * do NOT survive rendering -- the runtime materialises them away entirely (measured: 0
 * custom-element tags of any kind in the rendered DOM, vs 39 `sc-for` + 87 `sc-if` in the
 * SOURCE `.dc.html`). So a rendered element cannot be asked "which sc-for wrapped you?" the
 * way Piece 1 asks the SOURCE parse tree. This script outputs responsive VALUES keyed by
 * rendered content only; matching a result here to a Piece 1 boundary (by structural DOM
 * position or content overlap) is unbuilt follow-up work, not something this file claims
 * to do.
 *
 * Usage:
 *   node draft-responsive-probe.js --draft <path|url> [--viewports 375,768,1440]
 *        [--out report.json] [--label <route-name>]
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
    out.push({ key, tag: el.tagName.toLowerCase(), css });
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

async function probe(draftUrl, viewports, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(draftUrl, { waitUntil: 'networkidle' });
  const byWidth = {};
  for (const w of viewports) {
    byWidth[w] = await captureAtWidth(page, w, true);
  }
  await browser.close();

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
    for (const w of widthKeys) {
      const el = elementsByKeyByWidth[w].get(key);
      perWidth[w] = el.css;
      tag = el.tag;
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
      changed_properties: [...changedProperties].sort(),
      values_by_width: perWidth,
    });
  }

  return {
    label,
    draft: draftUrl,
    viewports,
    elements_total_at_narrowest: byWidth[widthKeys[0]].elements.length,
    elements_present_at_all_widths: presentAtAll.size,
    responsive_elements: results.length,
    elements: results,
  };
}

async function main() {
  if (SELF_TEST) return selfTest();
  const report = await probe(DRAFT, VIEWPORTS, LABEL);
  console.log(`draft-responsive-probe: ${report.responsive_elements} responsive element(s) of ${report.elements_present_at_all_widths} present at all ${VIEWPORTS.length} widths (${report.elements_total_at_narrowest} total at the narrowest width).`);
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
    <script>
      function render() {
        const w = window.innerWidth;
        const pad = w < 700 ? '12px' : '32px';
        document.getElementById('root').innerHTML =
          '<div style="padding:' + pad + '">Responsive item</div>' +
          '<div style="padding:20px">Static item</div>';
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
    console.log('draft-responsive-probe.js self-test: PASS (responsive element detected + static element correctly excluded)');
  } finally {
    fs.unlinkSync(fixturePath);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
