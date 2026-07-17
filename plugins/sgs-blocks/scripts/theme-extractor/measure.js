#!/usr/bin/env node
/**
 * measure.js — the COMPUTED-VALUE reader for the Spec 33 draft global-styles extractor.
 *
 * THE IRON LAW (Spec 33 FR-33-1/33-3): the value the extractor ships is always the COMPUTED
 * value on a really-rendered node — never a raw source declaration. This script is the ONLY place
 * that value is read. It renders the draft in a headless browser (reusing the parity harness's
 * launch + file://-URL convention) and reads getComputedStyle on the representative nodes the
 * Python layer needs, then emits a structured `computed-facts.json` on stdout.
 *
 * It does NOT classify or emit theme tokens — that is the Python layer's job (roles.py/extract.py).
 * It only MEASURES, so the "computed wins" reconciliation has ground truth to reconcile against.
 *
 * Usage:  node measure.js --draft <url|path> [--out <file>]
 *         (prints JSON to stdout; --out also writes it to a file)
 *
 * Run via PowerShell on Windows (the Git-Bash nvm shim is broken — STOP-16).
 */
'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Same convention as parity/computed-parity.js: http(s) passes through, a local path → file:// URL.
const toURL = (s) => (!s ? s : (/^https?:\/\//i.test(s) ? s : pathToFileURL(path.resolve(s)).href));

function parseArgs(argv) {
  const out = { draft: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--draft') out.draft = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

// ── The in-page capture function (serialised into the browser context) ──────────────────────────
// Reads getComputedStyle on the representative nodes + enough structural signal for the Python
// layer to pick the MAIN-CONTENT-FLOW representative <p> (FR-33-3) and the widest content-
// containing ancestor for the background (FR-33-6). Returns raw computed values only.
const CAPTURE_SRC = function () {
  const TYPO = ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'fontStyle',
    'letterSpacing', 'color', 'textTransform'];
  const BOX = ['backgroundColor', 'backgroundImage', 'color', 'borderTopColor',
    'borderTopWidth', 'borderTopStyle', 'borderTopLeftRadius', 'paddingTop', 'paddingRight',
    'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'minHeight',
    'boxShadow', 'transform'];

  const pick = (el, props) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs[p];
    return o;
  };
  // A stable-ish structural path (tag + nth-of-type chain, capped) so Python can dedupe/identify.
  const nodePath = (el) => {
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 6) {
      let i = 1, s = n.previousElementSibling;
      while (s) { if (s.tagName === n.tagName) i++; s = s.previousElementSibling; }
      parts.unshift(n.tagName.toLowerCase() + (i > 1 ? ':nth-of-type(' + i + ')' : ''));
      n = n.parentElement;
    }
    return parts.join('>');
  };
  // FR-33-3 chrome exclusion: a genuine site-level <header>/<footer>/<nav> landmark carries chrome
  // typography (top nav links, footer copyright) that must NOT drive the client's content type
  // scale. But a landmark NESTED inside the main content flow (Astra/UAGB wrap a post/section
  // title+description pair in <header> for semantic correctness — an entry-header, a card header)
  // is CONTENT, not site chrome, and must NOT be excluded.
  //
  // Substring class matching (the old `[class*="header"]` etc.) was REMOVED: it matches any class
  // token containing the substring anywhere in the DOM, including unrelated builder/feature-flag
  // marker classes that land on <body> itself (e.g. Astra's "ast-hfb-header" Header-Footer-Builder
  // flag) — which made `body.closest('[class*="header"]')` match TRUE, and since body is an ancestor
  // of every element on the page, the entire DOM (every paragraph, heading, and section, down to
  // `html>body` itself) was misclassified as chrome. Proven on the Indus original: 100% of captured
  // facts carried `inChrome: true`. Tag-based landmark detection + the main/article/section nesting
  // exception is universal and draft-agnostic — it does not depend on any theme/builder class name.
  const inChrome = (el) => {
    const landmark = el.closest('header, footer, nav');
    if (!landmark) return false;
    return !landmark.closest('main, article, section');
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const root = { fontSize: getComputedStyle(document.documentElement).fontSize };
  const body = pick(document.body, TYPO.concat(['backgroundColor', 'backgroundImage']));

  // Candidate main-content paragraphs — Python picks the representative one (largest, not in chrome).
  const paragraphs = [];
  document.querySelectorAll('p').forEach((el) => {
    if (!visible(el)) return;
    const txt = (el.textContent || '').trim();
    if (txt.length < 8) return;                       // skip tiny/label paragraphs
    paragraphs.push({
      path: nodePath(el), inChrome: inChrome(el), area: rect(el).w * rect(el).h,
      textLen: txt.length, textSample: txt.slice(0, 60), ...pick(el, TYPO),
    });
  });

  // First rendered instance of each heading level (base heading typography).
  const headings = {};
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag) => {
    const el = Array.from(document.querySelectorAll(tag)).find(visible);
    if (el) headings[tag] = { path: nodePath(el), inChrome: inChrome(el), ...pick(el, TYPO) };
  });

  // Links (base link colour) — first non-chrome visible anchor with text.
  const links = [];
  document.querySelectorAll('a').forEach((el) => {
    if (!visible(el) || inChrome(el)) return;
    const txt = (el.textContent || '').trim();
    if (!txt) return;
    links.push({ path: nodePath(el), color: getComputedStyle(el).color, textDecorationLine: getComputedStyle(el).textDecorationLine });
  });

  // Button presets: rest + :hover computed per distinct variant. Hovering is done in Node
  // (page.hover) — here we only record the classes + rest computed; hover is merged in Node.
  //
  // FR-33-4: a preset MUST measure the element that actually PAINTS the button — the <a>/<button>
  // (or input[type=submit]/[role=button]) — NEVER an ancestor wrapper. The old selector
  // `a, button, .btn, [class*="button"]` matched builder WRAPPER DIVS (UAGB emits
  // `div.wp-block-uagb-buttons-child.wp-block-button` around the real `<a.wp-block-button__link>`),
  // and the `[class*="button"]` substring test let them through. The wrapper is transparent and
  // border-less, so the derived preset was junk (border-width 0px / radius 0px / transparent bg)
  // while the real <a> painted #fff / #0a7ea8 / 3px / 30px radius. Same wrapper-vs-real-element trap
  // that produces false positives in computed-parity runs.
  //
  // The VARIANT class, however, legitimately lives on a wrapper in builder markup (UAGB puts
  // `.outline` on the child wrapper) while SGS drafts put it on the element itself
  // (`.sgs-button--ghost`). So: MEASURE the painting element, but record the nearest ancestors'
  // classes as variant CONTEXT for the Python slot matcher (own classes take precedence there).
  const paintsButton = (el) => {
    const tag = el.tagName;
    if (tag === 'BUTTON') return true;
    if (tag === 'A') return true;
    if (tag === 'INPUT') return ['submit', 'button', 'reset']
      .indexOf((el.getAttribute('type') || '').toLowerCase()) !== -1;
    return (el.getAttribute('role') || '').toLowerCase() === 'button';
  };
  const buttons = [];
  const seenBtn = new Set();
  let btnIdx = 0;
  document.querySelectorAll('a, button, input, [role="button"]').forEach((el) => {
    if (!visible(el) || !paintsButton(el)) return;
    const cls = (el.getAttribute('class') || '').trim();
    const own = cls ? cls.split(/\s+/) : [];
    const looksButton = /btn|button/i.test(cls) || el.tagName === 'BUTTON'
      || el.tagName === 'INPUT' || (el.getAttribute('role') || '').toLowerCase() === 'button';
    if (!looksButton) return;
    // Nearest-ancestor classes (capped) = variant context only; never measured.
    const anc = [];
    let p = el.parentElement, depth = 0;
    while (p && depth < 4) {
      const pc = (p.getAttribute('class') || '').trim();
      if (pc) anc.push.apply(anc, pc.split(/\s+/));
      p = p.parentElement; depth++;
    }
    if (own.length === 0 && anc.length === 0) return;
    // Dedupe on own + ancestor context, so two <a>s sharing a class but sitting under different
    // variant wrappers (the UAGB case) are captured separately rather than collapsing to the first.
    const key = own.slice().sort().join(' ') + '||' + anc.slice().sort().join(' ');
    if (seenBtn.has(key)) return;
    seenBtn.add(key);
    // Index the node so Node-side hover reads the SAME element (a compound class selector is
    // ambiguous across instances and silently resolved to the wrong node).
    el.setAttribute('data-sgs-btn-idx', String(btnIdx));
    buttons.push({ classKey: key, classes: own, ancestorClasses: anc, idx: btnIdx,
      path: nodePath(el), rest: pick(el, BOX) });
    btnIdx++;
  });

  // Section-level background candidates: block-level elements that CONTAIN the content flow.
  // Python (FR-33-6) picks the widest content-containing ancestor for the theme background.
  const sections = [];
  document.querySelectorAll('body, main, section, div').forEach((el) => {
    if (!visible(el)) return;
    const r = rect(el);
    if (r.w < 200 || r.h < 100) return;               // ignore small boxes
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const transparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
    if (transparent && cs.backgroundImage === 'none') return;
    sections.push({
      path: nodePath(el), inChrome: inChrome(el), area: r.w * r.h, w: r.w,
      hasParagraph: !!el.querySelector('p'), hasHeading: !!el.querySelector('h1,h2,h3'),
      backgroundColor: bg, backgroundImage: cs.backgroundImage,
    });
  });

  // Structural preview-shell markers (FR-33-6 positive signal — never darkness alone).
  // Record each matched element's PATH (not just the selector) so the Python layer can exclude
  // the shell wrapper + its ancestors from the background candidates — the shell class can sit on
  // any wrapper div, not <body>, so a selector-only signal cannot locate it (FR-33-6 harness case).
  const previewShellMarkers = [];
  const seenShell = new Set();
  ['.viewport-switcher', '.device-frame', '.review-harness', '[data-preview-shell]',
    '[class*="device-frame"]', '[class*="viewport"]'].forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const path = nodePath(el);
      if (seenShell.has(path)) return;
      seenShell.add(path);
      previewShellMarkers.push({ selector: sel, path });
    });
  });

  return { root, body, paragraphs, headings, links, buttons, sections, previewShellMarkers };
};

