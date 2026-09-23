// Draft-vs-live comparison tool. Method and usage: README.md in this folder.
// Env: DRAFT_URL (draft served locally), LIVE_URL (live page, no query string), OUT_DIR (captures + result json).
// Draft vs live reviews section at 1440, 768, 375: structure + position + presence + fonts, and section screenshots.
const { createRequire } = require('module');
const req = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const { chromium } = req('playwright');
const fs = require('fs');
const OUT = (process.env.OUT_DIR || require('os').tmpdir()).split('\\').join('/') + '/' + 'r3w_';
const PAGES = [
  ['draft', (process.env.DRAFT_URL || 'http://localhost:8731/Eye%20Care%20Birmingham.dc.html')],
  ['live', (process.env.LIVE_URL || 'https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/') + '?cb=' + Date.now()],
];

function probe() {
  const vis = (e) => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const leaf = (re, root = document.body) => [...root.querySelectorAll('*')].filter((e) => [...e.childNodes].every((n) => n.nodeType === 3 || n.nodeType === 8) && re.test((e.textContent || '').trim()) && vis(e));
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom + scrollY), r: Math.round(r.right) }; };
  const count = leaf(/^15 reviews$/)[0];
  let card = null;
  for (let a = count; a; a = a.parentElement) { const c = getComputedStyle(a); if (parseFloat(c.borderTopWidth) > 0.3 && parseFloat(c.borderTopLeftRadius) >= 8) { card = a; break; } }
  if (!count) return { error: 'no count leaf; candidates=' + [...document.querySelectorAll('*')].filter((e) => /^15 reviews$/.test((e.textContent || '').trim())).map((e) => e.tagName + ':' + [...e.childNodes].map((n) => n.nodeType).join('') + ':' + vis(e)).join('|') };
  if (!card) { const ch=[]; for (let a = count; a; a = a.parentElement) { const c = getComputedStyle(a); ch.push(a.tagName+'.'+String(a.className).slice(0,30)+':'+c.borderTopWidth+':'+c.borderTopLeftRadius); } return { error: 'no card: ' + ch.join(' > ') }; }
  const heading = leaf(/^What people say$/)[0];
  const caption = leaf(/^Google Reviews$/, card)[0];
  const score = leaf(/^4\.7$/, card)[0];
  // header G: the image/svg nearest the caption inside the card header area, above the first author
  const firstAuthor = leaf(/^Anonymous M\.$/, card)[0];
  const authorTop = firstAuthor ? firstAuthor.getBoundingClientRect().top : 1e9;
  const imgs = [...card.querySelectorAll('img, svg')].filter(vis);
  const headerImgs = imgs.filter((i) => i.getBoundingClientRect().bottom < authorTop - 20 && i.getBoundingClientRect().width >= 20 && !i.closest('button,a'));
  const logo = headerImgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || null;
  // review cards: bordered ancestors of each author-like leaf that sit below the header
  const authors = ['Anonymous M.', 'Neelum Mushtaq', 'Hanif Ur-Rehman', 'Sadia K'].map((n) => leaf(new RegExp('^' + n.replace('.', '\\.') + '$'), card)[0]).filter(Boolean);
  const reviewBox = (a) => { for (let e = a; e && e !== card; e = e.parentElement) { const c = getComputedStyle(e); if (parseFloat(c.borderTopWidth) > 0.3 && parseFloat(c.paddingTop) >= 8) return e; } return null; };
  const cards = authors.map(reviewBox).filter(Boolean);
  const allCards = cards.length ? [...cards[0].parentElement.children].filter(vis) : [];
  // per-card G: a small (<=24px) img/svg in the top part of each card, not a star
  const cardLogos = allCards.map((c) => [...c.querySelectorAll('img, svg')].filter((i) => vis(i) && i.getBoundingClientRect().width >= 12 && i.getBoundingClientRect().width <= 24 && !/star/i.test((i.getAttribute('class') || '') + (i.parentElement.getAttribute('class') || '')) && i.getBoundingClientRect().top - c.getBoundingClientRect().top < 60).length > 0).filter(Boolean).length;
  // arrows: buttons whose label or class mentions prev/next/more/previous
  const arrows = [...card.querySelectorAll('button')].filter((b) => vis(b) && /prev|next|more|previous/i.test((b.getAttribute('aria-label') || '') + ' ' + b.className));
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlap = arrows.reduce((s, a) => s + allCards.reduce((t, c) => t + inter(a.getBoundingClientRect(), c.getBoundingClientRect()), 0), 0);
  const rail = allCards.length ? allCards[0].parentElement : null;
  const railR = rail ? rail.getBoundingClientRect() : null;
  const arrowPos = arrows.map((a) => { const r = a.getBoundingClientRect(); return (railR && r.top >= railR.bottom - 2 ? 'below' : 'beside/over') + '@' + Math.round(r.left) + ',' + Math.round(r.top + scrollY); });
  const dots = [...card.querySelectorAll('[role="tab"], [class*="dot"]')].filter((d) => vis(d) && d.getBoundingClientRect().width <= 16).length;
  const railCs = rail ? getComputedStyle(rail) : null;
  const scrollbar = rail ? { overflowX: railCs.overflowX, scrollbarWidth: railCs.scrollbarWidth, gutter: rail.offsetHeight - rail.clientHeight } : null;
  const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '') + ' ' + f.weight);
  const f = (e) => e ? getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '') : null;
  return {
    headingX: heading ? R(heading).x : null, headingFont: f(heading), cardX: card ? R(card).x : null, cardW: card ? R(card).w : null,
    logo: logo ? { ...R(logo), leftOfCaption: caption ? R(logo).x < R(caption).x : null } : null,
    captionX: caption ? R(caption).x : null, scoreFont: f(score),
    reviewCards: allCards.length, cardsWithLogo: cardLogos, reviewCardW: cards[0] ? R(cards[0]).w : null, reviewCardH: cards[0] ? R(cards[0]).h : null,
    arrows: arrows.length, arrowPos, arrowCardOverlapPx2: Math.round(overlap), dots, scrollbar,
    fontsLoaded: [...new Set(fonts)].filter((x) => /roboto|playfair|outfit|inter|dm/i.test(x)),
    clip: heading && card ? { y: R(heading).y - 40, h: R(card).b - R(heading).y + 60 } : null,
  };
}

(async () => {
  const b = await chromium.launch({ headless: false, args: ['--force-device-scale-factor=1'] });
  const out = {};
  for (const w of [1440, 768, 375]) {
    for (const [name, url] of PAGES) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
      const pg = await ctx.newPage();
      await pg.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(2500);
      await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
      await pg.evaluate(() => document.fonts.ready);
      const target = await pg.evaluateHandle(() => [...document.querySelectorAll('*')].find((e) => /^What people say$/.test((e.textContent || '').trim()) && e.children.length === 0));
      if (target.asElement()) { await target.asElement().scrollIntoViewIfNeeded(); await pg.waitForTimeout(800); }
      const r = await pg.evaluate(probe).catch((e) => ({ error: String(e) }));
      out[name + '@' + w] = r;
      if (r.clip) {
        await pg.screenshot({ path: OUT + name + '_' + w + '.png', fullPage: true, clip: { x: 0, y: Math.max(0, r.clip.y), width: w, height: r.clip.h } }).catch((e) => console.log('shot', e.message));
      }
      await ctx.close();
    }
  }
  await b.close();
  fs.writeFileSync(OUT + 'result.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
