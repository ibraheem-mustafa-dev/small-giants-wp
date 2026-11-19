/**
 * measure-node.js: the Node-side helpers of measure.js (argument parsing, serving the draft, the hover and
 * state reads, the component probe). The *_SRC functions run in the browser: they are serialised into the
 * page and therefore must not close over anything.
 */
'use strict';

const path = require('path');

// DATA: class tokens a draft's RUNTIME stamps on elements, never authored by the designer. The Claude
// Design runtime (the draft's support.js) gives every element that carries an inline style a scoped
// class (`scp` + a base-36 counter, e.g. scp3, scpd) plus a host class (`sc-host`). These are not
// variant names, so they must not make a button look class-bearing. Passed into the page as a source
// string because CAPTURE_SRC is serialised into the browser context and cannot close over Node scope.
const GENERATED_CLASS_RE = /^(scp[0-9a-z]+|sc-host)$/;

function parseArgs(argv) {
  const out = { draft: null, out: null, components: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--draft') out.draft = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--components') out.components = argv[++i];
  }
  return out;
}

// The state looks of one element, read with its transitions switched off so each reading is the state's end value
// (a spring easing read mid-way overshoots): `rest` (nothing forced), `hover`, `active` (`:active` alone: what the
// pressed rule itself declares) and `pressed` (`:hover` with `:active`, as a mouse press is). Both pressed readings
// are kept because a draft's hover rule can sit after its pressed rule in the sheet and win while both match (the
// draft runtime reuses one rule for identical `style-active` text, so a second button's later hover rule outranks
// it). Chromium's DevTools protocol forces the states, so no pointer event reaches the draft's handlers and a link
// never navigates. The element's own inline transition is put back afterwards.
const STATE_PROPS = ['backgroundColor', 'color', 'borderTopColor', 'transform', 'boxShadow'];
const STATE_READ_SRC = function (sel, props) {
  const cs = getComputedStyle(document.querySelector(sel));
  const o = {};
  for (const p of props) o[p] = cs[p];
  return o;
};
const TRANSITION_SET_SRC = function (sel, saved) {
  const el = document.querySelector(sel);
  if (saved === null) {
    const prior = [el.style.getPropertyValue('transition'), el.style.getPropertyPriority('transition')];
    el.style.setProperty('transition', 'none', 'important');
    return prior;
  }
  if (saved[0]) el.style.setProperty('transition', saved[0], saved[1]);
  else el.style.removeProperty('transition');
  return null;
};

async function readStates(page, cdp, sel) {
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  if (!nodeId) return null;
  const call = (src, ...args) => page.evaluate('(' + src.toString() + ')(' + args.map((a) => JSON.stringify(a)).join(',') + ')');
  const saved = await call(TRANSITION_SET_SRC, sel, null);
  const out = {};
  try {
    for (const [name, forced] of [['rest', []], ['hover', ['hover']], ['active', ['active']],
      ['pressed', ['hover', 'active']]]) {
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced });
      out[name] = await call(STATE_READ_SRC, sel, STATE_PROPS);
    }
  } finally {
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {});
    await call(TRANSITION_SET_SRC, sel, saved).catch(() => {});
  }
  return out;
}

async function openStateSession(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  return cdp;
}

// A folder served on 127.0.0.1 at an ephemeral port, plus pages held in memory (`virtual`: path -> html, read on
// each request, so a page can be added after the server starts). Every local draft is measured through this server
// (`openDraft`): the draft runtime fetches each mounted component (`<dc-import>`: a header, footer, button or field)
// with fetch(), which a page opened from disk (file://) cannot do, so from disk a component is never drawn.
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

