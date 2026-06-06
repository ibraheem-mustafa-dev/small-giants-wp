#!/usr/bin/env node
/**
 * clone-parity.js  — Deterministic draft-vs-clone computed-style differ
 *
 * Usage:
 *   node clone-parity.js [options]
 *
 * Options:
 *   --url <url>           Clone URL  (default: sandybrown homepage)
 *   --draft <path>        Draft HTML (default: sites/mamas-munches/mockups/homepage/index.html)
 *   --golden <path>       Golden baseline JSON (default: sites/mamas-munches/mockups/homepage/.parity-golden.json)
 *   --rebuild-golden      Rebuild golden baseline from draft (ignore existing)
 *   --out-dir <path>      Output directory for reports (default: .claude/reports)
 *   --viewports <list>    Comma-separated widths (default: 375,768,1440)
 *   --skip-clone          Only (re)build golden; skip clone fetch
 *   --help
 *
 * Exits 0 on all-PASS, 1 on any FAIL.
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const url_mod = require('url');

// ── Locate playwright ──────────────────────────────────────────────────────
let chromium;
const CANDIDATES = [
  'C:/Users/Bean/node_modules/playwright',
  path.join(__dirname, '../../../node_modules/playwright'),
  'playwright',
];
for (const c of CANDIDATES) {
  try { ({ chromium } = require(c)); break; } catch {}
}
if (!chromium) {
  console.error('ERROR: playwright not found. Tried:', CANDIDATES.join(', '));
  process.exit(2);
}

// ── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : def;
}
function hasFlag(name) { return args.includes(name); }

if (hasFlag('--help')) {
  console.log(`Usage: node clone-parity.js [--url URL] [--draft PATH] [--golden PATH]
       [--rebuild-golden] [--out-dir DIR] [--viewports 375,768,1440]
       [--skip-clone] [--help]`);
  process.exit(0);
}

const REPO_ROOT   = path.resolve(__dirname, '../../..');
const DRAFT_HTML  = getArg('--draft',  path.join(REPO_ROOT, 'sites/mamas-munches/mockups/homepage/index.html'));
const GOLDEN_JSON = getArg('--golden', path.join(REPO_ROOT, 'sites/mamas-munches/mockups/homepage/.parity-golden.json'));
const CLONE_URL   = getArg('--url',    'https://sandybrown-nightingale-600381.hostingersite.com/');
const OUT_DIR     = getArg('--out-dir', path.join(REPO_ROOT, '.claude/reports'));
const REBUILD     = hasFlag('--rebuild-golden');
const SKIP_CLONE  = hasFlag('--skip-clone');
const VIEWPORTS   = getArg('--viewports', '375,768,1440').split(',').map(Number);

// ── Thresholds ─────────────────────────────────────────────────────────────
const PX_TOLERANCE     = 1;      // px difference allowed
const COLOR_DELTA_E    = 2;      // ΔE* for text/brand colours
const LARGE_COLOR_DE   = 5;      // ΔE* for large decorative areas
const TEXT_CLASSES = /button|heading|label|text|price|description|sub|intro|tagline|quote|author|attribution|meta|col|disclaimer/i;

// ── Extended property set (per methodology doc) ────────────────────────────
const TYPOGRAPHY_PROPS = [
  'fontFamily','fontSize','fontWeight','fontStyle',
  'lineHeight','letterSpacing','textAlign','color',
  'textDecoration','verticalAlign','fontVariant',
  'textTransform',
];
const BG_PROPS = [
  'backgroundColor','backgroundImage','backgroundSize',
  'backgroundPosition','backgroundRepeat','backgroundAttachment',
];
const SPACING_PROPS = [
  'paddingTop','paddingRight','paddingBottom','paddingLeft',
  'marginTop','marginRight','marginBottom','marginLeft',
];
const BORDER_PROPS = [
  'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
  'borderStyle','borderColor','borderRadius',
  'borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius',
];
const LAYOUT_PROPS = [
  'display','gridTemplateColumns','gridTemplateRows',
  'gap','columnGap','rowGap',
  'alignItems','justifyContent','flexWrap','flexDirection',
  'width','maxWidth','minHeight','height',
];
const EFFECT_PROPS = ['boxShadow','opacity','filter','mixBlendMode'];
const IMAGE_PROPS  = ['objectFit','objectPosition']; // + naturalWidth checked separately

const ALL_PROPS = [
  ...TYPOGRAPHY_PROPS,
  ...BG_PROPS,
  ...SPACING_PROPS,
  ...BORDER_PROPS,
  ...LAYOUT_PROPS,
  ...EFFECT_PROPS,
  ...IMAGE_PROPS,
];

// ── WP/block wrapper class patterns to SKIP in clone matching ─────────────
const SKIP_CLASSES = /^(wp-block-|wp-container-|entry-content|is-layout-|has-global-padding|alignfull|alignwide)$/;

// ── Colour utilities ───────────────────────────────────────────────────────
function parseRgb(str) {
  if (!str) return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}
function rgbToLab(rgb) {
  // sRGB → linear → XYZ → Lab
  let [r, g, b] = rgb.map(c => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16/116; }
  const L = 116 * f(Y / 1.00000) - 16;
  const a = 500 * (f(X / 0.95047) - f(Y / 1.00000));
  const bb = 200 * (f(Y / 1.00000) - f(Z / 1.08883));
  return [L, a, bb];
}
function deltaE(c1, c2) {
  if (!c1 || !c2) return 0;
  const [L1, a1, b1] = rgbToLab(c1);
  const [L2, a2, b2] = rgbToLab(c2);
  return Math.sqrt((L1-L2)**2 + (a1-a2)**2 + (b1-b2)**2);
}
function colorDiff(prop, v1, v2) {
  if (v1 === v2) return 0;
  const r1 = parseRgb(v1), r2 = parseRgb(v2);
  if (!r1 || !r2) return v1 === v2 ? 0 : Infinity; // different non-color strings
  return deltaE(r1, r2);
}

// ── Numeric diff ───────────────────────────────────────────────────────────
function numericDiff(v1, v2) {
  const n1 = parseFloat(v1), n2 = parseFloat(v2);
  if (isNaN(n1) || isNaN(n2)) return v1 === v2 ? 0 : Infinity;
  return Math.abs(n1 - n2);
}

// ── Is value "none/empty/zero"? ────────────────────────────────────────────
function isNoneOrZero(v) {
  if (!v || v === 'none' || v === 'normal' || v === '0px' || v === '0') return true;
  return false;
}

// ── Decide if a property diff is a FAIL ───────────────────────────────────
function isPropFail(prop, draftVal, cloneVal) {
  if (draftVal === cloneVal) return false;
  const propLower = prop.toLowerCase();
  // colour props
  if (propLower.includes('color') || propLower === 'backgroundimage') {
    // backgroundImage: compare presence of gradient/none
    if (propLower === 'backgroundimage') {
      const dNone = isNoneOrZero(draftVal) || draftVal === 'none';
      const cNone = isNoneOrZero(cloneVal) || cloneVal === 'none';
      if (dNone && cNone) return false;
      if (dNone !== cNone) return true; // one has gradient, other doesn't
      // both have images — compare loosely (gradients differ by token resolution)
      // If both contain 'linear-gradient' or 'url(' treat as informational not FAIL
      const dGrad = draftVal.includes('linear-gradient') || draftVal.includes('url(');
      const cGrad = cloneVal.includes('linear-gradient') || cloneVal.includes('url(');
      return dGrad !== cGrad;
    }
    // colour ΔE
    const threshold = TEXT_CLASSES.test(prop) ? COLOR_DELTA_E : LARGE_COLOR_DE;
    const de = colorDiff(prop, draftVal, cloneVal);
    return de > threshold;
  }
  // numeric px props
  if (propLower.includes('width') || propLower.includes('height') || propLower.includes('padding') ||
      propLower.includes('margin') || propLower.includes('gap') || propLower.includes('radius') ||
      propLower === 'fontsize' || propLower === 'letterspacing' || propLower === 'lineheight') {
    const d = numericDiff(draftVal, cloneVal);
    return d > PX_TOLERANCE;
  }
  // exact string comparison for enums
  // be lenient on fontFamily (we only care if it's a completely different face)
  if (propLower === 'fontfamily') {
    const family1 = draftVal.split(',')[0].trim().replace(/["']/g,'').toLowerCase();
    const family2 = cloneVal.split(',')[0].trim().replace(/["']/g,'').toLowerCase();
    return family1 !== family2;
  }
  return draftVal !== cloneVal;
}

// ── DOM walk via page.evaluate ─────────────────────────────────────────────
async function captureElements(page, { isClone = false } = {}) {
  await page.evaluate(async () => {
    // scroll to bottom to trigger lazy-load
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
    // wait for fonts
    try { await document.fonts.ready; } catch {}
  });

  const elements = await page.evaluate((params) => {
    const { ALL_PROPS, SKIP_CLASSES_re } = params;
    const skipRe = new RegExp(SKIP_CLASSES_re);
    const results = [];

    function normPath(el) {
      // Build normalised DOM path: tag + index among siblings of same tag,
      // ignoring wp-block-* wrapper divs
      const parts = [];
      let cur = el;
      while (cur && cur !== document.body) {
        let tag = cur.tagName ? cur.tagName.toLowerCase() : '#text';
        // skip WP wrapper nodes in path
        const cls = cur.className || '';
        const hasSkip = typeof cls === 'string' && cls.split(' ').some(c => skipRe.test(c));
        if (!hasSkip) {
          const siblings = cur.parentElement
            ? [...cur.parentElement.children].filter(s =>
                s.tagName === cur.tagName &&
                !(typeof s.className === 'string' && s.className.split(' ').some(c => skipRe.test(c)))
              )
            : [cur];
          const idx = siblings.indexOf(cur);
          parts.unshift(`${tag}[${idx}]`);
        }
        cur = cur.parentElement;
      }
      return parts.join('>');
    }

    function getSgsClasses(el) {
      const cls = typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
      return cls.split(' ').filter(c => c.startsWith('sgs-')).sort().join(' ');
    }

    function getProps(el) {
      const cs = window.getComputedStyle(el);
      const out = {};
      for (const p of ALL_PROPS) {
        out[p] = cs[p] || '';
      }
      // also get pseudo ::before and ::after background for badge/icon checks
      try {
        const before = window.getComputedStyle(el, '::before');
        out['_before_content']    = before.content;
        out['_before_background'] = before.backgroundImage;
        const after = window.getComputedStyle(el, '::after');
        out['_after_content']     = after.content;
        out['_after_background']  = after.backgroundImage;
      } catch {}
      return out;
    }

    function getRect(el) {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }

    function walk(el, sectionName, depth) {
      if (!el || el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      const cls = typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
      const sgsClasses = getSgsClasses(el);
      const isSkip     = cls.split(' ').some(c => skipRe.test(c));

      // Determine section (top-level block)
      if (depth === 1) {
        if (sgsClasses) sectionName = sgsClasses.split(' ')[0];
      }

      if (sgsClasses) {
        const props = getProps(el);
        const rect  = getRect(el);
        const textContent = el.textContent ? el.textContent.trim().slice(0, 120) : '';
        const domPath = normPath(el);

        const item = {
          sgsClasses,
          tag,
          text: textContent,
          section: sectionName,
          depth,
          domPath,
          rect,
          props,
        };

        // image-specific
        if (tag === 'img') {
          item.naturalWidth  = el.naturalWidth;
          item.naturalHeight = el.naturalHeight;
          item.src = el.src ? el.src.slice(0, 200) : '';
        }

        // font-loaded check
        item.fontsLoaded = [...document.fonts]
          .filter(f => f.status === 'loaded')
          .map(f => f.family.replace(/["']/g, '').toLowerCase());

        results.push(item);
      }

      // recurse
      for (const child of el.children) {
        walk(child, sectionName, depth + 1);
      }
    }

    // Walk from body
    for (const child of document.body.children) {
      walk(child, 'root', 1);
    }

    return results;
  }, {
    ALL_PROPS,
    SKIP_CLASSES_re: SKIP_CLASSES.source,
  });

  return elements;
}

// ── Section-role counter ───────────────────────────────────────────────────
function countByRole(elements) {
  // Count headings, images, buttons, links per section
  const counts = {};
  for (const el of elements) {
    const section = el.section || 'root';
    if (!counts[section]) counts[section] = { headings: 0, images: 0, buttons: 0, links: 0, sgsElements: 0 };
    counts[section].sgsElements++;
    if (['h1','h2','h3','h4','h5','h6'].includes(el.tag)) counts[section].headings++;
    if (el.tag === 'img') counts[section].images++;
    if (el.tag === 'button' || el.sgsClasses.includes('button')) counts[section].buttons++;
    if (el.tag === 'a') counts[section].links++;
  }
  return counts;
}

// ── Match draft element → clone element ───────────────────────────────────
function matchElements(draftEls, cloneEls) {
  // Build lookup: sgsClasses → list of clone elements
  const byClass = {};
  for (const el of cloneEls) {
    (byClass[el.sgsClasses] = byClass[el.sgsClasses] || []).push(el);
  }
  // Track clone usage to avoid double-matching when multiple elements share a class
  const cloneUsed = new Set();

  const pairs = [];
  const unmatched = [];

  for (const draft of draftEls) {
    const key = draft.sgsClasses;
    const candidates = (byClass[key] || []).filter((_, i, arr) => !cloneUsed.has(`${key}__${i}`));
    if (candidates.length > 0) {
      // Pick best candidate by domPath similarity
      let best = candidates[0];
      let bestScore = -Infinity;
      for (let i = 0; i < candidates.length; i++) {
        if (cloneUsed.has(`${key}__${(byClass[key]||[]).indexOf(candidates[i])}`)) continue;
        const score = pathSimilarity(draft.domPath, candidates[i].domPath);
        if (score > bestScore) { bestScore = score; best = candidates[i]; }
      }
      const idx = (byClass[key] || []).indexOf(best);
      cloneUsed.add(`${key}__${idx}`);
      pairs.push({ draft, clone: best });
    } else {
      unmatched.push(draft);
    }
  }

  return { pairs, unmatched };
}

function pathSimilarity(p1, p2) {
  // Simple token overlap score
  const t1 = p1.split('>');
  const t2 = p2.split('>');
  const set2 = new Set(t2);
  return t1.filter(t => set2.has(t)).length;
}

// ── Diff a matched pair ────────────────────────────────────────────────────
function diffPair(draft, clone, viewport) {
  const failures = [];

  // image: if draft image 404 (naturalWidth 0), skip dimension check
  const draftImg404 = draft.tag === 'img' && draft.naturalWidth === 0;

  for (const prop of ALL_PROPS) {
    const dv = draft.props[prop] || '';
    const cv = clone ? (clone.props[prop] || '') : '';
    if (!clone) {
      failures.push({ prop, draft: dv, clone: 'MISSING', reason: 'element not in clone' });
      continue;
    }
    // Skip dimension checks if draft image is 404
    if (draftImg404 && (prop === 'width' || prop === 'height' || prop === 'maxWidth' || prop === 'minHeight')) continue;
    if (isPropFail(prop, dv, cv)) {
      failures.push({ prop, draft: dv, clone: cv });
    }
  }

  // naturalWidth check (only if draft image loaded)
  if (draft.tag === 'img' && !draftImg404 && clone) {
    if (clone.naturalWidth === 0) {
      failures.push({ prop: 'naturalWidth', draft: draft.naturalWidth, clone: 0, reason: 'clone image 404 or unloaded' });
    }
  }

  // font-loaded check
  if (clone) {
    const dFonts = new Set((draft.fontsLoaded || []).map(f => f.toLowerCase()));
    const cFonts = new Set((clone.fontsLoaded || []).map(f => f.toLowerCase()));
    for (const fam of dFonts) {
      if (!cFonts.has(fam)) {
        failures.push({ prop: 'fontLoaded', draft: fam, clone: 'NOT LOADED', reason: 'font family missing in clone' });
      }
    }
  }

  return failures;
}

// ── Run one viewport ───────────────────────────────────────────────────────
async function runViewport(browser, viewport, draftGolden, cloneUrl, skipClone) {
  const ctx = await browser.newContext({
    viewport: { width: viewport, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const results = { viewport, pairs: [], unmatched: [] };

  // ── Draft (from golden or live) ────────────────────────────────────────
  let draftEls = draftGolden[viewport];
  if (!draftEls) {
    console.log(`  [draft] capturing at ${viewport}px...`);
    const dPage = await ctx.newPage();
    const draftFileUrl = `file:///${DRAFT_HTML.replace(/\\/g, '/')}`;
    await dPage.goto(draftFileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    draftEls = await captureElements(dPage);
    await dPage.close();
    draftGolden[viewport] = draftEls;
  }

  if (skipClone) {
    await ctx.close();
    return { viewport, draftEls, cloneEls: null };
  }

  // ── Clone ──────────────────────────────────────────────────────────────
  console.log(`  [clone] capturing ${cloneUrl} at ${viewport}px...`);
  const cPage = await ctx.newPage();
  try {
    await cPage.goto(cloneUrl, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.warn(`  WARNING: clone page load timeout/error at ${viewport}px: ${e.message}`);
  }
  const cloneEls = await captureElements(cPage, { isClone: true });
  await cPage.close();
  await ctx.close();

  // ── Match + diff ───────────────────────────────────────────────────────
  const { pairs, unmatched } = matchElements(draftEls, cloneEls);

  const pairResults = pairs.map(({ draft, clone }) => {
    const failures = diffPair(draft, clone, viewport);
    return {
      sgsClasses:  draft.sgsClasses,
      tag:         draft.tag,
      section:     draft.section,
      draft_text:  draft.text.slice(0, 60),
      domPath:     draft.domPath,
      passed:      failures.length === 0,
      failures,
      draft_img_404: draft.tag === 'img' && draft.naturalWidth === 0,
      clone_img_404: clone && draft.tag === 'img' && clone.naturalWidth === 0 && draft.naturalWidth > 0,
    };
  });

  const unmatchedResults = unmatched.map(draft => ({
    sgsClasses: draft.sgsClasses,
    tag:        draft.tag,
    section:    draft.section,
    draft_text: draft.text.slice(0, 60),
    domPath:    draft.domPath,
    passed:     false,
    failures:   [{ prop: 'ELEMENT', draft: 'present', clone: 'MISSING', reason: 'no clone counterpart found' }],
  }));

  return {
    viewport,
    draftEls,
    cloneEls,
    pairResults: [...pairResults, ...unmatchedResults],
    draftCounts: countByRole(draftEls),
    cloneCounts: cloneEls ? countByRole(cloneEls) : {},
  };
}

// ── Build markdown report ──────────────────────────────────────────────────
function buildMarkdownReport(allViewportResults, runDate) {
  const lines = [];
  lines.push(`# Clone Parity Report — ${runDate}`);
  lines.push(`Clone URL: ${CLONE_URL}`);
  lines.push(`Draft: ${DRAFT_HTML}`);
  lines.push('');

  // ── Summary table ─────────────────────────────────────────────────────
  let totalPass = 0, totalFail = 0, totalMissing = 0;
  const summaryRows = [];
  for (const { viewport, pairResults, draftEls, cloneEls, draftCounts, cloneCounts } of allViewportResults) {
    if (!pairResults) continue;
    const pass = pairResults.filter(r => r.passed).length;
    const fail = pairResults.filter(r => !r.passed && !r.failures.some(f => f.prop === 'ELEMENT')).length;
    const miss = pairResults.filter(r => r.failures.some(f => f.prop === 'ELEMENT')).length;
    totalPass += pass; totalFail += fail; totalMissing += miss;
    summaryRows.push({ viewport, pass, fail, miss, total: pairResults.length });
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| Viewport | Total | ✅ Pass | ❌ Fail | ⚠ Missing |');
  lines.push('|---------|-------|---------|---------|----------|');
  for (const r of summaryRows) {
    const pct = r.total ? Math.round(100 * r.pass / r.total) : 0;
    lines.push(`| ${r.viewport}px | ${r.total} | ${r.pass} (${pct}%) | ${r.fail} | ${r.miss} |`);
  }
  lines.push('');

  // ── Per-viewport detail ────────────────────────────────────────────────
  for (const { viewport, pairResults, draftCounts, cloneCounts } of allViewportResults) {
    if (!pairResults) continue;
    lines.push(`---`);
    lines.push(`## Viewport: ${viewport}px`);
    lines.push('');

    // Element counts by section
    const sections = new Set([...Object.keys(draftCounts||{}), ...Object.keys(cloneCounts||{})]);
    if (sections.size > 0) {
      lines.push('### Element counts by section');
      lines.push('');
      lines.push('| Section | Draft SGS-els | Clone SGS-els | Draft imgs | Clone imgs | Draft btns | Clone btns |');
      lines.push('|---------|--------------|--------------|-----------|-----------|-----------|-----------|');
      for (const sec of [...sections].sort()) {
        const d = draftCounts[sec] || {};
        const c = cloneCounts[sec] || {};
        const rowFail = (d.sgsElements||0) !== (c.sgsElements||0) || (d.images||0) !== (c.images||0);
        const flag = rowFail ? ' ⚠' : '';
        lines.push(`| ${sec}${flag} | ${d.sgsElements||0} | ${c.sgsElements||0} | ${d.images||0} | ${c.images||0} | ${d.buttons||0} | ${c.buttons||0} |`);
      }
      lines.push('');
    }

    // Per-element results grouped by section
    const bySec = {};
    for (const r of pairResults) {
      (bySec[r.section] = bySec[r.section] || []).push(r);
    }
    for (const [sec, rows] of Object.entries(bySec).sort()) {
      const secFail = rows.filter(r => !r.passed).length;
      lines.push(`### Section: \`${sec}\` ${secFail > 0 ? `(${secFail} FAIL)` : '✅'}`);
      lines.push('');
      for (const r of rows) {
        const status = r.passed ? '✅' : '❌';
        const img404note = r.draft_img_404 ? ' *(draft img 404 — dims skipped)*' : (r.clone_img_404 ? ' *(clone img 404)*' : '');
        lines.push(`${status} \`.${r.sgsClasses}\` \`<${r.tag}>\`${img404note}`);
        if (!r.passed) {
          for (const f of r.failures.slice(0, 8)) {
            const dv = String(f.draft).slice(0, 80);
            const cv = String(f.clone).slice(0, 80);
            lines.push(`   - **${f.prop}**: draft=\`${dv}\` → clone=\`${cv}\`${f.reason ? ` *(${f.reason})*` : ''}`);
          }
          if (r.failures.length > 8) {
            lines.push(`   - *...${r.failures.length - 8} more failures*`);
          }
        }
      }
      lines.push('');
    }
  }

  // ── Transfer summary per BEM class ────────────────────────────────────
  lines.push('---');
  lines.push('## Per-BEM-class transfer summary (1440px)');
  lines.push('');
  const vp1440 = allViewportResults.find(r => r.viewport === 1440);
  if (vp1440 && vp1440.pairResults) {
    lines.push('| BEM class | Status | Failure count |');
    lines.push('|-----------|--------|--------------|');
    const byClass = {};
    for (const r of vp1440.pairResults) {
      const k = r.sgsClasses;
      if (!byClass[k]) byClass[k] = { pass: 0, fail: 0, missing: 0, failProps: new Set() };
      if (r.passed) byClass[k].pass++;
      else if (r.failures.some(f => f.prop === 'ELEMENT')) byClass[k].missing++;
      else { byClass[k].fail++; r.failures.forEach(f => byClass[k].failProps.add(f.prop)); }
    }
    for (const [cls, v] of Object.entries(byClass).sort()) {
      let status, failCount;
      if (v.missing > 0) { status = '⚠ MISSING'; failCount = v.missing; }
      else if (v.fail > 0) { status = '❌ MISMATCH'; failCount = `${v.fail} (props: ${[...v.failProps].slice(0,4).join(', ')})`; }
      else { status = '✅ PASS'; failCount = '—'; }
      lines.push(`| \`.${cls}\` | ${status} | ${failCount} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const runDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  console.log(`\n=== Clone Parity Verifier ===`);
  console.log(`Draft:   ${DRAFT_HTML}`);
  console.log(`Clone:   ${CLONE_URL}`);
  console.log(`Viewports: ${VIEWPORTS.join(', ')}px`);
  console.log(`Golden:  ${GOLDEN_JSON}`);
  console.log(`Rebuild: ${REBUILD}`);
  console.log('');

  // Load or init golden baseline
  let draftGolden = {};
  if (!REBUILD && fs.existsSync(GOLDEN_JSON)) {
    console.log('Loading existing golden baseline...');
    draftGolden = JSON.parse(fs.readFileSync(GOLDEN_JSON, 'utf8'));
    console.log(`  Viewports cached: ${Object.keys(draftGolden).join(', ')}`);
  } else {
    if (REBUILD) console.log('Rebuilding golden baseline...');
    else console.log('No golden baseline found — will build from draft.');
  }

  const browser = await chromium.launch({ headless: true });
  const allViewportResults = [];

  for (const viewport of VIEWPORTS) {
    console.log(`\n── Viewport ${viewport}px ──────────────────────`);
    const result = await runViewport(browser, viewport, draftGolden, CLONE_URL, SKIP_CLONE);
    allViewportResults.push(result);
  }

  await browser.close();

  // Save updated golden baseline
  const needsSave = REBUILD || !fs.existsSync(GOLDEN_JSON) ||
    VIEWPORTS.some(v => !JSON.parse(fs.readFileSync(GOLDEN_JSON, 'utf8') || '{}')[v]);
  if (needsSave || REBUILD) {
    fs.writeFileSync(GOLDEN_JSON, JSON.stringify(draftGolden, null, 2));
    console.log(`\nGolden baseline saved → ${GOLDEN_JSON}`);
  }

  if (SKIP_CLONE) {
    console.log('\n--skip-clone flag set; golden built, exiting.');
    process.exit(0);
  }

  // ── Build machine JSON ───────────────────────────────────────────────
  const dateSlug = new Date().toISOString().slice(0, 10);
  const jsonOutPath = path.join(OUT_DIR, `clone-parity-${dateSlug}.json`);
  const mdOutPath   = path.join(OUT_DIR, `clone-parity-${dateSlug}.md`);

  const jsonOut = {
    runDate,
    cloneUrl: CLONE_URL,
    draft: DRAFT_HTML,
    thresholds: { PX_TOLERANCE, COLOR_DELTA_E, LARGE_COLOR_DE },
    viewports: allViewportResults.map(r => ({
      viewport: r.viewport,
      totalElements: r.pairResults ? r.pairResults.length : 0,
      passed: r.pairResults ? r.pairResults.filter(x => x.passed).length : 0,
      failed: r.pairResults ? r.pairResults.filter(x => !x.passed).length : 0,
      pairResults: r.pairResults || [],
      draftCounts: r.draftCounts || {},
      cloneCounts: r.cloneCounts || {},
    })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(jsonOut, null, 2));
  console.log(`\nJSON report → ${jsonOutPath}`);

  const mdContent = buildMarkdownReport(allViewportResults, runDate);
  fs.writeFileSync(mdOutPath, mdContent);
  console.log(`Markdown report → ${mdOutPath}`);

  // ── Exit code ────────────────────────────────────────────────────────
  const anyFail = allViewportResults.some(r =>
    r.pairResults && r.pairResults.some(p => !p.passed)
  );

  // Console summary
  console.log('\n── Results ─────────────────────────────────');
  for (const r of allViewportResults) {
    if (!r.pairResults) continue;
    const pass = r.pairResults.filter(x => x.passed).length;
    const fail = r.pairResults.filter(x => !x.passed).length;
    const total = r.pairResults.length;
    console.log(`  ${r.viewport}px: ${pass}/${total} PASS  (${fail} FAIL)`);
  }

  // Print first 15 failures for quick triage
  const vp1440 = allViewportResults.find(r => r.viewport === 1440);
  if (vp1440 && vp1440.pairResults) {
    const fails = vp1440.pairResults.filter(r => !r.passed);
    if (fails.length > 0) {
      console.log(`\n── First 15 failures at 1440px ────────────`);
      fails.slice(0, 15).forEach(r => {
        console.log(`  [${r.section}] .${r.sgsClasses} <${r.tag}>`);
        r.failures.slice(0, 3).forEach(f => {
          console.log(`     ${f.prop}: "${String(f.draft).slice(0,50)}" → "${String(f.clone).slice(0,50)}"`);
        });
      });
      if (fails.length > 15) console.log(`  ... ${fails.length - 15} more`);
    }
  }

  console.log(`\nOverall: ${anyFail ? 'FAIL ❌' : 'PASS ✅'}`);
  process.exit(anyFail ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
