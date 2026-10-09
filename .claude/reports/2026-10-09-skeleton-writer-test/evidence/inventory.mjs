import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const { chromium } = require('playwright');
const OUT = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(OUT, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const URL_ = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const WIDTHS = [1440, 375, 768];

function collect() {
  const f = document.querySelector('footer');
  if (!f) return { error: 'no footer' };
  const els = [f, ...f.querySelectorAll('*')];
  const parsed = {};
  const srcDoc = (name) => {
    if (!parsed[name]) { const t = document.createElement('template'); t.innerHTML = window.__dcAnnotatedTemplate(name) || ''; parsed[name] = t.content; }
    return parsed[name];
  };
  const hostOf = (e) => e.closest('.sc-host');
  const importPath = (e) => { const names = []; let a = e.parentElement; while (a) { if (a.classList.contains('sc-host')) names.unshift(a.dataset.scName + (a.dataset.dcTpl ? '@' + a.dataset.dcTpl : '')); a = a.parentElement; } return names.join('>'); };
  const keyOf = (e) => {
    const n = e.dataset.dcTpl; const host = hostOf(e);
    const same = [...host.querySelectorAll(`[data-dc-tpl="${n}"]`)].filter((x) => hostOf(x) === host);
    return importPath(e) + '/' + n + '#' + same.indexOf(e);
  };
  const ws = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const out = []; const unstamped = [];
  els.forEach((e) => {
    if (!e.hasAttribute('data-dc-tpl')) { unstamped.push({ tag: e.tagName.toLowerCase(), cls: String(e.className?.baseVal ?? e.className), text: ws(e.textContent).slice(0, 60), parentTpl: e.parentElement.closest('[data-dc-tpl]')?.dataset.dcTpl }); return; }
    e.setAttribute('data-inv-i', String(out.length));
    const n = e.dataset.dcTpl; const host = hostOf(e); const tname = host.dataset.scName;
    let p = e.parentElement; while (p && !p.hasAttribute('data-dc-tpl')) p = p.parentElement;
    const parentKey = p ? keyOf(p) : null;
    let depth = 0; { let a = e; while (a !== f) { a = a.parentElement; if (a.hasAttribute('data-dc-tpl')) depth++; } }
    let own = ''; for (const c of e.childNodes) { if (c.nodeType === 3) own += c.nodeValue + ' '; else if (c.nodeType === 1 && !c.hasAttribute('data-dc-tpl')) own += c.textContent + ' '; }
    const attrs = {};
    for (const a of ['href', 'aria-label', 'alt', 'role', 'type', 'title', 'target', 'aria-hidden', 'viewBox', 'class']) { const v = e.getAttribute(a); if (v != null && v !== '') attrs[a] = v; }
    if (e.tagName === 'IMG') { const s = e.currentSrc || e.getAttribute('src') || ''; attrs.srcBasename = s.startsWith('data:') ? 'data:' + s.slice(5, 30) + '...' : s.split('?')[0].split('/').pop(); }
    const s = srcDoc(tname).querySelector(`[data-dc-tpl="${n}"]`);
    const membership = [];
    let srcTag = null, snippet = null, srcOwn = null;
    if (s) {
      srcTag = s.localName;
      snippet = ws(s.outerHTML).slice(0, 300);
      srcOwn = ws([...s.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join(' '));
      let a = s.parentElement;
      while (a) {
        const t = a.localName;
        if (t === 'sc-for') membership.unshift({ kind: 'sc-for', list: a.getAttribute('list'), as: a.getAttribute('as') || 'item', tpl: a.dataset.dcTpl });
        else if (t === 'sc-if') membership.unshift({ kind: 'sc-if', value: a.getAttribute('value'), tpl: a.dataset.dcTpl });
        else if (t === 'sc-else') membership.unshift({ kind: 'sc-else', tpl: a.dataset.dcTpl });
        else if (t === 'dc-import') membership.unshift({ kind: 'dc-import', name: a.getAttribute('name') || a.getAttribute('component'), tpl: a.dataset.dcTpl });
        a = a.parentElement;
      }
    }
    if (tname !== window.__dcRootName()) membership.unshift({ kind: 'inside-import', template: tname });
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const box = !e.getClientRects().length ? null : { x: +(r.left + scrollX).toFixed(1), y: +(r.top + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    const visible = !!box && box.w > 0 && box.h > 0 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    out.push({ i: out.length, key: keyOf(e), parentKey, depth, tag: e.tagName.toLowerCase(), template: tname, tpl: +n, attrs, words: ws(own), allText: ws(e.textContent).slice(0, 120), membership, srcTag, srcOwnText: srcOwn, snippet, box, visible, display: cs.display });
  });
  return { records: out, unstamped, totalDesc: els.length - 1, stampedDesc: f.querySelectorAll('[data-dc-tpl]').length, footerTpl: f.dataset.dcTpl, root: window.__dcRootName() };
}

const safe = (k) => k.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const b = await chromium.launch();
const runs = {};
const shots = {}; const skipped = [];
for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL_, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500);
  // Scroll the whole page so any scroll-triggered entrances fire, then rest on the footer.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } document.querySelector('footer')?.scrollIntoView(); });
  await p.waitForTimeout(1500);
  const res = await p.evaluate(collect);
  if (res.error) throw new Error(res.error + ' at ' + w);
  runs[w] = res;
  if (w === 1440 || w === 375) {
    // Hide fixed/sticky overlays outside the footer (sticky header, floating buttons) so crops show only the element; boxes were measured before this.
    res.hiddenOverlays = await p.evaluate(() => { const f = document.querySelector('footer'); const hid = []; for (const e of document.body.querySelectorAll('*')) { if (f.contains(e) || e.contains(f)) continue; const pos = getComputedStyle(e).position; if (pos === 'fixed' || pos === 'sticky') { e.style.setProperty('visibility', 'hidden', 'important'); hid.push(e.tagName.toLowerCase() + '[tpl=' + e.dataset.dcTpl + '] ' + pos); } } return hid; });
    for (const r of res.records) {
      if (!r.visible) { skipped.push({ w, key: r.key, why: r.box ? `not visible (box ${r.box.w}x${r.box.h})` : 'not rendered (no box)' }); continue; }
      if (w === 375) { // only where layout changes vs 1440
        const d = runs[1440].records.find((x) => x.key === r.key);
        const pd = d && runs[1440].records.find((x) => x.key === d.parentKey);
        const pm = res.records.find((x) => x.key === r.parentKey);
        const rel = (a, pa) => (a && a.box && pa && pa.box ? [a.box.x - pa.box.x, a.box.y - pa.box.y] : [0, 0]);
        const [dx, dy] = rel(d, pd); const [mx, my] = rel(r, pm);
        const changed = !d || !d.box || Math.abs(d.box.w - r.box.w) > 1 || Math.abs(d.box.h - r.box.h) > 1 || Math.abs(dx - mx) > 1 || Math.abs(dy - my) > 1;
        r.layoutChanged = changed;
        if (!changed) continue;
      }
      const file = `${safe(r.key)}@${w}.png`;
      try {
        await p.locator(`[data-inv-i="${r.i}"]`).screenshot({ path: path.join(SHOTS, file), animations: 'disabled', timeout: 15000 });
        (shots[r.key] ||= {})[w] = 'shots/' + file;
      } catch (e) { skipped.push({ w, key: r.key, why: 'screenshot failed: ' + e.message.split('\n')[0] }); }
    }
  }
  await ctx.close();
}
await b.close();

const base = runs[1440];
const keys = new Set(); for (const w of WIDTHS) runs[w].records.forEach((r) => keys.add(r.key));
const missingAt = {}; for (const w of WIDTHS) missingAt[w] = [...keys].filter((k) => !runs[w].records.some((r) => r.key === k));
const inventory = base.records.map((r) => {
  const at = (w) => runs[w].records.find((x) => x.key === r.key);
  const { i, ...rest } = r;
  return { ...rest, box: { 375: at(375)?.box ?? null, 768: at(768)?.box ?? null, 1440: r.box }, visible: { 375: at(375)?.visible ?? false, 768: at(768)?.visible ?? false, 1440: r.visible }, layoutChanged375: at(375)?.layoutChanged ?? null, screenshots: shots[r.key] || {} };
});
const extra = [...keys].filter((k) => !base.records.some((r) => r.key === k));
const tagOk = (r) => r.srcTag && r.srcTag.replace(/^sc-raw-/, '') === r.tag;
const tagAgree = inventory.filter(tagOk).length;
const tagDis = inventory.filter((r) => !tagOk(r)).map((r) => [r.key, r.srcTag, r.tag]);
const dupKeys = inventory.length - new Set(inventory.map((r) => r.key)).size;
let s = 20261009; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = new Set(); while (pick.size < 5) pick.add(Math.floor(rnd() * inventory.length));
const samples = [...pick].map((ix) => { const r = inventory[ix]; return { key: r.key, renderedTag: r.tag, srcTag: r.srcTag, renderedWords: r.words, srcOwnText: r.srcOwnText, attrs: r.attrs, snippet: r.snippet }; });
const checks = { url: URL_, root: base.root, footerTpl: base.footerTpl, recordsAt1440: inventory.length, stampedDescendantsPlusFooter: base.stampedDesc + 1, allDescendantsPlusFooter: base.totalDesc + 1, unstamped: base.unstamped, perWidthCounts: Object.fromEntries(WIDTHS.map((w) => [w, runs[w].records.length])), missingAt, extraKeysNotAt1440: extra, duplicateKeys: dupKeys, tagAgree, tagDisagree: tagDis, screenshotSkips: skipped, hiddenOverlays: { 1440: runs[1440].hiddenOverlays, 375: runs[375].hiddenOverlays }, shotCount: Object.values(shots).reduce((a, o) => a + Object.keys(o).length, 0), samples };
fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify({ generated: new Date().toISOString(), source: URL_, keyFormat: 'importPath/tplNumber#copyIndex (copy index = document-order position among same-numbered elements in the same dc-import host)', breakpoints: { mobile: '<768', tablet: '768-1023', desktop: '>=1024' }, checks, elements: inventory }, null, 1));
console.log(JSON.stringify(checks, null, 1));