function serveFolder(folder, virtual) {
  const http = require('http');
  const fs = require('fs');
  const root = path.resolve(folder);
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch (e) { rel = ''; }
    if (Object.prototype.hasOwnProperty.call(virtual, rel)) {
      res.writeHead(200, { 'content-type': CONTENT_TYPES['.html'] });
      res.end(virtual[rel]);
      return;
    }
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((done, fail) => {
    server.once('error', fail).listen(0, '127.0.0.1', () => {
      done({ url: 'http://127.0.0.1:' + server.address().port + '/',
        close: () => new Promise((closed) => { server.close(() => closed()); server.closeAllConnections(); }) });
    });
  });
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// A page that mounts each probe ({ component, attrs, links }) once, each in its own flex box marked
// `data-sgs-probe="<index>"`, with every stylesheet the probed components load in their own <helmet>.
function componentHarness(probes) {
  const links = [];
  for (const p of probes) for (const href of p.links || []) if (links.indexOf(href) === -1) links.push(href);
  const mounts = probes.map((p, i) => {
    const attrs = Object.keys(p.attrs || {}).map((k) => ' ' + k + '="' + escAttr(p.attrs[k]) + '"').join('');
    return '<div data-sgs-probe="' + i + '" style="display:flex"><dc-import name="' + escAttr(p.component) + '"'
      + attrs + '></dc-import></div>';
  });
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><script src="./support.js"></script></head><body><x-dc><helmet>'
    + links.map((href) => '<link rel="stylesheet" href="' + escAttr(href) + '">').join('')
    + '</helmet><div style="display:flex;flex-direction:column;align-items:flex-start;gap:40px;padding:40px">'
    + mounts.join('') + '</div></x-dc></body></html>';
}

// In the harness: the element that paints probe `i` (the first a, button, button-type input or role=button inside
// its box) with its resting look, or null when the component draws no button.
const PROBE_READ_SRC = function (i, props) {
  const box = document.querySelector('[data-sgs-probe="' + i + '"]');
  const isButton = (el) => el.tagName === 'A' || el.tagName === 'BUTTON'
    || (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].indexOf((el.getAttribute('type') || '').toLowerCase()) !== -1)
    || (el.getAttribute('role') || '').toLowerCase() === 'button';
  const el = box ? Array.prototype.find.call(box.querySelectorAll('a, button, input, [role]'), isButton) : null;
  if (!el) return null;
  el.setAttribute('data-sgs-probe-el', String(i));
  const cs = getComputedStyle(el);
  const rest = {};
  for (const p of props) rest[p] = cs[p];
  const r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), rest, w: Math.round(r.width), h: Math.round(r.height),
    textLen: (el.textContent || el.value || '').trim().length };
};

// The address to open for `--draft`: an http(s) address as given, a local file through a server on its folder.
// Returns { url, served }: served is null for an address, else serveFolder's { url, close } plus its `virtual` map.
async function openDraft(draft) {
  if (/^https?:\/\//i.test(draft)) return { url: draft, served: null };
  const file = path.resolve(draft);
  const virtual = {};
  const served = Object.assign(await serveFolder(path.dirname(file), virtual), { virtual });
  return { url: served.url + encodeURIComponent(path.basename(file)), served };
}

// Each probe's resting, hover and pressed looks, read from the draft's own component (see componentHarness), on a
// page added to the draft's own server (`openDraft`).
async function measureComponents(browser, served, probes, restProps) {
  const harnessPath = '/__sgs-component-probe.dc.html';
  served.virtual[harnessPath] = componentHarness(probes);
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(served.url + harnessPath.slice(1), { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(400);
    const cdp = await openStateSession(page);
    const out = [];
    for (let i = 0; i < probes.length; i++) {
      const read = await page.evaluate('(' + PROBE_READ_SRC.toString() + ')(' + i + ',' + JSON.stringify(restProps) + ')');
      const entry = Object.assign({}, probes[i].meta || {}, { component: probes[i].component, attrs: probes[i].attrs });
      if (!read) {
        out.push(Object.assign(entry, { painted: false }));
        continue;
      }
      let states = null;
      try { states = await readStates(page, cdp, '[data-sgs-probe-el="' + i + '"]'); } catch (e) { states = null; }
      out.push(Object.assign(entry, read, { painted: true, hover: states && states.hover, states }));
    }
    return out;
  } finally {
    await context.close();
  }
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

module.exports = { GENERATED_CLASS_RE, openDraft, parseArgs, readHover, readStates, openStateSession,
  measureComponents, componentHarness };
