// Step 0d, 375 tier: footer reveal + footer hover only (header entrance was
// captured at 1440 only, per plan). Run: node capture-0d-375.mjs <ref> [ref2 ...]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { captureFooterReveal, captureFooterHover } from './capture-0d.mjs';

const req = createRequire(path.resolve('plugins/sgs-blocks/package.json'));
const { chromium } = req('playwright');

const RAW_DIR = path.resolve('.claude/reports/reference-requirements/raw');

const SITES = {
  dogstudio: 'https://dogstudio.co',
  lamalama: 'https://lamalama.com/',
  lusion: 'https://lusion.co/',
  studionamma: 'https://studionamma.com',
};

async function run(refs) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=500,950'] });
  for (const ref of refs) {
    const url = SITES[ref];
    if (!url) {
      console.log(`Unknown ref ${ref}`);
      continue;
    }
    console.log(`=== ${ref} @375 ===`);
    const context = await browser.newContext({
      viewport: { width: 375, height: 900 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch((e) => console.log('  goto warning', e.message));
    await page.waitForTimeout(2500);
    const result = { url, tier: 375 };
    console.log('  footer reveal...');
    try {
      result.footerReveal = await captureFooterReveal(page);
    } catch (e) {
      result.footerRevealError = e.message;
    }
    console.log('  footer hover...');
    try {
      result.footerHover = await captureFooterHover(page);
    } catch (e) {
      result.footerHoverError = e.message;
    }
    await context.close();
    fs.writeFileSync(path.join(RAW_DIR, `${ref}-0d-375.json`), JSON.stringify(result, null, 1), 'utf-8');
    console.log(`  wrote raw/${ref}-0d-375.json`);
  }
  await browser.close();
}

const refs = process.argv.slice(2);
if (refs.length === 0) {
  console.error('Usage: node capture-0d-375.mjs <ref> [ref2 ...]');
  process.exit(1);
}
run(refs).then(() => console.log('done')).catch((e) => {
  console.error(e);
  process.exit(1);
});
