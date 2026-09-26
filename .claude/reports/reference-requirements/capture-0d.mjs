// Step 0d capture: header entrance, footer reveal, footer hover, reduced-motion rerun.
// Run: node .claude/reports/reference-requirements/capture-0d.mjs [ref1 ref2 ...]
// Repo-root relative paths assumed (run from C:\Users\Bean\Projects\small-giants-wp).
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const req = createRequire(path.resolve('plugins/sgs-blocks/package.json'));
const { chromium } = req('playwright');

const RAW_DIR = path.resolve('.claude/reports/reference-requirements/raw');
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

const SITES = {
  dogstudio: { url: 'https://dogstudio.co', hasFooter: true },
  lamalama: { url: 'https://lamalama.com/', hasFooter: true },
  lusion: { url: 'https://lusion.co/', hasFooter: true },
  studionamma: { url: 'https://studionamma.com', hasFooter: true },
  halcyon: { url: 'http://127.0.0.1:8731/Mega%20Menu.dc.html', hasFooter: false },
  'indus-foods': { url: 'http://127.0.0.1:8732/Indus%20Foods%20Mega%20Menu.dc.html', hasFooter: false },
};

const ENTRANCE_INIT_SCRIPT = () => {
  window.__entranceSamples = [];
  window.__preloaderLog = [];
  window.__entranceStart = performance.now();
  function findHeader() {
    const direct = document.querySelector('header');
    if (direct) {
      const r = direct.getBoundingClientRect();
      if (r.width > 300 && r.top < 200) return direct;
    }
    const cands = Array.from(
      document.querySelectorAll(
        'nav, [class*="header" i], [class*="nav" i], [class*="site-header" i]'
      )
    );
    let best = null;
    let bestArea = 0;
    for (const el of cands) {
      const r = el.getBoundingClientRect();
      if (r.width > 300 && r.top < 200 && r.height > 20) {
        const area = r.width * r.height;
        if (area > bestArea) {
          bestArea = area;
          best = el;
        }
      }
    }
    return best || direct || null;
  }
  function findPreloader() {
    const cands = Array.from(
      document.querySelectorAll(
        '[class*="preload" i], [class*="loader" i], [class*="intro" i], [id*="preload" i], [id*="loader" i]'
      )
    );
    return (
      cands.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > window.innerWidth * 0.5 && r.height > window.innerHeight * 0.5;
      }) || null
    );
  }
  function snap(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      opacity: cs.opacity,
      transform: cs.transform,
      visibility: cs.visibility,
      display: cs.display,
    };
  }
  function pick() {
    const header = findHeader();
    const preloader = findPreloader();
    let logo = null;
    let nav0 = null;
    let nav1 = null;
    if (header) {
      logo = header.querySelector('a[href="/"] img, a[href="/"] svg, [class*="logo" i]') || null;
      const navLinks = header.querySelectorAll('nav a, [class*="nav" i] a, [class*="menu" i] a');
      nav0 = navLinks[0] || null;
      nav1 = navLinks[1] || null;
    }
    return {
      t: Math.round(performance.now() - window.__entranceStart),
      header: snap(header),
      logo: snap(logo),
      nav0: snap(nav0),
      nav1: snap(nav1),
      preloader: preloader ? { present: true, ...snap(preloader), className: preloader.className } : { present: false },
    };
  }
  window.__entranceSamples.push(pick());
  let count = 0;
  window.__entranceInterval = setInterval(() => {
    window.__entranceSamples.push(pick());
    count++;
    // 160 * 50ms = 8s: the spec calls for 3s, but several references (e.g.
    // studionamma) run a preloader-gated intro that completes only at 8-9s;
    // sampling for 3s alone would under-report a real, longer entrance.
    if (count >= 160) clearInterval(window.__entranceInterval);
  }, 50);
  // Cheaper preloader-only tracker (10s @ 150ms) so a preloader that outlives
  // the header sampling window is still timed accurately.
  let pcount = 0;
  window.__preloaderInterval = setInterval(() => {
    const preloader = findPreloader();
    window.__preloaderLog.push({
      t: Math.round(performance.now() - window.__entranceStart),
      present: !!preloader,
      className: preloader ? preloader.className : null,
    });
    pcount++;
    if (pcount >= 66) clearInterval(window.__preloaderInterval); // ~10s
  }, 150);
};

async function captureEntrance(page, url, label) {
  await page.addInitScript(ENTRANCE_INIT_SCRIPT);
  await page.goto(url, { waitUntil: 'commit', timeout: 45000 }).catch((e) => {
    console.log(`  [${label}] goto commit warning: ${e.message}`);
  });
  await page.waitForTimeout(10300);
  const samples = await page.evaluate(() => window.__entranceSamples || []);
  const preloaderLog = await page.evaluate(() => window.__preloaderLog || []);
  let anims = [];
  try {
    anims = await page.evaluate(() => {
      const header =
        document.querySelector('header') || document.querySelector('[class*="header" i]');
      if (!header) return [];
      const list = [];
      try {
        for (const a of document.getAnimations()) {
          const target = a.effect && a.effect.target;
          if (target && (target === header || header.contains(target))) {
            list.push({
              playState: a.playState,
              startTime: a.startTime,
              currentTime: a.currentTime,
              effect: a.effect && a.effect.getTiming ? a.effect.getTiming() : null,
            });
          }
        }
      } catch (e) {}
      return list;
    });
  } catch (e) {}
  return { samples, preloaderLog, webAnimations: anims };
}

