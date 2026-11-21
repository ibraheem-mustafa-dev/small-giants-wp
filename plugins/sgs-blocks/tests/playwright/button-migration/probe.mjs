// The built-in button migration's look probe: renders each case in cases.json through a checkout's real render.php (the QA harness), puts the
// block's own stylesheet and the framework's preset tokens around it, and measures the computed look of every listed button in Chromium
// at 375, 768 and 1440 px, at rest, on hover and on keyboard focus (and its ::before and ::after paint layers).
//
// Run (from plugins/sgs-blocks):
//   node tests/playwright/button-migration/probe.mjs --root <plugin root> --out looks.json            the looks as the checkout renders the old attributes
//   node tests/playwright/button-migration/probe.mjs --root <plugin root> --out looks.json --sweep    the looks after the case's attributes are renamed and
//                                                                                                      reshaped by scripts/lib/builtin-button-sweep.php
//   node tests/playwright/button-migration/probe.mjs --compare before.json after.json                  prints every difference, exits 1 on any
// It needs no WordPress site and no credentials.
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ownRoot = path.resolve(here, '..', '..', '..');
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
	const i = argv.indexOf(name);
	return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

if (argv.includes('--compare')) {
	const i = argv.indexOf('--compare');
	const before = JSON.parse(readFileSync(argv[i + 1], 'utf8'));
	const after = JSON.parse(readFileSync(argv[i + 2], 'utf8'));
	let diffs = 0;
	let same = 0;
	for (const key of Object.keys(before)) {
		if (!(key in after)) {
			console.log(`MISSING in after: ${key}`);
			diffs++;
			continue;
		}
		for (const state of Object.keys(before[key])) {
			const a = before[key][state];
			const b = after[key][state];
			for (const prop of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
				if ((a || {})[prop] !== (b || {})[prop]) {
					console.log(`DIFF ${key} ${state} ${prop}: ${(a || {})[prop]}  ->  ${(b || {})[prop]}`);
					diffs++;
				} else {
					same++;
				}
			}
		}
	}
	for (const key of Object.keys(after)) {
		if (!(key in before)) {
			console.log(`EXTRA in after: ${key}`);
			diffs++;
		}
	}
	console.log(`${same} measurements equal, ${diffs} differ`);
	process.exit(diffs ? 1 : 0);
}

const root = path.resolve(arg('--root', ownRoot));
const out = arg('--out', '');
const sweep = argv.includes('--sweep');
const only = arg('--only', '');
const cases = JSON.parse(readFileSync(path.join(here, 'cases.json'), 'utf8'));
const require = createRequire(path.join(ownRoot, 'package.json'));
const { chromium } = require('playwright');

// The framework's preset tokens (the real ones come from the site's theme snapshot), and the palette slugs the cases name.
const TOKENS = {
	primary: { background: '#0a5', text: '#ffffff', border: '#0a5', 'border-width': '2px', 'border-radius': '8px', 'font-weight': '700', 'hover-background': '#111111', 'hover-text': '#ffffff', 'hover-border': '#111111', 'hover-transform': 'translateY(-2px)', 'active-transform': 'scale(0.97)' },
	secondary: { background: 'transparent', text: '#0a5', border: '#0a5', 'border-width': '2px', 'border-radius': '8px', 'hover-background': '#0a5', 'hover-text': '#ffffff', 'hover-border': '#0a5' },
	outline: { background: 'transparent', text: '#111111', border: '#111111', 'border-width': '1px', 'border-radius': '4px', 'hover-background': '#111111', 'hover-text': '#ffffff', 'hover-border': '#111111' },
};
const SETTINGS = JSON.stringify({ custom: { buttonPresets: TOKENS } });
const palette = { 'mm-yellow': '#ffd23f', 'mm-cocoa': '#3b2417', 'mm-paper': '#faf3e3', primary: '#0a5', 'text-inverse': '#ffffff', text: '#111111', surface: '#ffffff', accent: '#c33' };
const rootVars =
	Object.entries(TOKENS)
		.flatMap(([name, roles]) => Object.entries(roles).map(([role, value]) => `--wp--custom--button-presets--${name}--${role}:${value}`))
		.join(';') +
	';' +
	Object.entries(palette)
		.map(([slug, value]) => `--wp--preset--color--${slug}:${value}`)
		.join(';');

