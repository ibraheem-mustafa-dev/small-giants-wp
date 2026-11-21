// The built-in button migration's live proof: opens real pages of a running site in Chromium at 375, 768 and 1440 px and measures the computed
// look of every migrated button on them (Add to Cart, the product card's two CTAs, the account form's sign-in and Create account buttons) at
// rest and on hover. Run on a site before the migration and again after it (the build synced and the saved pages swept); `probe.mjs --compare
// <before> <after>` prints every difference. The output has the probe's shape, so the same compare reads it.
//
// Run (from plugins/sgs-blocks):
//   node tests/playwright/button-migration/live-look.mjs --base http://localhost:8129 --paths /shop/,/product/taster-trio/,/sign-in/,/gifts/ --out looks.json
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(path.resolve(here, '..', '..', '..'), 'package.json'));
const { chromium } = require('playwright');

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
	const i = argv.indexOf(name);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const base = arg('--base', 'http://localhost:8129').replace(/\/$/, '');
const paths = arg('--paths', '/shop/').split(',').filter(Boolean);
const out = arg('--out', '');

const BUTTONS = [
	'.buybox__add-to-cart',
	'.sgs-product-card__cta--primary',
	'.sgs-product-card__cta--secondary',
	'.product-card__view',
	'.product-card__add-to-cart',
	'.product-card__cta-secondary',
	'.woocommerce-form-login__submit',
	'.woocommerce-form-register__submit',
];
const MAX_PER_SELECTOR = 4;
const PROPS = [
	'display', 'backgroundColor', 'backgroundImage', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
	'borderTopStyle', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopLeftRadius', 'borderTopRightRadius',
	'borderBottomRightRadius', 'borderBottomLeftRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'minHeight', 'fontFamily',
	'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'boxShadow', 'transform', 'justifyContent',
];

const read = (el, props) => {
	const c = getComputedStyle(el);
	const r = el.getBoundingClientRect();
	const o = { width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 };
	for (const p of props) o[p] = c[p];
	for (const ps of ['::before', '::after']) {
		const pc = getComputedStyle(el, ps);
		o[`${ps}backgroundColor`] = pc.backgroundColor;
		o[`${ps}backgroundImage`] = pc.backgroundImage;
	}
	return o;
};

const result = {};
const browser = await chromium.launch({ channel: process.env.SGS_CHROME_CHANNEL || undefined });
try {
	for (const width of [375, 768, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		await page.addInitScript(() => {
			// Transitions and animations are switched off so a read never lands mid-transition.
			const style = document.createElement('style');
			style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';
			document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
		});
		for (const p of paths) {
			const response = await page.goto(base + p, { waitUntil: 'networkidle', timeout: 60000 });
			if (!response || response.status() >= 400) {
				result[`${p} | status | ${width}`] = { rest: { status: String(response ? response.status() : 'none') } };
				continue;
			}
			for (const selector of BUTTONS) {
				const handles = (await page.$$(selector)).slice(0, MAX_PER_SELECTOR);
				result[`${p} | ${selector} count | ${width}`] = { rest: { count: String((await page.$$(selector)).length) } };
				for (const [i, handle] of handles.entries()) {
					if (!(await handle.isVisible())) continue;
					await handle.scrollIntoViewIfNeeded();
					const key = `${p} | ${selector} #${i} | ${width}`;
					const rest = await handle.evaluate(read, PROPS);
					await handle.hover().catch(() => {});
					const hover = await handle.evaluate(read, PROPS);
					await page.mouse.move(0, 0);
					result[key] = { rest, hover };
				}
			}
		}
		await page.close();
	}
} finally {
	await browser.close();
}
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`${Object.keys(result).length} measurements${out ? ` -> ${out}` : ''}`);
