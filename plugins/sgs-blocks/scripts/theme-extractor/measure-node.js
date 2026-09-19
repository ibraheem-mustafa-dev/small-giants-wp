/**
 * measure-node.js: the Node-side helpers of measure.js (argument parsing, the URL convention, the hover
 * read). Nothing here runs in the browser except HOVER_READ_SRC, which is serialised into the page and
 * therefore must not close over anything.
 */
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

// DATA: class tokens a draft's RUNTIME stamps on elements, never authored by the designer. The Claude
// Design runtime (the draft's support.js) gives every element that carries an inline style a scoped
// class (`scp` + a base-36 counter, e.g. scp3, scpd) plus a host class (`sc-host`). These are not
// variant names, so they must not make a button look class-bearing. Passed into the page as a source
// string because CAPTURE_SRC is serialised into the browser context and cannot close over Node scope.
const GENERATED_CLASS_RE = /^(scp[0-9a-z]+|sc-host)$/;

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

// One button's :hover computed. Hover it (addressed by its capture index), wait the classic 120 ms and
// read. A class-bearing button stops there, which is exactly the read the class-bearing presets were
// measured with. A classless one (`sig:` key: Claude Design drafts, whose buttons ease their colour over
// a few hundred ms) is read again until two consecutive reads 80 ms apart agree, capped at 1500 ms: a
// fixed short wait read #252525 mid-way to a declared #2A2A2A.
async function readHover(page, btn) {
  await page.hover('[data-sgs-btn-idx="' + btn.idx + '"]', { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(120);
  const read = () => page.evaluate('(' + HOVER_READ_SRC.toString() + ')(' + JSON.stringify(btn.idx) + ')');
  let hover = await read();
  if (!String(btn.classKey).startsWith('sig:')) return hover;
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    const next = await read();
    const settled = JSON.stringify(next) === JSON.stringify(hover);
    hover = next;
    if (settled) break;
  }
  return hover;
}

module.exports = { GENERATED_CLASS_RE, toURL, parseArgs, readHover };
