// Real-browser check of the built-in button kit's `contentAlign` and `hoverLift` groups on the buy box's two buttons (Add to Cart and the flow
// opener): the server's own kit CSS (tests/playwright/support/button-kit-buybox-css.php), the buy box's real stylesheet
// (src/blocks/buybox/style.css) and the framework's preset tokens, in Chromium. It needs no WordPress site and no credentials.
//
// The site token used here is the one a client's snapshot can set: `buttonPresets.default.hover-transform` = matrix(1,0,0,1,0,-3), which
// the stylesheet's `.sgs-buybox .buybox__add-to-cart:hover:not([disabled])` rule applies as a 3px lift on both buttons.
//
// Proves:
//   1. contentAlign beats `.sgs-buybox .buybox__add-to-cart { justify-content: center }`: with space-between the computed value is
//      space-between and the label sits at the left edge and the price at the right edge; unset leaves center; the setting is per
//      device (mobile reads flex-start at 375px); one button's setting does not reach the other.
//   2. hoverLift makes the TOTAL hover movement the setting: with the site token at -3px, a lift of 2px moves the hovered box exactly 2px
//      (never 5px), on both buttons, and also over a chosen preset's own lift; 0 stops the site's movement; unset keeps the site's 3px;
//      under reduced motion a set lift does not move the button at all.
//
// Run: (from plugins/sgs-blocks)  node tests/playwright/button-kit/contentAlignLift.check.mjs
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
	default: { 'hover-transform': 'matrix(1, 0, 0, 1, 0, -3)', 'hover-lift': 'translateY(-5px)' },
	primary: { background: '#0a5', text: '#ffffff', border: '#0a5', 'border-width': '2px', 'border-radius': '8px', 'hover-background': '#111111', 'hover-text': '#ffffff', 'hover-border': '#111111' },
};
const root = Object.entries(TOKENS)
	.flatMap(([name, roles]) => Object.entries(roles).map(([role, value]) => `--wp--custom--button-presets--${name}--${role}:${value}`))
	.join(';');
const kit = (attrs) =>
	JSON.parse(execFileSync('php', [path.join(pluginRoot, 'tests/playwright/support/button-kit-buybox-css.php'), JSON.stringify(attrs), JSON.stringify({ custom: { buttonPresets: TOKENS } })], { encoding: 'utf8' }));

const failures = [];
const check = (ok, label) => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
	if (!ok) failures.push(label);
};

const page = ({ css, openerClasses }) => `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--wp--preset--color--primary:#0a5;--wp--preset--color--text:#111111;--wp--preset--color--text-inverse:#ffffff;${root}}
body{margin:0;font-family:sans-serif}.col{width:340px}${sheet}
.sgs-buybox__cart-actions{padding:20px}.col .sgs-buybox.sgs-buybox{display:block}
</style></head><body><div class="col"><div class="sgs-bb-X wp-block-sgs-buybox sgs-buybox"><style>${css}</style>
<div class="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow">
<button id="atc" class="wp-element-button buybox__add-to-cart"><span id="atc-l">Add to basket</span><span id="atc-p">12.00</span></button>
<div class="buybox__cart-form buybox__cart-form--modal"><button id="op" type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener${openerClasses}"><span id="op-l">Choose</span><span id="op-p">from 12.00</span></button></div>
</div></div></div></body></html>`;

const justify = (p, id) => p.$eval(id, (el) => getComputedStyle(el).justifyContent);
const edges = (p, id) =>
	p.evaluate((sel) => {
		const b = document.querySelector(sel).getBoundingClientRect();
		const l = document.querySelector(`${sel}-l`).getBoundingClientRect();
		const r = document.querySelector(`${sel}-p`).getBoundingClientRect();
		const cs = getComputedStyle(document.querySelector(sel));
		const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
		return { leftGap: Math.round(l.left - b.left - pad), rightGap: Math.round(b.right - r.right - pad) };
	}, id);
const top = (p, id) => p.$eval(id, (el) => el.getBoundingClientRect().top);
// How far up the box moves while hovered, once the transition has finished.
const lift = async (p, id) => {
	await p.mouse.move(0, 0);
	await p.waitForTimeout(450);
	const rest = await top(p, id);
	await p.hover(id);
	await p.waitForTimeout(450);
	const hovered = await top(p, id);
	await p.mouse.move(0, 0);
	return Math.round((rest - hovered) * 100) / 100;
};

