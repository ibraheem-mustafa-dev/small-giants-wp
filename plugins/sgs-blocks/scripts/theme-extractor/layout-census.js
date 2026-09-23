/**
 * layout-census.js: the in-page content-width census for the Spec 33 extractor (FR-33-19).
 *
 * LAYOUT_CENSUS_SRC is serialised into the browser context by measure.js, so it must not close over
 * anything in Node scope. measure.js runs it once per census viewport (1440 and 1920).
 *
 * A BAND is one top-level row of the page: the rendered, in-flow children of the first element (from
 * <body> down) that has more than one, with a <main> (or [role=main]) expanded into its own rows.
 * For every band it finds the TEXT the band paints (an element with a direct non-blank text node, or
 * a form control, that is rendered and sits horizontally inside the viewport, so an off-screen
 * marquee copy does not count). For each text element it walks up to <html> and records the CHAIN of
 * elements whose computed max-width is a pixel length (`ch`/`em`/`rem` resolve to px; a percentage
 * does not), nearest first; identical chains are counted once with a count. A band with two capped
 * rows (a footer's columns and its bottom bar) therefore reports both. For each capped element it
 * records the box model and the measured content box: the layout width (offsetWidth, which ignores
 * transforms) minus padding and border, and its left edge. Choosing which capped element is the
 * content width is the Python side's job (used_layout.py), so the rule is testable without a browser.
 *
 * Nothing here decides a value; it only reports what rendered.
 */
'use strict';

const LAYOUT_CENSUS_SRC = function () {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META']);
  const CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);
  const CHROME = new Set(['HEADER', 'FOOTER', 'NAV']);
  const vw = document.documentElement.clientWidth;

  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inFlow = (el) => {
    if (SKIP.has(el.tagName) || !shown(el)) return false;
    const pos = getComputedStyle(el).position;
    return pos !== 'fixed' && pos !== 'absolute';
  };
  const isMain = (el) => el.tagName === 'MAIN' || el.getAttribute('role') === 'main';
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      parts.unshift(n.tagName.toLowerCase() + ':' + Array.prototype.indexOf.call(n.parentElement.children, n));
    }
    return parts.join('>');
  };
  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    return el.tagName.toLowerCase() + (cls.length ? '.' + cls.slice(0, 2).join('.') : '');
  };

  const bandsOf = (node) => {
    const kids = Array.from(node.children).filter(inFlow);
    if (kids.length === 1 && !isMain(kids[0])) return bandsOf(kids[0]);
    const out = [];
    for (const k of kids) {
      if (isMain(k)) out.push(...bandsOf(k));
      else out.push(k);
    }
    return out;
  };

  const ownText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return CONTROLS.has(el.tagName);
  };
  const textNodesIn = (band) => {
    const out = [];
    for (const el of [band, ...band.querySelectorAll('*')]) {
      if (SKIP.has(el.tagName) || !ownText(el) || !shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right <= 0 || r.left >= vw) continue;
      out.push(el);
    }
    return out;
  };
  const px = (v) => Number.parseFloat(v) || 0;
  const round2 = (n) => Math.round(n * 100) / 100;

  const bands = [];
  for (const band of bandsOf(document.body)) {
    const texts = textNodesIn(band);
    const caps = [];
    const capIndex = new Map();
    const capOf = (el, cs) => {
      if (capIndex.has(el)) return capIndex.get(el);
      const r = el.getBoundingClientRect();
      caps.push({
        path: path(el), label: label(el), ownText: ownText(el),
        maxWidth: cs.maxWidth, boxSizing: cs.boxSizing,
        paddingLeft: px(cs.paddingLeft), paddingRight: px(cs.paddingRight),
        borderLeft: px(cs.borderLeftWidth), borderRight: px(cs.borderRightWidth),
        offsetWidth: el.offsetWidth,
        contentWidth: round2(el.offsetWidth - px(cs.paddingLeft) - px(cs.paddingRight)
          - px(cs.borderLeftWidth) - px(cs.borderRightWidth)),
        contentX: round2(r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft)),
      });
      capIndex.set(el, caps.length - 1);
      return caps.length - 1;
    };
    // One chain per text element: the pixel-capped elements from that text up to <html>, nearest first.
    const chains = new Map();
    for (const t of texts) {
      const chain = [];
      for (let el = t; el && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (/^\d+(\.\d+)?px$/.test(cs.maxWidth)) chain.push(capOf(el, cs));
      }
      const key = chain.join(',');
      chains.set(key, { caps: chain, count: ((chains.get(key) || {}).count || 0) + 1 });
    }
    bands.push({
      path: path(band), label: label(band), chrome: CHROME.has(band.tagName),
      text: (band.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 48),
      textCount: texts.length, caps,
      chains: Array.from(chains.values()).sort((a, b) => a.caps.join(',').localeCompare(b.caps.join(','))),
    });
  }
  return { viewport: vw, bands };
};

module.exports = { LAYOUT_CENSUS_SRC };
