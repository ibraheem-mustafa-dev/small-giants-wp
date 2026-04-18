const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PAGES = [
  { name: 'homepage', url: 'https://palestine-lives.org/' },
  { name: 'food-service', url: 'https://palestine-lives.org/food-service/' },
  { name: 'manufacturing', url: 'https://palestine-lives.org/manufacturing/' },
  { name: 'retail', url: 'https://palestine-lives.org/retail/' },
  { name: 'wholesale', url: 'https://palestine-lives.org/wholesale/' },
  { name: 'contact', url: 'https://palestine-lives.org/contact/' },
];

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const OUTPUT_DIR = path.join(__dirname);

async function runAudit() {
  const results = {};
  const browser = await chromium.launch({ headless: true });

  for (const page of PAGES) {
    results[page.name] = { screenshots: {}, console: [], performance: {}, seo: {}, accessibility: {}, css: {}, security: {} };

    for (const bp of BREAKPOINTS) {
      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        userAgent: bp.name === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
          : undefined,
      });
      const tab = await context.newPage();

      // Collect console messages
      const consoleMessages = [];
      tab.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          consoleMessages.push({ type: msg.type(), text: msg.text() });
        }
      });

      try {
        const response = await tab.goto(page.url, { waitUntil: 'networkidle', timeout: 30000 });
        const status = response ? response.status() : 'unknown';

        // Wait for content to settle
        await tab.waitForTimeout(2000);

        // Screenshot
        const screenshotPath = path.join(OUTPUT_DIR, `${page.name}-${bp.name}.png`);
        await tab.screenshot({ path: screenshotPath, fullPage: true });
        results[page.name].screenshots[bp.name] = screenshotPath;

        // Only do deep checks on desktop (to avoid redundancy)
        if (bp.name === 'desktop') {
          // Performance metrics
          const perfData = await tab.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            const resourceBreakdown = {};
            resources.forEach(r => {
              const ext = r.name.split('?')[0].split('.').pop().toLowerCase();
              if (!resourceBreakdown[ext]) resourceBreakdown[ext] = { count: 0, size: 0 };
              resourceBreakdown[ext].count++;
              resourceBreakdown[ext].size += (r.transferSize || 0);
            });
            return {
              ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
              domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
              fullLoad: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
              totalRequests: resources.length,
              totalTransferSize: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
              resourceBreakdown,
              domSize: document.querySelectorAll('*').length,
            };
          });
          results[page.name].performance = perfData;

          // SEO checks
          const seoData = await tab.evaluate(() => {
            const getMeta = (name) => {
              const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
              return el ? el.getAttribute('content') : null;
            };
            const headings = {};
            ['h1','h2','h3','h4','h5','h6'].forEach(tag => {
              const els = document.querySelectorAll(tag);
              headings[tag] = { count: els.length, texts: Array.from(els).map(e => e.textContent.trim().substring(0, 80)) };
            });
            const images = Array.from(document.querySelectorAll('img'));
            const imagesWithoutAlt = images.filter(i => !i.getAttribute('alt') || i.getAttribute('alt').trim() === '');
            const links = Array.from(document.querySelectorAll('a[href]'));
            const internalLinks = links.filter(l => l.hostname === window.location.hostname);
            const canonical = document.querySelector('link[rel="canonical"]');
            const ogTitle = getMeta('og:title');
            const ogDesc = getMeta('og:description');
            const ogImage = getMeta('og:image');
            const twitterCard = getMeta('twitter:card');
            const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const schemas = schemaScripts.map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
            return {
              title: document.title,
              titleLength: document.title.length,
              metaDescription: getMeta('description'),
              metaDescLength: getMeta('description') ? getMeta('description').length : 0,
              headings,
              totalImages: images.length,
              imagesWithoutAlt: imagesWithoutAlt.length,
              missingAltSrc: imagesWithoutAlt.map(i => i.src.split('/').pop()).slice(0, 10),
              totalLinks: links.length,
              internalLinks: internalLinks.length,
              canonical: canonical ? canonical.href : null,
              ogTitle, ogDesc, ogImage, twitterCard,
              schemas: schemas.map(s => s['@type'] || s.type || 'unknown'),
              lang: document.documentElement.lang,
            };
          });
          results[page.name].seo = seoData;

          // CSS measurements
          const cssData = await tab.evaluate(() => {
            const getStyle = (selector) => {
              const el = document.querySelector(selector);
              if (!el) return null;
              const s = getComputedStyle(el);
              return {
                fontSize: s.fontSize,
                lineHeight: s.lineHeight,
                fontFamily: s.fontFamily,
                color: s.color,
                letterSpacing: s.letterSpacing,
                fontWeight: s.fontWeight,
              };
            };
            // Character measure
            const p = document.querySelector('p');
            let charMeasure = null;
            if (p && p.textContent && p.textContent.length > 20) {
              const range = document.createRange();
              range.selectNodeContents(p);
              const w = range.getBoundingClientRect().width;
              charMeasure = Math.round(p.textContent.length * (w / range.toString().length));
            }
            // Hover rules count
            let hoverRules = 0;
            for (const sheet of document.styleSheets) {
              try { for (const rule of sheet.cssRules) { if (rule.selectorText && rule.selectorText.includes(':hover')) hoverRules++; } } catch {}
            }
            // Colour palette extraction
            const allElements = document.querySelectorAll('*');
            const colours = new Set();
            const bgColours = new Set();
            Array.from(allElements).slice(0, 500).forEach(el => {
              const s = getComputedStyle(el);
              if (s.color && s.color !== 'rgba(0, 0, 0, 0)') colours.add(s.color);
              if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgColours.add(s.backgroundColor);
            });
            return {
              body: getStyle('p'),
              h1: getStyle('h1'),
              h2: getStyle('h2'),
              h3: getStyle('h3'),
              charMeasure,
              hoverRules,
              textColours: Array.from(colours).slice(0, 20),
              bgColours: Array.from(bgColours).slice(0, 20),
            };
          });
          results[page.name].css = cssData;

          // Accessibility checks
          const a11yData = await tab.evaluate(() => {
            const issues = [];
            // Check images without alt
            document.querySelectorAll('img').forEach(img => {
              const alt = img.getAttribute('alt');
              if (alt === null) issues.push({ type: 'error', msg: `Image missing alt attribute: ${img.src.split('/').pop()}` });
              else if (alt === '' && !img.getAttribute('role') && !img.closest('[role="presentation"]')) {
                // Empty alt might be decorative - check if it looks decorative
              }
            });
            // Check buttons/links without accessible text
            document.querySelectorAll('button, a').forEach(el => {
              const text = el.textContent.trim();
              const ariaLabel = el.getAttribute('aria-label');
              const ariaLabelledBy = el.getAttribute('aria-labelledby');
              const title = el.getAttribute('title');
              if (!text && !ariaLabel && !ariaLabelledBy && !title) {
                const img = el.querySelector('img, svg');
                if (!img || !img.getAttribute('alt')) {
                  issues.push({ type: 'error', msg: `${el.tagName.toLowerCase()} without accessible text: ${el.outerHTML.substring(0, 100)}` });
                }
              }
            });
            // Check form inputs without labels
            document.querySelectorAll('input, textarea, select').forEach(el => {
              if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
              const id = el.id;
              const label = id ? document.querySelector(`label[for="${id}"]`) : null;
              const ariaLabel = el.getAttribute('aria-label');
              const ariaLabelledBy = el.getAttribute('aria-labelledby');
              const parentLabel = el.closest('label');
              if (!label && !ariaLabel && !ariaLabelledBy && !parentLabel) {
                issues.push({ type: 'error', msg: `Form input without label: ${el.outerHTML.substring(0, 100)}` });
              }
            });
            // Check heading hierarchy
            const headingLevels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => parseInt(h.tagName[1]));
            for (let i = 1; i < headingLevels.length; i++) {
              if (headingLevels[i] - headingLevels[i-1] > 1) {
                issues.push({ type: 'warning', msg: `Heading hierarchy skip: H${headingLevels[i-1]} -> H${headingLevels[i]}` });
              }
            }
            // Check skip to content
            const skipLink = document.querySelector('a[href="#content"], a[href="#main-content"], a.skip-link, a.screen-reader-text');
            // Check landmarks
            const hasMain = !!document.querySelector('main, [role="main"]');
            const hasNav = !!document.querySelector('nav, [role="navigation"]');
            const hasFooter = !!document.querySelector('footer, [role="contentinfo"]');
            return {
              issues,
              hasSkipLink: !!skipLink,
              landmarks: { main: hasMain, nav: hasNav, footer: hasFooter },
              headingOrder: headingLevels,
            };
          });
          results[page.name].accessibility = a11yData;
        }

        // Console errors (for all breakpoints but store once)
        if (bp.name === 'desktop') {
          results[page.name].console = consoleMessages;
        }

      } catch (err) {
        results[page.name].error = err.message;
      }

      await context.close();
    }
  }

  // Security headers check (once, on homepage)
  const secContext = await browser.newContext();
  const secPage = await secContext.newPage();
  const secResponse = await secPage.goto('https://palestine-lives.org/', { waitUntil: 'domcontentloaded' });
  const headers = secResponse ? secResponse.headers() : {};
  results._security = {
    headers: {
      'strict-transport-security': headers['strict-transport-security'] || 'MISSING',
      'x-content-type-options': headers['x-content-type-options'] || 'MISSING',
      'x-frame-options': headers['x-frame-options'] || 'MISSING',
      'content-security-policy': headers['content-security-policy'] || 'MISSING',
      'referrer-policy': headers['referrer-policy'] || 'MISSING',
      'permissions-policy': headers['permissions-policy'] || 'MISSING',
    },
    server: headers['server'] || 'unknown',
    contentEncoding: headers['content-encoding'] || 'none',
  };

  // Check robots.txt and sitemap
  const robotsPage = await secContext.newPage();
  try {
    const robotsResp = await robotsPage.goto('https://palestine-lives.org/robots.txt', { timeout: 10000 });
    results._robots = { status: robotsResp.status(), content: await robotsResp.text() };
  } catch { results._robots = { status: 'error', content: '' }; }

  const sitemapPage = await secContext.newPage();
  try {
    const smResp = await sitemapPage.goto('https://palestine-lives.org/sitemap.xml', { timeout: 10000 });
    results._sitemap = { status: smResp.status(), contentLength: (await smResp.text()).length };
  } catch { results._sitemap = { status: 'error' }; }

  await secContext.close();
  await browser.close();

  // Write results
  fs.writeFileSync(path.join(OUTPUT_DIR, 'audit-data.json'), JSON.stringify(results, null, 2));
  console.log('Audit complete. Results saved to audit-data.json');
  console.log(`Screenshots saved for ${PAGES.length} pages x ${BREAKPOINTS.length} breakpoints`);
}

runAudit().catch(console.error);