const tmp = mkdtempSync(path.join(os.tmpdir(), 'sgs-bm-'));
const tmpFile = (name, data) => {
	const f = path.join(tmp, name);
	writeFileSync(f, typeof data === 'string' ? data : JSON.stringify(data));
	return f;
};
const sweepAttrs = (block, attrs) => {
	if (!sweep) return attrs;
	const raw = execFileSync('php', [path.join(root, 'tests/playwright/support/button-migration-sweep.php'), root, block, JSON.stringify(attrs)], { encoding: 'utf8' });
	return JSON.parse(raw.slice(raw.indexOf('{')));
};
const harness = (slug, files, extra = []) => {
	const args = [path.join(root, 'scripts/qa/lib/render-css-harness.php'), '--slug', slug, '--motion-targets', '--global-settings-file', tmpFile('gs.json', SETTINGS), ...extra];
	for (const [k, v] of Object.entries(files)) args.push(`--${k}-file`, tmpFile(`${k}.json`, v));
	const raw = execFileSync('php', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	const decoded = JSON.parse(raw.slice(raw.indexOf('{"ok"')));
	if (!decoded.ok) throw new Error(`render failed for ${slug}: ${decoded.error}`);
	return decoded;
};
const sheet = (slug) => readFileSync(path.join(root, 'src/blocks', slug, 'style.css'), 'utf8');

// The pages to measure: name -> { html, buttons }.
const pages = {};
const buybox = cases.buybox;
const bbFixture = JSON.parse(readFileSync(path.join(ownRoot, buybox.fixture), 'utf8'));
for (const [name, attrs] of Object.entries(buybox.cases)) {
	if (only && !name.includes(only)) continue;
	const r = harness('sgs/buybox', { attrs: sweepAttrs('sgs/buybox', { ...bbFixture.attrs, ...attrs }), product: bbFixture.product, manifest: bbFixture.manifest, context: bbFixture.context });
	// The harness's stub block wrapper omits the class WordPress adds to a block's root; the scoped rules chain it.
	pages[name] = { html: r.html.replace('class="sgs-buybox ', 'class="wp-block-sgs-buybox sgs-buybox '), buttons: buybox.buttons, sheets: [sheet('buybox'), sheet('button')] };
}
const pcCases = cases['product-card'];
const pcFixture = JSON.parse(readFileSync(path.join(ownRoot, pcCases.fixture), 'utf8')).blocks['product-card'];
for (const [name, attrs] of Object.entries(pcCases.cases)) {
	for (const pathName of pcCases.paths) {
		const key = `${name}@${pathName}`;
		if (only && !key.includes(only)) continue;
		const fx = pcFixture.paths[pathName];
		const merged = { ...pcFixture.base, ...fx.attrs, ...attrs };
		// The fixture's base turns on a lot of card furniture that has nothing to do with the CTA; keep only what the path needs.
		const files = { attrs: sweepAttrs('sgs/product-card', merged) };
		if (fx.product) files.product = fx.product;
		if (fx.manifest) files.manifest = fx.manifest;
		if (fx.post) files.post = fx.post;
		if (fx.attachments) files.attachments = fx.attachments;
		const r = harness('sgs/product-card', files);
		pages[key] = { html: r.html, buttons: pcCases.buttons, sheets: [sheet('product-card'), sheet('button')] };
	}
}
const acc = cases.account;
for (const [name, attrs] of Object.entries(acc.cases)) {
	if (only && !name.includes(only)) continue;
	const raw = execFileSync('php', [path.join(root, 'tests/playwright/support/button-migration-account-css.php'), root, JSON.stringify(sweepAttrs('sgs/account', attrs)), SETTINGS], { encoding: 'utf8' });
	const css = JSON.parse(raw.slice(raw.indexOf('{"css"'))).css;
	pages[name] = {
		html: `<style>${css}</style><div class="acc-X sgs-account"><div class="sgs-account__wc"><form class="woocommerce-form woocommerce-form-login login"><button type="submit" class="woocommerce-button button woocommerce-form-login__submit">Sign in</button></form><form class="woocommerce-form woocommerce-form-register register"><button type="submit" class="woocommerce-Button button woocommerce-form-register__submit">Create account</button></form></div><div class="woocommerce-MyAccount-content"><a class="button woocommerce-button" href="#">Pay</a><a class="sgs-wishlist-panel__empty-cta" href="#">Browse</a></div></div>`,
		buttons: acc.buttons,
		sheets: [sheet('account')],
	};
}

const PROPS = [
	'display', 'position', 'backgroundColor', 'backgroundImage', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
	'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
	'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
	'minHeight', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textDecorationLine', 'textAlign', 'boxShadow',
	'transform', 'opacity', 'justifyContent', 'alignItems', 'gap', 'cursor',
];
const PSEUDO_PROPS = ['content', 'backgroundColor', 'backgroundImage', 'borderTopLeftRadius', 'position', 'zIndex'];

const read = (page, selector, pseudoToo) =>
	page.$eval(selector, (el, [props, pseudoProps, pseudo]) => {
		const c = getComputedStyle(el);
		const r = el.getBoundingClientRect();
		const o = { width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 };
		for (const p of props) o[p] = c[p];
		if (pseudo) {
			for (const ps of ['::before', '::after']) {
				const pc = getComputedStyle(el, ps);
				for (const p of pseudoProps) o[ps + p] = pc[p];
			}
		}
		return o;
	}, [PROPS, PSEUDO_PROPS, pseudoToo]);

const result = {};
const browser = await chromium.launch({ channel: process.env.SGS_CHROME_CHANNEL || undefined });
try {
	for (const width of [375, 768, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		for (const [name, def] of Object.entries(pages)) {
			const html = `<!doctype html><html><head><meta charset="utf-8"><style>:root{${rootVars}}body{margin:0;font-family:sans-serif}*,*::before,*::after{transition:none!important;animation:none!important}.col{width:${Math.min(width - 20, 600)}px;margin:10px}${def.sheets.join('\n')}</style></head><body><div class="col">${def.html}</div></body></html>`;
			await page.setContent(html);
			for (const selector of def.buttons) {
				if (!(await page.$(selector))) continue;
				const key = `${name} | ${selector} | ${width}`;
				const rest = await read(page, selector, true);
				await page.hover(selector).catch(() => {});
				const hover = await read(page, selector, true);
				await page.mouse.move(0, 0);
				await page.$eval(selector, (el) => el.focus({ focusVisible: true }));
				const focus = await read(page, selector, false);
				await page.$eval(selector, (el) => el.blur());
				result[key] = { rest, hover, focus };
			}
		}
		await page.close();
	}
} finally {
	await browser.close();
	rmSync(tmp, { recursive: true, force: true });
}
const text = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, text);
console.log(`${Object.keys(result).length} button looks measured${out ? ` -> ${out}` : ''}`);
