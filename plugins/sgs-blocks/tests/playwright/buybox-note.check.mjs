// Real-browser check of the buy box note (Spec 27 FR-27-PS8): the server's own markup (tests/playwright/support/buybox-note-markup.php),
// the BUILT view script (build/blocks/buybox/note-view.js) and the BUILT stylesheet (build/blocks/buybox/style-index.css), in Chromium at 375 / 768 / 1440.
// It needs no WordPress site and no credentials: a static page stands in for the product page, and a stand-in submit
// listener posts what product-card/view.js::buildAddBody posts (that function is covered by tests/js/buybox-note.test.js).
//
// Proves: the box is labelled and described; no inline style attribute; the count follows typing; the polite status speaks
// only near the limit; the textarea stops at the limit; the add request carries one `fields` row labelled and flagged as a note;
// an optional empty note adds nothing; a required empty note refuses the add (no request), shows the error, focuses the box and
// sets aria-invalid; writing it lets the add through; the box fits the page width at every size.
//
// Run: (from plugins/sgs-blocks, after `npm run build`)  node tests/playwright/buybox-note.check.mjs
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..', '..');
const require = createRequire(path.join(pluginRoot, 'package.json'));
const { chromium } = require('playwright');

const css = readFileSync(path.join(pluginRoot, 'build/blocks/buybox/style-index.css'), 'utf8');
const script = readFileSync(path.join(pluginRoot, 'build/blocks/buybox/note-view.js'), 'utf8');
const markup = (attrs) => execFileSync('php', [path.join(here, 'support/buybox-note-markup.php'), JSON.stringify(attrs)], { encoding: 'utf8' });

const LABEL = 'Allergies or dietary needs?';
const failures = [];
const check = (ok, label) => {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
	if (!ok) failures.push(label);
};

function page(attrs) {
	return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
.sgs-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
body{margin:0;font-family:system-ui,sans-serif}.wrap{padding:16px;max-width:560px}</style></head><body>
<div class="wrap"><div class="sgs-buybox" data-wp-interactive="sgs/product-card">${markup(attrs)}
<form class="buybox__cart-form" method="post" action="#"><button type="submit" class="buybox__add-to-cart">Add to basket</button></form></div></div>
<script>
// Stand-in for the product-card store's submit handler: it runs after the note's capture gate, reads the card root the way buildAddBody does.
document.querySelector('.buybox__cart-form').addEventListener('submit', (event) => {
	event.preventDefault();
	const root = document.querySelector('.sgs-buybox');
	const body = { id: 42, quantity: 1 };
	if (root.dataset.extraNote) body.fields = [JSON.parse(root.dataset.extraNote)];
	fetch('/sgs/v1/cart/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
});
</script>
<script type="module">${script}</script></body></html>`;
}

const browser = await chromium.launch();
try {
	for (const width of [375, 768, 1440]) {
		const tag = `@${width}`;
		const ctx = await browser.newContext({ viewport: { width, height: 900 } });
		const p = await ctx.newPage();
		const posts = [];
		await p.route('**/sgs/v1/cart/add-item', (route) => {
			posts.push(JSON.parse(route.request().postData() || '{}'));
			route.fulfill({ status: 201, contentType: 'application/json', body: '{"items_count":1}' });
		});
		const errors = [];
		p.on('pageerror', (e) => errors.push(String(e)));
		let html = '';
		await p.route('http://buybox-note.test/', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
		const open = async (attrs) => {
			posts.length = 0;
			html = page(attrs);
			await p.goto('http://buybox-note.test/', { waitUntil: 'load' });
			await p.waitForFunction(() => document.querySelector('[data-sgs-note-init]'));
		};

		// Optional note with a hint.
		await open({ noteField: true, noteHint: 'For example vegan, egg-free', noteMaxLength: 60 });
		const box = p.locator('.sgs-buybox__note-input');
		check((await p.locator(`label[for="sgs-buybox-note-42"]`).innerText()) === LABEL, `${tag} the label names the box`);
		check((await box.getAttribute('aria-describedby')).includes('sgs-buybox-note-42-hint'), `${tag} the hint describes the box`);
		check((await p.locator('[style]').count()) === 0, `${tag} no element carries an inline style attribute`);
		const geometry = await p.evaluate(() => {
			const el = document.querySelector('.sgs-buybox__note-input');
			const cs = getComputedStyle(el);
			const r = el.getBoundingClientRect();
			return { width: r.width, height: r.height, border: cs.borderTopWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, wrap: document.querySelector('.sgs-buybox__note').getBoundingClientRect().width };
		});
		check(geometry.scrollW <= geometry.innerW, `${tag} no sideways scroll (${geometry.scrollW} <= ${geometry.innerW})`);
		check(Math.abs(geometry.width - geometry.wrap) < 1 && geometry.wrap > 200, `${tag} the box fills the note's own column (${Math.round(geometry.width)} of ${Math.round(geometry.wrap)})`);
		check(geometry.border === '1px' && geometry.height >= 44, `${tag} input look: 1px border, ${Math.round(geometry.height)}px tall`);

		await box.focus();
		await p.keyboard.type('vegan, egg-free');
		check((await p.locator('.sgs-buybox__note-count').innerText()) === '15 / 60', `${tag} the visible count follows typing`);
		check((await p.locator('.sgs-buybox__note-status').innerText()) === '', `${tag} the polite status is silent far from the limit`);
		await box.fill('x'.repeat(50));
		check((await p.locator('.sgs-buybox__note-status').innerText()) === '10 characters left', `${tag} the polite status speaks near the limit`);
		await box.pressSequentially('y'.repeat(30));
		check((await box.inputValue()).length === 60, `${tag} the box stops at the limit (60)`);
		await box.fill('Vegan, egg-free');
		await p.click('.buybox__add-to-cart');
		await p.waitForTimeout(100);
		check(posts.length === 1 && JSON.stringify(posts[0].fields) === JSON.stringify([{ label: LABEL, value: 'Vegan, egg-free', note: true }]), `${tag} the add request carries one labelled note row`);

		// Optional and empty: nothing extra is sent.
		await open({ noteField: true });
		await p.click('.buybox__add-to-cart');
		await p.waitForTimeout(100);
		check(posts.length === 1 && posts[0].fields === undefined, `${tag} an empty optional note adds with no fields`);

		// Required and empty: refused, then allowed.
		await open({ noteField: true, noteRequired: true });
		await p.click('.buybox__add-to-cart');
		await p.waitForTimeout(100);
		check(posts.length === 0, `${tag} a required empty note sends no request`);
		check(await p.locator('.sgs-buybox__note-error').isVisible(), `${tag} the error shows`);
		check(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('sgs-buybox__note-input')), `${tag} focus moves to the box`);
		check((await p.locator('.sgs-buybox__note-input').getAttribute('aria-invalid')) === 'true', `${tag} the box is marked invalid`);
		await p.locator('.sgs-buybox__note-input').fill('No nuts');
		check(!(await p.locator('.sgs-buybox__note-error').isVisible()), `${tag} writing clears the error`);
		await p.click('.buybox__add-to-cart');
		await p.waitForTimeout(100);
		check(posts.length === 1 && posts[0].fields[0].value === 'No nuts', `${tag} the required note then goes through`);

		check(errors.length === 0, `${tag} no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
		await ctx.close();
	}
} finally {
	await browser.close();
}

console.log(failures.length ? `\n${failures.length} failed` : '\nall passed');
process.exit(failures.length ? 1 : 0);
