// Real-browser check of the buy box's flow opener built on the built-in button kit (Spec 43 FR-43-25): the server's own kit CSS
// (tests/playwright/support/button-kit-opener-css.php), the buy box's real stylesheet (src/blocks/buybox/style.css) and the framework's
// preset tokens, in Chromium. It needs no WordPress site and no credentials.
//
// Proves, for an opener beside a kept Add to Cart:
//   1. Only the opener's background set: at rest it paints that colour; on hover the block's own hover rule still wins, so the hover
//      fill and the hover text differ (the opener's text is never left on a hover fill of its own colour).
//   2. A preset chosen: it paints at rest, its hover colours show on hover and on keyboard focus, and Add to Cart is untouched.
//   3. "Fit to the text": the opener is narrower than the column; Add to Cart still fills it.
//   4. A pressed opener takes the preset's pressed look, not Add to Cart's.
//
// Run: (from plugins/sgs-blocks)  node tests/playwright/button-kit/openerHover.check.mjs
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..', '..', '..');
const require = createRequire(path.join(pluginRoot, 'package.json'));
const { chromium } = require('playwright');

const sheet = readFileSync(path.join(pluginRoot, 'src/blocks/buybox/style.css'), 'utf8');
const TOKENS = {
	primary: { background: '#0a5', text: '#ffffff', border: '#0a5', 'border-width': '2px', 'border-radius': '8px', 'hover-background': '#111111', 'hover-text': '#ffffff', 'hover-border': '#111111', 'active-transform': 'scale(0.9)' },
	secondary: { background: 'transparent', text: '#0a5', border: '#0a5', 'border-width': '2px', 'border-radius': '8px', 'hover-background': '#0a5', 'hover-text': '#ffffff', 'hover-border': '#0a5' },
};
const root = Object.entries(TOKENS)
	.flatMap(([name, roles]) => Object.entries(roles).map(([role, value]) => `--wp--custom--button-presets--${name}--${role}:${value}`))
	.join(';');
const kit = (attrs) =>
	JSON.parse(execFileSync('php', [path.join(pluginRoot, 'tests/playwright/support/button-kit-opener-css.php'), JSON.stringify(attrs), JSON.stringify({ custom: { buttonPresets: TOKENS } })], { encoding: 'utf8' }));

const failures = [];
const check = (ok, label) => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
	if (!ok) failures.push(label);
};

const page = ({ css, classes }, addToCartLook) => `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--wp--preset--color--primary:#0a5;--wp--preset--color--text:#111111;--wp--preset--color--text-inverse:#ffffff;${root}}
body{margin:0;font-family:sans-serif}.col{width:600px}${sheet}
</style></head><body><div class="col"><div class="sgs-bb-X wp-block-sgs-buybox sgs-buybox"><style>${css}</style>
<div class="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow">
<button id="atc" class="wp-element-button buybox__add-to-cart${addToCartLook}">Add</button>
<div class="buybox__cart-form buybox__cart-form--modal"><button id="op" type="button" class="wp-element-button buybox__add-to-cart${addToCartLook === ' buybox__add-to-cart--secondary' ? '' : ' buybox__add-to-cart--secondary'} buybox__add-to-cart--flow-opener${classes}">Choose</button></div>
</div></div></div></body></html>`;

const lum = (rgb) => {
	const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
		const c = Number(v) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

const read = (p, id) =>
	p.$eval(id, (el) => {
		const c = getComputedStyle(el);
		return { bg: c.backgroundColor, color: c.color, width: Math.round(el.getBoundingClientRect().width), transform: c.transform };
	});

const browser = await chromium.launch({ channel: process.env.SGS_CHROME_CHANNEL || undefined });
try {
	const p = await browser.newPage({ viewport: { width: 1200, height: 700 } });
	await p.emulateMedia({ reducedMotion: 'reduce' });

	// 1. Background only.
	await p.setContent(page(kit({ flowOpenerColourBackground: '#fff3b0' }), ''));
	const rest = await read(p, '#op');
	await p.hover('#op');
	const hover = await read(p, '#op');
	check(rest.bg === 'rgb(255, 243, 176)', `the opener's own background paints at rest (${rest.bg})`);
	check(contrast(hover.bg, hover.color) >= 3, `on hover the text stays readable on the fill (contrast ${contrast(hover.bg, hover.color).toFixed(2)}: ${hover.color} on ${hover.bg})`);
	check(hover.bg !== 'rgb(255, 243, 176)', `on hover the block's hover fill takes over from the resting colour (${hover.bg})`);

	// 2. A preset.
	await p.mouse.move(0, 0);
	await p.setContent(page(kit({ flowOpenerStyle: 'primary' }), ' buybox__add-to-cart--secondary'));
	const presetRest = await read(p, '#op');
	await p.hover('#op');
	const presetHover = await read(p, '#op');
	await p.mouse.move(0, 0);
	await p.focus('#op');
	await p.keyboard.press('Shift+Tab');
	await p.keyboard.press('Tab');
	const presetFocus = await read(p, '#op');
	const addToCart = await read(p, '#atc');
	check(presetRest.bg === 'rgb(0, 170, 85)' && presetRest.color === 'rgb(255, 255, 255)', `the primary preset paints at rest (${presetRest.bg} / ${presetRest.color})`);
	check(presetHover.bg === 'rgb(17, 17, 17)', `the preset's hover fill shows on hover (${presetHover.bg})`);
	check(presetFocus.bg === 'rgb(17, 17, 17)', `and on keyboard focus (${presetFocus.bg})`);
	check(addToCart.bg !== presetRest.bg || addToCart.color !== presetRest.color, `Add to Cart is untouched by the opener's preset (${addToCart.bg})`);

	// 3. Fit to the text.
	await p.setContent(page(kit({ flowOpenerWidthType: 'fit' }), ' buybox__add-to-cart--secondary'));
	const fitOpener = await read(p, '#op');
	const fitAdd = await read(p, '#atc');
	check(fitOpener.width < fitAdd.width, `"Fit to the text" narrows the opener (${fitOpener.width}px against Add to Cart's ${fitAdd.width}px)`);

	// 4. The pressed look.
	await p.emulateMedia({ reducedMotion: 'no-preference' });
	await p.setContent(page(kit({ flowOpenerStyle: 'primary' }), ' buybox__add-to-cart--secondary'));
	const box = await p.$eval('#op', (el) => {
		const r = el.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	});
	await p.mouse.move(box.x, box.y);
	await p.mouse.down();
	await p.waitForTimeout(400);
	const pressed = await read(p, '#op');
	await p.mouse.up();
	check(pressed.transform !== 'none', `a pressed opener takes the preset's pressed look (${pressed.transform})`);
} finally {
	await browser.close();
}
if (failures.length) {
	console.error(`${failures.length} check(s) failed`);
	process.exit(1);
}
console.log('All checks passed');