// Read one captured button's :hover computed. Targeted by the index stamped during capture, so it
// reads back the EXACT node that was measured at rest (matching by class list is ambiguous when
// several instances share a class and silently resolves to the wrong one).
const HOVER_READ_SRC = function (idx) {
  const el = document.querySelector('[data-sgs-btn-idx="' + idx + '"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const props = ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'transform', 'boxShadow'];
  const o = {};
  for (const p of props) o[p] = cs[p];
  return o;
};

async function main() {
  const args = parseArgs(process.argv);
  if (!args.draft) {
    process.stderr.write('Usage: node measure.js --draft <url|path> [--out <file>]\n');
    process.exit(2);
  }
  const url = toURL(args.draft);
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(400);

    const facts = await page.evaluate('(' + CAPTURE_SRC.toString() + ')()');

    // Second pass: read each button's :hover computed by actually hovering the SAME node measured
    // at rest (addressed by its capture index, not an ambiguous class selector).
    for (const btn of facts.buttons) {
      try {
        await page.hover('[data-sgs-btn-idx="' + btn.idx + '"]', { timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(120);
        const hover = await page.evaluate('(' + HOVER_READ_SRC.toString() + ')(' + JSON.stringify(btn.idx) + ')');
        btn.hover = hover;
        // move the mouse away so the next hover starts clean
        await page.mouse.move(0, 0);
      } catch (e) {
        btn.hover = null;
      }
    }

    const json = JSON.stringify(facts, null, 2);
    if (args.out) fs.writeFileSync(args.out, json, 'utf8');
    process.stdout.write(json + '\n');
  } finally {
    await browser.close();
  }
}

main().catch((e) => { process.stderr.write('measure.js error: ' + (e && e.stack || e) + '\n'); process.exit(1); });