// Pure function, no outer closure — safe to hand to page.evaluate() as a value
// (Playwright serialises the function source, it never runs in Node).
export function findFooterInPage() {
  const tagged = Array.from(document.querySelectorAll('footer'));
  const cands = tagged.length ? tagged : Array.from(document.querySelectorAll('[class*="footer" i]'));
  let best = null;
  let bestScore = -1;
  for (const el of cands) {
    const r = el.getBoundingClientRect();
    if (r.width < 300) continue;
    let rejected = false;
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cls = (p.className || '').toString();
      if (/\bsite-menu\b|\bdrawer\b|\boffcanvas\b/i.test(cls)) {
        rejected = true;
        break;
      }
      p = p.parentElement;
    }
    if (rejected) continue;
    const docTop = r.top + window.scrollY;
    if (docTop > bestScore) {
      bestScore = docTop;
      best = el;
    }
  }
  return best;
}

// Uses real Playwright mouse-wheel input (not window.scrollBy from inside the
// page) because several references (lamalama, lusion) drive a custom scroll
// container from real 'wheel' DOM events; a JS-only scrollBy() never moves
// their content and reports a permanently-unrevealed footer.
export async function captureFooterReveal(page) {
  const setup = await page.evaluate(() => {
    function findFooter() {
      const tagged = Array.from(document.querySelectorAll('footer'));
      const cands = tagged.length ? tagged : Array.from(document.querySelectorAll('[class*="footer" i]'));
      let best = null;
      let bestScore = -1;
      for (const el of cands) {
        const r = el.getBoundingClientRect();
        if (r.width < 300) continue;
        let rejected = false;
        let p = el.parentElement;
        while (p && p !== document.body) {
          const cls = (p.className || '').toString();
          if (/\bsite-menu\b|\bdrawer\b|\boffcanvas\b/i.test(cls)) {
            rejected = true;
            break;
          }
          p = p.parentElement;
        }
        if (rejected) continue;
        const docTop = r.top + window.scrollY;
        if (docTop > bestScore) {
          bestScore = docTop;
          best = el;
        }
      }
      return best;
    }
    const footer = findFooter();
    if (!footer) return { ok: false };
    let items = Array.from(
      footer.querySelectorAll('[class*="appear" i], [class*="fade" i], [class*="reveal" i]')
    ).slice(0, 5);
    if (!items.length) items = Array.from(footer.children).slice(0, 5);
    items.forEach((el, i) => el.setAttribute('data-cap0d-item', String(i)));
    const fr = footer.getBoundingClientRect();
    return { ok: true, count: items.length, footerTopInitial: Math.round(fr.top) };
  });
  if (!setup.ok) return null;

  async function snap() {
    return page.evaluate(() => {
      function findFooter() {
        const tagged = Array.from(document.querySelectorAll('footer'));
        const cands = tagged.length ? tagged : Array.from(document.querySelectorAll('[class*="footer" i]'));
        let best = null;
        let bestScore = -1;
        for (const el of cands) {
          const r = el.getBoundingClientRect();
          if (r.width < 300) continue;
          const docTop = r.top + window.scrollY;
          if (docTop > bestScore) {
            bestScore = docTop;
            best = el;
          }
        }
        return best;
      }
      const footer = findFooter();
      const fr = footer ? footer.getBoundingClientRect() : null;
      const items = Array.from(document.querySelectorAll('[data-cap0d-item]')).sort(
        (a, b) => Number(a.getAttribute('data-cap0d-item')) - Number(b.getAttribute('data-cap0d-item'))
      );
      return {
        footerTop: fr ? Math.round(fr.top) : null,
        items: items.map((c) => {
          const cs = getComputedStyle(c);
          return { cls: c.className.slice(0, 60), opacity: cs.opacity, transform: cs.transform };
        }),
      };
    });
  }

  const out = [];
  const t0 = Date.now();
  out.push({ t: 0, ...(await snap()) });
  const vp = page.viewportSize() || { width: 1440, height: 900 };
  await page.mouse.move(Math.round(vp.width / 2), Math.round(vp.height / 2));
  // Long-page references (lusion) keep the footer tens of thousands of px
  // below the fold via a transformed scroll wrapper; coarse-scroll first,
  // then switch to fine 50ms-stepped sampling once it is within ~2 viewports.
  let guard = 0;
  while (guard < 400) {
    const probe = await snap();
    if (probe.footerTop !== null && probe.footerTop < 1800) break;
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(30);
    guard++;
  }
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(50);
    out.push({ t: Date.now() - t0, ...(await snap()) });
  }
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(50);
    out.push({ t: Date.now() - t0, ...(await snap()) });
  }
  return out;
}

