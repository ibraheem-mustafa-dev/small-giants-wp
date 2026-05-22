/**
 * playwright-fetch.js — Headless Chromium fetch for JS-rendered pages.
 *
 * Usage: node playwright-fetch.js <url>
 * Writes the fully-rendered HTML to stdout. Used by sgs-update-v2.py Stage 2
 * Source 4 as a fallback when urllib returns fewer than the hard minimum of 100
 * API identifiers from developer.wordpress.org/reference/since/<version>/
 *
 * Requires: @playwright/test or playwright package installed globally or in
 * plugins/sgs-blocks/node_modules (run `npm install --save-dev playwright` once).
 */
'use strict';

const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) {
    process.stderr.write('Usage: node playwright-fetch.js <url>\n');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    process.stdout.write(html);
  } catch (e) {
    process.stderr.write('Playwright fetch failed: ' + e.message + '\n');
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
