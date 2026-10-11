// node trace-check.mjs <handoff folder> [entry .dc.html] [--shift=<ms>]
// Loads the entry page at 1440, scrolls it, and logs every Web Animations call, CSS animation start and CSS
// transition run with the element's data-dc-tpl id (or its nearest stamped ancestor's). Each distinct
// (mechanism, element, duration) is matched to an animations.json record by template_tpl_id or nearest_tpl_id and
// duration_ms; a record whose duration is a formula string matches any non-integer duration.
// Negative control: --shift=7 adds 7ms to every record's duration, so a sound match count drops to 0.
import { pathToFileURL } from 'node:url'; import fs from 'node:fs';
const REPO = 'C:/Users/Bean/Projects/small-giants-wp';
const { serveDraft } = await import(pathToFileURL(REPO + '/scripts/computed-route/lib/draft.mjs').href);
const { chromium } = await import(pathToFileURL(REPO + '/plugins/sgs-blocks/node_modules/playwright/index.mjs').href);

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith('--'));
const shift = Number((args.find((a) => a.startsWith('--shift=')) || '--shift=0').split('=')[1]);
const index = args.filter((a) => !a.startsWith('--'))[1]
  || fs.readdirSync(folder).find((f) => f.endsWith('.dc.html') && /website|home|birmingham/i.test(f));
if (!folder || !index) { console.error('usage: node trace-check.mjs <handoff folder> [entry .dc.html] [--shift=<ms>]'); process.exit(2); }

const recs = JSON.parse(fs.readFileSync(folder + '/animations.json', 'utf8')).records;
const srv = await serveDraft(folder, { index });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  window.__log = [];
  const ms = (s) => (s.trim().endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000);
  const push = (kind, el, dur, name) => {
    if (!(el instanceof Element)) return;
    const host = el.closest('[data-dc-tpl]');
    window.__log.push({ kind, tpl: el.getAttribute('data-dc-tpl'), near: host && host.getAttribute('data-dc-tpl'), dur, name });
  };
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opt) {
    const o = typeof opt === 'number' ? { duration: opt } : (opt || {});
    push('waapi', this, o.duration, o.easing || 'linear');
    return orig.call(this, kf, opt);
  };
  addEventListener('animationstart', (e) => {
    const cs = getComputedStyle(e.target);
    const names = cs.animationName.split(',').map((s) => s.trim());
    const durs = cs.animationDuration.split(',');
    push('css-animation', e.target, Math.round(ms(durs[Math.max(0, names.indexOf(e.animationName))] || durs[0])), e.animationName);
  }, true);
  addEventListener('transitionrun', (e) => {
    const cs = getComputedStyle(e.target);
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    let i = props.indexOf(e.propertyName); if (i < 0) i = props.indexOf('all');
    push('css-transition', e.target, Math.round(ms(cs.transitionDuration.split(',')[Math.max(0, i)] || '0s')), e.propertyName);
  }, true);
});
await page.goto(srv.url + encodeURI(index), { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
});
await page.waitForTimeout(1500);
const log = await page.evaluate(() => window.__log);
await browser.close(); await srv.close();

// A record names its element by template_tpl_id, by nearest_tpl_id, or (structural targets) inside element/trace text.
const names = (r, t) => String(r.element?.template_tpl_id) === t
  || [].concat(r.element?.nearest_tpl_id ?? []).map(String).includes(t)
  || JSON.stringify(r.element || {}).includes(`"${t}"`)
  || JSON.stringify(r.trace || {}).includes(t);
// duration_ms is a number, or text: "per property" (each properties[] entry carries its own duration_ms) or a formula.
const durOk = (r, dur) => {
  if (typeof r.duration_ms !== 'string') return Number(r.duration_ms) + shift === Number(dur);
  const perProp = (r.properties || []).map((p) => p.duration_ms).filter((d) => typeof d === 'number');
  if (perProp.length) return perProp.some((d) => d + shift === Number(dur));
  return shift === 0 && !Number.isInteger(Number(dur));
};
const combos = new Map();
for (const c of log) { const k = `${c.kind}|${c.tpl || '-'}|${c.near}|${c.dur}`; combos.set(k, (combos.get(k) || 0) + 1); }
let matched = 0; const miss = [];
for (const [k, n] of combos) {
  const [, tpl, near, dur] = k.split('|');
  const hit = recs.find((r) => durOk(r, dur) && [tpl, near].some((t) => t && t !== '-' && names(r, t)));
  if (hit) matched++; else miss.push(`${k} x${n}`);
}
console.log(`[${index} shift=${shift}] records ${recs.length}, events ${log.length}, distinct ${combos.size}, matched ${matched}`);
if (miss.length) console.log(miss.slice(0, 25).join('\n'));
