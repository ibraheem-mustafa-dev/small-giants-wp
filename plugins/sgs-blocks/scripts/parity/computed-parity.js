#!/usr/bin/env node
/**
 * computed-parity.js — RELIABLE, DRAFT-AGNOSTIC clone-vs-draft parity (SGS pipeline).
 *
 * THE dependable parity method (CLAUDE.md root-cause rule 4a / STOP-42, D259 2026-07-03):
 * compare the EFFECTIVE (computed) value on the actual rendered element, matched by its
 * CONTENT — NOT source-declaration-diff (blind to inherited values) and NOT wrapper-class-
 * keying (raw <section> vs block wrapper -> false positives). Both pages render in the
 * same headless browser at each viewport.
 *
 * UNIVERSAL by design (like the converter — 2026-07-03, Bean): it does NOT allowlist a
 * hand-picked property set (that over-fits one draft). It compares EVERY computed CSS
 * property, minus a small, documented BLOCKLIST — so any property any draft uses is
 * covered automatically. The blocklist is verified to exclude nothing the converter can
 * transfer (property_suffixes: align-x, background-x, border-x, box-shadow, color, flex-x,
 * font-x, gap, grid-x, inset, left/right/bottom, object-x, opacity, order, overflow-x,
 * padding-x, position, stroke, text-x, aspect-ratio, filter, max/min, letter-spacing,
 * line-height are all KEPT).
 *
 * MEANINGFUL score (not inflated by matching defaults): a property counts only when it
 * DIFFERS between draft and clone, OR is non-default on the draft (vs a bare same-tag
 * reference element). So `draft==clone==initial` boring defaults are ignored, while a
 * differing default (e.g. base font-size 16 vs 18 on inherited text) IS caught.
 *
 * Container-dependent absolutes: grid-template-columns AND grid-template-rows both compare
 * TRACK COUNT (not resolved px — px rows are container-dependent noise, same reasoning as
 * columns); url()/gradient compare PRESENCE; rendered geometry (width/height/inline-size/
 * block-size/transform) is blocklisted (container-dependent; a documented limit — the
 * converter's fixed-height transfers show via aspect-ratio/object-fit/min-height which ARE
 * compared). SVG internals (fill/stroke) are skipped (SVG element skipped) — icon-fill is a
 * separate block control.
 *
 * Known-limitation fixes (2026-07-05, STOP-49 — the instrument is QC-able code; these make
 * it MORE truthful, not tuned to a target number):
 *   (a) Image identity: an <img> with an EMPTY alt used to be invisible to both the content-
 *       presence tier and the box-CSS tier (only alt-bearing images were collected; the
 *       boxEls anchor was 'img:'+alt, which collapses every empty-alt image onto one key).
 *       Every <img> now gets a stable identity — alt when non-empty, else 'img#'+the src
 *       basename — collected on BOTH sides and paired by that identity, so an empty-alt
 *       image still surfaces real style diffs instead of vanishing.
 *   (b) Chrome scoping: header/footer/nav ancestry used to flag ANY nesting depth as chrome.
 *       A block-local <footer>/<nav> INSIDE a section (testimonial attribution, an in-page
 *       pagination nav) is CONTENT, not chrome. Chrome now requires the header/footer/nav
 *       to be page-level — no <section>/<article>/<main> ancestor between it and <body> —
 *       OR to carry one of the already-special-cased site-chrome class tokens.
 *   (c) Box-tier fragility: (i) innerText-derived anchors now normalise Unicode whitespace
 *       (NBSP/zero-width/BOM) in addition to ASCII whitespace, so a glyph-only icon child
 *       can't inject an un-trimmed leading space that breaks exact key matching; (ii) when a
 *       descendant's 80-char anchor key collides with an already-registered ANCESTOR's key
 *       (a wrapper div whose only child is the real card), the DEEPEST/most-specific element
 *       now wins instead of first-write-wins keeping the shallow ancestor; (iii) <html> and
 *       <body> are excluded from boxEls entirely (they were never a meaningful comparison
 *       unit and only added noise).
 *   (d) grid-template-rows now gets the SAME track-count normalisation as
 *       grid-template-columns (resolved-px rows are container-dependent noise otherwise).
 *   (e) WP block-model margin artefact: the alignfull root's counter-margins
 *       (margin-left/right = -1*root padding, purely a WordPress wrapper mechanism) used to
 *       false-flag vs a static draft with no such mechanism. margin-left/margin-right are now
 *       blocklisted ONLY on elements carrying the `alignfull` class — real margin diffs on
 *       ordinary content elements still surface.
 *   (f) auto-vs-0px noise: ('auto','0px') on min-height/min-width are computed-representation
 *       twins when no constraint applies — now treated as matching, not a mismatch.
 *   (g) DUPLICATE-TEXT occurrence disambiguation (P-PARITY-DRAFT-TIER-SAMPLING, proven
 *       cause replacing a disproven '@media draft-tier sampling' theory): when the SAME
 *       normalised text appears on TWO unrelated elements (e.g. a section-heading label
 *       and a trust-bar badge both reading "Handmade in Birmingham"), first-write-wins used
 *       to silently DROP the 2nd occurrence — the real trust-bar element was never compared,
 *       and an unrelated look-alike component's CSS was reported instead under a misleading
 *       key. Proven live 2026-07-05: a non-duplicated trust-bar text already resolved its
 *       @media(min-width:1024px) tier correctly (13px->13px->14px at 375/768/1440) via real
 *       browser rendering — draft-side @media sampling was never broken. Fix: the 2nd+
 *       occurrence of a duplicate dkey (counted in document order, independently on both
 *       draft and clone) now gets its own 'key#N' slot instead of being discarded, so
 *       occurrence N on the draft pairs with occurrence N on the clone. Still matched by
 *       CONTENT only (rule 4a) — no class/wrapper keying reintroduced.
 *
 * Usage:
 *   node computed-parity.js --draft <url> --clone <url> \
 *        [--viewports 375,768,1440] [--out report.json] [--exclude <text substrings>]
 *   (serve the draft: cd sites/<client>/mockups/<page> && python -m http.server 8899)
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

// Blocklist (documented). NONE of these is a property_suffixes property the converter
// transfers EXCEPT width/height (rendered geometry; a documented limit). Vendor-prefixed
// props (start with '-') and interaction/animation timing are dropped as non-visual.
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

// In-page capture. Returns {texts, images, links, textEls, boxEls, defaults} where each
// el record = {tag, css:{prop->normalised computed value}} over ALL non-blocklisted props.
const CAPTURE_SRC = `() => {
  // Chrome = header/footer/nav ancestry or an sgs-header/sgs-footer/skip-link
  // BEM-family CLASS TOKEN on any ancestor below body (token-level, never an
  // attribute substring: the theme puts sgs-header-* classes on <body> itself,
  // which would otherwise filter the whole page — found live 2026-07-05).
  const CHROME_TAGS = { HEADER:1, FOOTER:1, NAV:1 };
  // ROOT-ONLY (fix, 2026-07-05, STOP-49): a header/footer/nav is chrome only
  // when it is PAGE-LEVEL — no real content-sectioning ancestor between it
  // and <body> — never merely "nested somewhere under a header/footer/nav
  // tag at any depth". A block-local <footer>/<nav> INSIDE a <section> (a
  // testimonial attribution, an in-page pagination nav) is CONTENT. Mirrors
  // the ledger's (declare_input.py) root-scoped chrome fix + converter/
  // entry.py's SKIP_TOP_LEVEL_TAGS semantics (root of the fragment, never a
  // descendant).
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
    // ANCHORED (D278 QC): exact class tokens only — an unanchored
    // includes('skip-link') would chrome-exclude any future class merely
    // containing the substring, silently removing real content from BOTH
    // sides of the score (STOP-49: the instrument is QC-able code).
    t === 'sgs-header__skip-link' || t === 'skip-link' ||
    t === 'wp-block-template-part';
  const inChrome = (el) => {
    for (let n = el; n && n.tagName !== 'BODY' && n.tagName !== 'HTML'; n = n.parentElement) {
      if (isPageLevelChromeTag(n)) return true;
      for (const t of (n.classList || [])) if (chromeToken(t)) return true;
    }
    return false;
  };
  // (c-i) normalise Unicode whitespace too (NBSP/zero-width-space/BOM), not just ASCII \s —
  // a glyph-only icon child can inject one of these instead of a plain space, and \\s alone
  // leaves it un-trimmed, breaking exact-key matching between draft and clone.
  const WS_RE = /[\\s\\u00A0\\u200B\\uFEFF]+/g;
  const norm = (t) => (t||'').replace(WS_RE,' ').trim().toLowerCase().replace(/[^a-z0-9 £]/g,'').slice(0,80);
  const normFull = (t) => (t||'').replace(WS_RE,' ').trim().toLowerCase().replace(/[^a-z0-9 £]/g,'');
  const BLOCK = new Set(${JSON.stringify([...BLOCK])});
  // (e) WP block-model margin artefact: an alignfull section root's counter-margins
  // (margin-left/right = -1*root padding) are a WordPress wrapper mechanism the static
  // draft never has — false-flags on nearly every full-bleed section. Blocklisted ONLY
  // for elements carrying the alignfull class; ordinary content elements still compare
  // margin-left/right normally.
  const ALIGNFULL_EXTRA_BLOCK = new Set(['margin-left', 'margin-right']);
  const LOGICAL = /(inline|block-|inset|-start|-end)/;
  const SKIP_TAGS = { STYLE:1, SCRIPT:1, NOSCRIPT:1, SVG:1, PATH:1, TEMPLATE:1, LINK:1, META:1, TITLE:1, HEAD:1 };
  const normVal = (p, v) => {
    if (v == null) return v;
    if (/image|url|source/.test(p) && /url\\(/.test(v)) return /gradient/.test(v) ? 'gradient' : 'image';
    // (d) grid-template-rows gets the SAME track-count normalisation as columns —
    // resolved-px rows are container-dependent noise, exactly like columns.
    if ((p === 'grid-template-columns' || p === 'grid-template-rows') && v !== 'none') return String(v.split(' ').filter(Boolean).length);
    if (p === 'box-shadow') return v === 'none' ? 'none' : 'shadow';
    // round fractional px so 25.6px == 26px cross-browser/DPR
    return v.replace(/(-?\\d+\\.\\d+)px/g, (m, n) => Math.round(parseFloat(n)) + 'px');
  };
  const readAll = (el) => { const cs = getComputedStyle(el), r = {};
    const isAlignfull = el.classList && el.classList.contains('alignfull');
    for (let i = 0; i < cs.length; i++) { const p = cs[i];
      if (p.charCodeAt(0) === 45 || BLOCK.has(p) || LOGICAL.test(p)) continue;  // vendor '-' + blocklist + logical dupes
      if (isAlignfull && ALIGNFULL_EXTRA_BLOCK.has(p)) continue;  // (e) alignfull-scoped margin blocklist
      r[p] = normVal(p, cs.getPropertyValue(p)); }
    return r; };
  // (a) stable image identity: alt when non-empty, else 'img#'+src-basename — so an
  // empty-alt image doesn't vanish (old code only collected alt-bearing images) or
  // collapse onto one shared 'img:' key (old boxEls anchor).
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
  // (g) DUPLICATE-TEXT occurrence disambiguation (2026-07-05, STOP-49 — proven root
  // cause, replaces a disproven '@media draft-tier' theory): when two UNRELATED
  // elements share the exact same normalised direct text (e.g. a section-heading
  // label "Handmade in Birmingham" AND the trust-bar badge with the same words),
  // first-write-wins silently DROPS the second occurrence — so the real trust-bar
  // element is never compared at all, and a look-alike component's unrelated CSS is
  // reported instead under a misleading key. Proven live (2026-07-05): draft AND
  // clone both carry that literal duplicate; the non-duplicated trust-bar text
  // ("Registered Food Business") already resolves its @media(min-width:1024px)
  // tier correctly via real browser rendering (13px->13px->14px across 375/768/
  // 1440) — the @media-sampling theory was FALSE, this collision was the real bug.
  // Fix: count occurrences of each dkey in DOCUMENT ORDER; the 1st occurrence keeps
  // the existing bare key (zero behaviour change for the ~all-unique-text case);
  // the 2nd+ occurrence gets its own 'key#N' slot instead of being discarded, so it
  // becomes a real, comparable element. The SAME ordinal counting runs
  // independently on both draft and clone captures, so occurrence N on one side
  // pairs with occurrence N on the other (both walk the DOM top-to-bottom) — still
  // matched by CONTENT, never by class/wrapper (rule 4a).
  const dkeyOccurrence = {};
  // (c-ii) collect with the owning DOM element attached, so a later collision with an
  // ANCESTOR's key can be resolved by "which one is deeper" (el.contains check) rather
  // than first-write-wins; the DOM-element field is stripped before this object is
  // returned (page.evaluate can't structured-clone a Node).
  const boxElsRaw = {};
  document.querySelectorAll('*').forEach((el) => {
    if (inChrome(el) || SKIP_TAGS[el.tagName]) return;
    // (c-iii) <html>/<body> are never a meaningful comparison unit — exclude from boxEls.
    const isHtmlOrBody = el.tagName === 'HTML' || el.tagName === 'BODY';
    if (el.tagName === 'IMG') { images.push(imgIdentity(el)); }
    if (el.tagName === 'A') { try { let h = new URL(el.href, location.href).pathname.replace(/\\/$/,'').replace(/^\\/[A-Za-z]:\\//, '/'); if (h) links.push(h); } catch(e){} }
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.textContent;
    const dkey = norm(direct);
    if (dkey.length >= 4) { texts.push(dkey);
      // INLINE-WRAPPER HOIST (2026-07-05, Bean-caught understatement): when the
      // direct text sits in a bare inline wrapper (the clone renders button
      // labels inside a <span>), the STYLING lives on the parent — anchor there,
      // or the styled <a> gets compared against its own unstyled span (~20
      // false mismatches per button). Hoist while: parent has exactly this one
      // element child, identical normalised text, and the CURRENT node is an
      // inline text wrapper. Universal — no block knowledge.
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
      const slot = occ === 1 ? dkey : (dkey + '#' + occ);  // (g) 2nd+ occurrence gets its own slot
      if (!textEls[slot]) textEls[slot] = { tag: anchorEl.tagName.toLowerCase(), css: readAll(anchorEl) }; }
    if (!isHtmlOrBody && (el.childElementCount > 0 || el.tagName === 'IMG')) {
      const anchor = el.tagName === 'IMG' ? ('img:' + imgIdentity(el)) : norm(el.innerText);
      if (anchor.length >= 5) {
        const existing = boxElsRaw[anchor];
        // (c-ii) keep the DEEPEST/most-specific element: only overwrite when nothing is
        // registered yet, OR the currently-registered element is an ANCESTOR of this one
        // (this el is more specific). Never overwrite for an unrelated same-key collision.
        if (!existing || (existing.el && existing.el !== el && existing.el.contains(el))) {
          boxElsRaw[anchor] = { tag: el.tagName.toLowerCase(), css: readAll(el), el };
        }
      }
    }
  });
  const boxEls = {};
  for (const k of Object.keys(boxElsRaw)) { boxEls[k] = { tag: boxElsRaw[k].tag, css: boxElsRaw[k].css }; }
  const fullText = normFull(document.body ? document.body.innerText : '').slice(0, 200000);
  return { texts: [...new Set(texts)], images: [...new Set(images)], links: [...new Set(links)], textEls, boxEls, defaults, fullText };
}`;

async function capture(page, url, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
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
function propMatches(prop, dv, cv) {
  if (dv === cv) return true;
  // (f) auto-vs-0px noise: computed-representation twins when no constraint applies —
  // min-height/min-width report 'auto' in one browser/context and '0px' in another for
  // the same "no minimum" state. min-width is already blocklisted at capture time; this
  // also covers min-height (which IS compared, per the aspect-ratio/object-fit/min-height
  // fixed-height-transfer signal documented at the top of this file).
  if ((prop === 'min-height' || prop === 'min-width') &&
      ((dv === 'auto' && cv === '0px') || (dv === '0px' && cv === 'auto'))) return true;
  if (prop === 'font-weight') return Math.abs((parseInt(dv) || 400) - (parseInt(cv) || 400)) < 100;
  if (/(text-align|justify-content|align-items|justify-items|align-self)/.test(prop)) {
    const canon = (x) => ({ left: 'start', right: 'end', 'flex-start': 'start', 'flex-end': 'end', normal: 'start' }[x] || x);
    return canon(dv) === canon(cv);
  }
  return false;
}

// Compare one matched pair over ALL props; only MEANINGFUL props count (differs OR
// non-default on the draft). Returns {total, match, diffs}.
function comparePair(drec, crec, dDef) {
  let total = 0, match = 0; const diffs = [];
  const ddef = dDef[drec.tag] || {};
  for (const p of Object.keys(drec.css)) {
    const dv = drec.css[p], cv = crec.css[p];
    if (cv === undefined) continue;
    const meaningful = (dv !== cv) || (ddef[p] !== undefined && dv !== ddef[p]);
    if (!meaningful) continue;
    total++;
    if (propMatches(p, dv, cv)) match++; else diffs.push({ prop: p, draft: dv, clone: cv });
  }
  return { total, match, diffs };
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const report = { draft: DRAFT, clone: CLONE, method: 'computed values, matched by content, all-props-minus-blocklist, meaningful-only (rule 4a)', viewports: {} };
  let gT = 0, gM = 0;

  for (const vw of VIEWPORTS) {
    const d = await capture(page, DRAFT, vw);
    const c = await capture(page, CLONE, vw);
    const cT = new Set(c.texts), cI = new Set(c.images), cL = new Set(c.links);

    // Tier 1: content presence
    const has = (set, v) => set.has(v) || [...set].some(x => x.length > 5 && (x.includes(v) || v.includes(x)));
    const cFull = c.fullText || '';
    // Whole-page haystack fallback is FLOOR-GATED (D278 QC): it exists for
    // draft units split across clone elements ("Reham, London"), but an
    // unbounded substring match would let a SHORT dropped string count as
    // present because it coincides with unrelated copy elsewhere —
    // over-reporting fidelity (STOP-49). Units under 10 normalised chars
    // must match a real element text (cT), never the whole-page haystack.
    const dropText = d.texts.filter(t => !excluded(t) && !has(cT, t)
      && !(t.length >= 10 && cFull.includes(t)));
    const dropImg = d.images.filter(a => !cI.has(a) && ![...cI].some(x => x.includes(a) || a.includes(x)));
    const dropLink = d.links.filter(h => !cL.has(h));
    const cTot = d.texts.filter(t => !excluded(t)).length + d.images.length + d.links.length;
    const cDrop = dropText.length + dropImg.length + dropLink.length;
    const contentPct = cTot ? Math.round(100 * (cTot - cDrop) / cTot) : null;

    // Tier 2+3: CSS over text-leaf (fuzzy) + structural (exact), ALL props, meaningful-only
    let T = 0, M = 0, unmatched = 0; const mis = [], unm = [];
    const runTier = (map, cloneMap, exact) => {
      for (const [key, drec] of Object.entries(map)) {
        if (excluded(key)) continue;
        const crec = findByAnchor(key, cloneMap, exact);
        if (!crec) { unmatched++; unm.push(key.slice(0, 44)); continue; }
        const r = comparePair(drec, crec, d.defaults);
        T += r.total; M += r.match;
        if (r.diffs.length) mis.push({ text: key.slice(0, 46), tag: drec.tag, diffs: r.diffs });
      }
    };
    runTier(d.textEls, c.textEls, false);
    runTier(d.boxEls, c.boxEls, true);

    const total = T, matchN = M; gT += total; gM += matchN;
    report.viewports[vw] = {
      content: { pct: contentPct, dropped_text: dropText, dropped_images: dropImg, dropped_links: dropLink },
      css: { pct: total ? Math.round(100 * matchN / total) : null, meaningful_props: total, match: matchN, unmatched_elements: unm, mismatches: mis },
    };
    console.log(`\n===== ${vw}px =====`);
    console.log(`  CONTENT  ${contentPct}%   (${cDrop} dropped: ${dropText.length} text / ${dropImg.length} img / ${dropLink.length} link)`);
    console.log(`  CSS      ${total ? Math.round(100 * matchN / total) : 0}%   (${matchN}/${total} MEANINGFUL props over matched elements; ${mis.length} elements off; ${unmatched} draft els UNMATCHED)`);
    if (vw === VIEWPORTS[VIEWPORTS.length - 1]) {
      if (dropText.length) console.log('  dropped text: ' + dropText.slice(0, 8).map(t => '"' + t.slice(0, 26) + '"').join(', '));
      console.log('  -- CSS mismatches (top 24) --');
      for (const m of mis.slice(0, 24)) console.log(`    [${m.tag}] "${m.text.slice(0, 40)}": ` + m.diffs.map(x => `${x.prop} ${x.draft}->${x.clone}`).join('; '));
      if (mis.length > 24) console.log(`    ... +${mis.length - 24} more (see --out JSON)`);
    }
  }
  report.overall_css_pct = gT ? Math.round(100 * gM / gT) : null;
  console.log(`\n##### OVERALL CSS parity: ${report.overall_css_pct}% (${gM}/${gT} meaningful props, ${VIEWPORTS.length} viewports). Universal all-props capture; content presence reported separately. Excludes text: ${EXCLUDE.join(', ') || 'none'} #####`);
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log('report -> ' + OUT); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
