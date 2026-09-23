/**
 * font-usage.js: the in-page font census for the Spec 33 extractor (FR-33-18).
 *
 * FONT_USAGE_SRC is serialised into the browser context by measure.js, so it must not close over
 * anything in Node scope.
 *
 * It records, for every rendered element that paints its OWN text (a direct non-blank text node, or
 * a form control whose value the browser paints), the computed font-family stack, weight and style.
 * An element hidden by display:none, visibility:hidden or a zero-size box is not rendered and is not
 * counted. Opacity is deliberately NOT a filter: scroll-reveal drafts hold below-the-fold text at
 * opacity 0 until it enters the viewport, and that text is still set in its font.
 *
 * It also lists document.fonts with each face's status. A face the browser never needed stays
 * "unloaded", so this is a second, independent witness that a loaded family actually painted.
 */
'use strict';

const FONT_USAGE_SRC = function () {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg']);
  const CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);
  const ownText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return n.nodeValue.trim();
    }
    return CONTROLS.has(el.tagName) ? (el.value || el.placeholder || '').trim() : '';
  };
  const rendered = (el, cs) => {
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const usage = new Map();
  const nodes = [document.body, ...document.body.querySelectorAll('*')];
  for (const el of nodes) {
    if (SKIP.has(el.tagName)) continue;
    const text = ownText(el);
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (!rendered(el, cs)) continue;
    const key = cs.fontFamily + '|' + cs.fontWeight + '|' + cs.fontStyle;
    const row = usage.get(key) || {
      fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
      count: 0, sample: text.slice(0, 40),
    };
    row.count += 1;
    usage.set(key, row);
  }

  const fontFaces = [];
  document.fonts.forEach((f) => {
    fontFaces.push({
      family: f.family.replace(/^["']|["']$/g, ''), weight: f.weight, style: f.style, status: f.status,
    });
  });
  return { fontUsage: Array.from(usage.values()), fontFaces };
};

module.exports = { FONT_USAGE_SRC };
