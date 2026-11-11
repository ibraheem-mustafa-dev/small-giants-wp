#!/usr/bin/env node
/**
 * check-background-part-effects.mjs - particles, grid dots and generative background hosted on the background part
 * (Spec 49 section 10.5). Open a page built from tests/fixtures/motion/background-part-effects.json at 1440 and 375 with
 * a pointer, and check for every element carrying `data-sgs-fx` that it is the `.sgs-bg-media` element, still
 * `position: absolute`, holds its effect's canvas directly (never inside an `<img>`), and the canvas spans the host.
 *
 * Run from a folder where `playwright` resolves:  node check-background-part-effects.mjs --url <page URL>
 * Exit 1 on any failure.
 */
import { chromium } from 'playwright';

const url = process.argv[process.argv.indexOf('--url') + 1];
if (!url || url.startsWith('--')) {
	console.error('usage: check-background-part-effects.mjs --url <page URL>');
	process.exit(2);
}
const WANT = ['particles', 'grid-dots', 'generative-background'];
const browser = await chromium.launch();
let failures = 0;
for (const width of [1440, 375]) {
	const page = await browser.newPage({ viewport: { width, height: 900 } });
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.mouse.move(300, 300);
	await page.waitForTimeout(2000);
	const hosts = await page.evaluate(() => [...document.querySelectorAll('[data-sgs-fx]')].map((h) => {
		const c = h.querySelector('canvas');
		return {
			fx: h.dataset.sgsFx, bg: h.classList.contains('sgs-bg-media'), position: getComputedStyle(h).position,
			canvasParent: c ? c.parentElement === h || c.parentElement.parentElement === h : false,
			inImg: !!(c && c.closest('img')), canvas: c ? Math.round(c.getBoundingClientRect().width) : 0, host: Math.round(h.getBoundingClientRect().width),
		};
	}));
	for (const fx of WANT) {
		const h = hosts.find((x) => x.fx.split(/\s+/).includes(fx));
		const ok = h && h.bg && h.position === 'absolute' && h.canvasParent && !h.inImg && Math.abs(h.canvas - h.host) <= 1;
		console.log(`${ok ? 'ok  ' : 'FAIL'} ${width}px ${fx} ${JSON.stringify(h)}`);
		if (!ok) failures++;
	}
	await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
