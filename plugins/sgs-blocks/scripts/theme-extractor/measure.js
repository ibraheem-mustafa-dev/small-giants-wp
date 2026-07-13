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
  const inChrome = (el) => !!el.closest('header, footer, nav, [class*="header"], [class*="footer"], [class*="nav"]');
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

  // Button presets: rest + :hover computed per distinct class signature. Hovering is done in Node
  // (page.hover) — here we only record the class list + rest computed; hover is merged in Node.
  const buttons = [];
  const seenBtn = new Set();
  document.querySelectorAll('a, button, .btn, [class*="button"]').forEach((el) => {
    if (!visible(el)) return;
    const cls = (el.getAttribute('class') || '').trim();
    if (!cls) return;
    // Only treat as a button preset if it looks like one (class or role/tag).
    const looksButton = /btn|button/i.test(cls) || el.tagName === 'BUTTON';
    if (!looksButton) return;
    const key = cls.split(/\s+/).sort().join(' ');
    if (seenBtn.has(key)) return;
    seenBtn.add(key);
    buttons.push({ classKey: key, classes: cls.split(/\s+/), path: nodePath(el), rest: pick(el, BOX) });
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

// The set of button-variant class keys we must additionally read in the :hover state.
const HOVER_READ_SRC = function (classKey) {
  const el = Array.from(document.querySelectorAll('a, button, .btn, [class*="button"]')).find((n) => {
    const cls = (n.getAttribute('class') || '').trim();
    return cls && cls.split(/\s+/).sort().join(' ') === classKey;
  });
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

    // Second pass: read each button variant's :hover computed by actually hovering it.
    for (const btn of facts.buttons) {
      try {
        // Hover the first element carrying this variant's full class list (compound selector),
        // falling back to the first class token if the compound selector doesn't resolve.
        const compound = btn.classes.map((c) => '.' + c.replace(/([^a-zA-Z0-9_-])/g, '\\$1')).join('');
        await page.hover(compound, { timeout: 1500 }).catch(async () => {
          await page.hover('.' + btn.classes[0], { timeout: 1500 }).catch(() => {});
        });
        await page.waitForTimeout(120);
        const hover = await page.evaluate('(' + HOVER_READ_SRC.toString() + ')(' + JSON.stringify(btn.classKey) + ')');
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