export async function captureFooterHover(page) {
  const footerHandle = await page.evaluateHandle(findFooterInPage);
  const footer = footerHandle.asElement();
  if (!footer) return null;
  const allLinks = await footer.$$('a');
  const visible = [];
  for (const l of allLinks) {
    const box = await l.boundingBox();
    if (box && box.width > 4 && box.height > 4) visible.push({ el: l, box });
  }
  if (visible.length === 0) return { note: 'no visible footer links' };
  let targets = visible.slice(0, 3);
  // Prefer to also include one social-icon link if the footer has one and it
  // was not already captured in the first three.
  const socialLinks = await footer.$$(
    '[class*="social" i] a, a[class*="social" i], a[href*="instagram" i], a[href*="facebook" i], a[href*="twitter" i], a[href*="linkedin" i], a[href*="dribbble" i]'
  );
  for (const s of socialLinks) {
    const box = await s.boundingBox();
    if (!box || box.width <= 4 || box.height <= 4) continue;
    targets.push({ el: s, box, isSocial: true });
    break;
  }
  const out = [];
  for (let i = 0; i < targets.length; i++) {
    const { el, box } = targets[i];
    const before = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        color: cs.color,
        opacity: cs.opacity,
        textDecoration: cs.textDecorationLine,
        transform: cs.transform,
        background: cs.backgroundColor,
        transitionProperty: cs.transitionProperty,
        transitionDuration: cs.transitionDuration,
        transitionTimingFunction: cs.transitionTimingFunction,
        text: e.textContent.trim().slice(0, 40),
      };
    });
    const siblingIdx = i + 1 < targets.length ? i + 1 : i - 1 >= 0 ? i - 1 : null;
    const siblingBefore =
      siblingIdx !== null
        ? await targets[siblingIdx].el.evaluate((e) => getComputedStyle(e).color)
        : null;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const during = [];
    for (let t = 0; t <= 600; t += 50) {
      const snap = await el.evaluate((e) => {
        const cs = getComputedStyle(e);
        return { color: cs.color, opacity: cs.opacity, transform: cs.transform };
      });
      during.push({ t, ...snap });
      await page.waitForTimeout(50);
    }
    const after = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        color: cs.color,
        opacity: cs.opacity,
        textDecoration: cs.textDecorationLine,
        transform: cs.transform,
        background: cs.backgroundColor,
      };
    });
    const siblingAfter =
      siblingIdx !== null
        ? await targets[siblingIdx].el.evaluate((e) => getComputedStyle(e).color)
        : null;
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
    out.push({
      index: i,
      text: before.text,
      isSocial: !!targets[i].isSocial,
      before,
      during,
      after,
      siblingDim:
        siblingBefore !== null && siblingBefore !== siblingAfter
          ? { before: siblingBefore, after: siblingAfter }
          : 'no change',
    });
  }
  return out;
}

async function run(refs) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1500,1000'] });
  const results = {};
  for (const ref of refs) {
    const site = SITES[ref];
    if (!site) {
      console.log(`Unknown ref ${ref}, skipping`);
      continue;
    }
    console.log(`=== ${ref} (${site.url}) ===`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const refResult = { url: site.url };

    console.log('  entrance (normal motion)...');
    refResult.entrance = await captureEntrance(page, site.url, ref);

    if (site.hasFooter) {
      console.log('  footer reveal...');
      try {
        refResult.footerReveal = await captureFooterReveal(page);
      } catch (e) {
        refResult.footerRevealError = e.message;
      }
      console.log('  footer hover...');
      try {
        refResult.footerHover = await captureFooterHover(page);
      } catch (e) {
        refResult.footerHoverError = e.message;
      }
    } else {
      refResult.footerReveal = null;
      refResult.footerHover = null;
      refResult.footerNote = 'footer row is absent in this design; skipped per protocol';
    }

    console.log('  entrance (reduced motion)...');
    const context2 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const page2 = await context2.newPage();
    refResult.entranceReducedMotion = await captureEntrance(page2, site.url, ref + '-reduced');
    await context2.close();

    await context.close();
    results[ref] = refResult;
    fs.writeFileSync(
      path.join(RAW_DIR, `${ref}-0d.json`),
      JSON.stringify(refResult, null, 1),
      'utf-8'
    );
    console.log(`  wrote raw/${ref}-0d.json`);
  }
  await browser.close();
  return results;
}

const refs = process.argv.slice(2);
if (refs.length === 0) {
  console.error('Usage: node capture-0d.mjs <ref> [ref2 ...]');
  process.exit(1);
}
run(refs).then(() => console.log('done')).catch((e) => {
  console.error(e);
  process.exit(1);
});