const browser = await chromium.launch({ channel: process.env.SGS_CHROME_CHANNEL || undefined });
try {
	const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
	await p.emulateMedia({ reducedMotion: 'no-preference' });

	// 1. Content alignment.
	await p.setContent(page(kit({})));
	check((await justify(p, '#atc')) === 'center' && (await justify(p, '#op')) === 'center', `unset: the stylesheet's centre stands on both buttons (${await justify(p, '#atc')} / ${await justify(p, '#op')})`);

	await p.setContent(page(kit({ addToCartContentAlign: { desktop: 'space-between' } })));
	const atcAligned = await justify(p, '#atc');
	const atcEdges = await edges(p, '#atc');
	check(atcAligned === 'space-between', `addToCartContentAlign space-between wins over the stylesheet's justify-content: center (${atcAligned})`);
	check(atcEdges.leftGap <= 1 && atcEdges.rightGap <= 1, `the label sits at the left edge and the price at the right (gaps ${atcEdges.leftGap}px / ${atcEdges.rightGap}px)`);

	await p.setContent(page(kit({ flowOpenerContentAlign: { desktop: 'space-between' } })));
	const opAligned = await justify(p, '#op');
	const opEdges = await edges(p, '#op');
	check(opAligned === 'space-between' && opEdges.leftGap <= 1 && opEdges.rightGap <= 1, `flowOpenerContentAlign space-between spreads the opener's label and note (${opAligned}, gaps ${opEdges.leftGap}px / ${opEdges.rightGap}px)`);
	check((await justify(p, '#atc')) === 'center', `and Add to Cart is untouched (${await justify(p, '#atc')})`);

	await p.setViewportSize({ width: 375, height: 800 });
	await p.setContent(page(kit({ addToCartContentAlign: { desktop: 'space-between', mobile: 'flex-start' } })));
	check((await justify(p, '#atc')) === 'flex-start', `per device: at 375px the mobile value applies (${await justify(p, '#atc')})`);
	await p.setViewportSize({ width: 1200, height: 800 });
	await p.setContent(page(kit({ addToCartContentAlign: { desktop: 'space-between', mobile: 'flex-start' } })));
	check((await justify(p, '#atc')) === 'space-between', `and at 1200px the desktop value (${await justify(p, '#atc')})`);

	// 2. The hover lift against the site's own 3px token.
	await p.setContent(page(kit({})));
	const baseAtc = await lift(p, '#atc');
	const baseOp = await lift(p, '#op');
	check(baseAtc === 3 && baseOp === 3, `control: with nothing set both buttons rise the site token's 3px (${baseAtc}px / ${baseOp}px)`);

	await p.setContent(page(kit({ flowOpenerHoverLiftDistance: '2px' })));
	const opLift = await lift(p, '#op');
	check(opLift === 2, `flowOpenerHoverLiftDistance 2px: the opener's total movement is exactly 2px, not 2px plus the site's 3px (${opLift}px)`);
	check((await lift(p, '#atc')) === 3, `and Add to Cart, whose setting is unset, still rises the site's 3px (${await lift(p, '#atc')}px)`);

	await p.setContent(page(kit({ addToCartHoverLiftDistance: '2px' })));
	const atcLift = await lift(p, '#atc');
	check(atcLift === 2, `addToCartHoverLiftDistance 2px: Add to Cart's total movement is exactly 2px (${atcLift}px)`);

	await p.setContent(page(kit({ flowOpenerStyle: 'primary' })));
	const presetLift = await lift(p, '#op');
	check(presetLift > 3, `control: an opener on the primary preset rises by the preset's own lift (${presetLift}px)`);
	await p.setContent(page(kit({ flowOpenerStyle: 'primary', flowOpenerHoverLiftDistance: '2px' })));
	const presetSet = await lift(p, '#op');
	check(presetSet === 2, `a set lift of 2px also replaces a chosen preset's lift (${presetSet}px)`);

	await p.setContent(page(kit({ flowOpenerHoverLiftDistance: '0px', addToCartHoverLiftDistance: '0' })));
	const zeroOp = await lift(p, '#op');
	const zeroAtc = await lift(p, '#atc');
	check(zeroOp === 0 && zeroAtc === 0, `0 stops the movement even though the site token lifts (${zeroOp}px / ${zeroAtc}px)`);

	await p.emulateMedia({ reducedMotion: 'reduce' });
	await p.setContent(page(kit({ flowOpenerHoverLiftDistance: '2px' })));
	const reduced = await lift(p, '#op');
	check(reduced === 0, `under reduced motion a set lift does not move the button (${reduced}px)`);
} finally {
	await browser.close();
}
if (failures.length) {
	console.error(`${failures.length} check(s) failed`);
	process.exit(1);
}
console.log('All checks passed');
