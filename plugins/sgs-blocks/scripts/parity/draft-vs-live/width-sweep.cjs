// Draft-vs-live comparison tool. Method and usage: README.md in this folder.
// Env: DRAFT_URL (draft served locally), LIVE_URL (live page, no query string), OUT_DIR (captures + result json).
// Width sweep of the reviews section: draft vs live. Header layout (stacked or not), content width, heading x.
const { createRequire } = require('module');
const { chromium } = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json')('playwright');
const fs = require('fs');
const OUT = (process.env.OUT_DIR || require('os').tmpdir()).split('\\').join('/') + '/' + 'sw_';
const WIDTHS = [360, 390, 412, 430, 480, 600, 700, 820, 1024, 1280, 1440, 1920];
const PAGES = [['draft', (process.env.DRAFT_URL || 'http://localhost:8731/Eye%20Care%20Birmingham.dc.html')], ['live', (process.env.LIVE_URL || 'https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/') + '?cb=' + Date.now()]];
function probe() {
  const vis = (e) => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const leaf = (re, root = document.body) => [...root.querySelectorAll('*')].filter((e) => [...e.childNodes].every((n) => n.nodeType === 3 || n.nodeType === 8) && re.test((e.textContent || '').trim()) && vis(e));
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), b: Math.round(r.bottom), r: Math.round(r.right) }; };
  let card = null;
  const counts = leaf(/^15 reviews$/);
  let count = null;
  for (const c0 of counts) { for (let a = c0; a; a = a.parentElement) { const c = getComputedStyle(a); if (parseFloat(c.borderTopWidth) > 0.3 && parseFloat(c.borderTopLeftRadius) >= 8 && leaf(/^Google Reviews$/, a).length) { card = a; count = c0; break; } } if (card) break; }
  if (!card) return { error: 'no card: ' + counts.length + ' counts' };
  for (let a = null; a; a = a.parentElement) { const c = getComputedStyle(a); if (parseFloat(c.borderTopWidth) > 0.3 && parseFloat(c.borderTopLeftRadius) >= 8) { card = a; break; } }
  if (!card) return { error: 'no card' };
  const heading = leaf(/^What people say$/)[0];
  const score = leaf(/^4\.7$/, card)[0], see = leaf(/^See all reviews$/, card)[0], write = leaf(/^Write a review$/, card)[0], cap = leaf(/^Google Reviews$/, card)[0];
  const S = R(score), SA = R(see), W = R(write), C = R(count);
  return {
    headingX: heading ? R(heading).x : null, cardX: R(card).x, cardW: R(card).w,
    buttonsBelowScore: SA.y >= S.b, buttonsSideBySide: Math.abs(SA.y - W.y) < 4,
    scoreRowW: Math.max(C.r, S.r) - R(cap).x, seeX: SA.x, seeXrel: SA.x - R(card).x,
  };
}
(async () => {
  const b = await chromium.launch({ headless: false, args: ['--force-device-scale-factor=1'] });
  const out = {};
  for (const w of WIDTHS) for (const [name, url] of PAGES) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const pg = await ctx.newPage();
    await pg.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(2000);
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    const t = await pg.evaluateHandle(() => [...document.querySelectorAll('*')].find((e) => /^Google Reviews$/.test((e.textContent || '').trim()) && e.children.length === 0));
    if (t.asElement()) { await t.asElement().scrollIntoViewIfNeeded(); await pg.waitForTimeout(600); }
    out[name + '@' + w] = await pg.evaluate(probe).catch((e) => ({ error: String(e) }));
    if ([412, 600, 1920].includes(w)) {
      const card = await pg.evaluateHandle(() => { const c = [...document.querySelectorAll('*')].find((e) => /^Google Reviews$/.test((e.textContent || '').trim()) && e.children.length === 0); let a = c; while (a && !(parseFloat(getComputedStyle(a).borderTopLeftRadius) >= 8 && parseFloat(getComputedStyle(a).borderTopWidth) > 0.3)) a = a.parentElement; return a; });
      if (card.asElement()) await pg.screenshot({ path: OUT + name + '_' + w + '.png', clip: await card.asElement().boundingBox().then((bb) => ({ x: 0, y: Math.max(0, bb.y - 120), width: w, height: Math.min(420, bb.height + 120) })) }).catch(() => {});
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUT + 'result.json', JSON.stringify(out, null, 1));
})();
