// Computed-style check: the account block's layout rules beat WooCommerce's floats and clearfix (MERGED F-36).
//
// WooCommerce's layout sheet loads after the block's, so a rule of equal specificity loses. This drives real Chromium
// against a static fixture: the block's style.css, then WooCommerce's own rules (selectors copied from
// woocommerce-layout.css) in a later sheet, and reads the laid-out boxes. No WordPress site is needed.
//
// It proves, at a 1000px-wide block:
//   - the addresses grid holds both cards in row 1, each filling its cell (no clearfix cell, no 48% width);
//   - the signed-out pair (not tabs) has no clearfix flex item: both columns sit on one line;
//   - in tabs layout each #customer_login column is as wide as the card;
//   - the lost-password form's first and last rows run the form's width, unfloated.
// RED CONTROL: the same fixture without the block's sheet shows WooCommerce's float layout (48% / 47%), so a pass is
// the block's rules winning and not an artefact of the fixture.
//
// Run:            node tests/playwright/account-woo-layout.check.mjs
// Prove it fails: SGS_BASELINE_REV=<commit before the fix> node tests/playwright/account-woo-layout.check.mjs
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..', '..');
const require = createRequire(path.join(pluginRoot, 'package.json'));
const { chromium } = require('playwright');

const REL = 'plugins/sgs-blocks/src/blocks/account/style.css';
const rev = process.env.SGS_BASELINE_REV || '';
const blockCss = rev
	? execFileSync('git', ['show', `${rev}:${REL}`], { cwd: pluginRoot, encoding: 'utf8' })
	: readFileSync(path.join(pluginRoot, 'src/blocks/account/style.css'), 'utf8');

// The theme's box-sizing reset (core-blocks-critical.css), which every SGS page carries.
const THEME_CSS = '*,*::before,*::after{box-sizing:border-box}';

// WooCommerce's woocommerce-layout.css rules that fight the block (its 769px-and-up sheet holds the floats).
const WOO_CSS = `
.woocommerce .col2-set::after,.woocommerce .col2-set::before,.woocommerce-page .col2-set::after,.woocommerce-page .col2-set::before{content:" ";display:table}
.woocommerce .col2-set::after,.woocommerce-page .col2-set::after{clear:both}
.woocommerce .col2-set .col-1,.woocommerce-page .col2-set .col-1{float:left;width:48%}
.woocommerce .col2-set .col-2,.woocommerce-page .col2-set .col-2{float:right;width:48%}
.woocommerce form .form-row-first,.woocommerce form .form-row-last,.woocommerce-page form .form-row-first,.woocommerce-page form .form-row-last{width:47%;overflow:visible}
.woocommerce form .form-row-first,.woocommerce-page form .form-row-first{float:left}
.woocommerce form .form-row-last,.woocommerce-page form .form-row-last{float:right}
`;

const BODY = `
<div id="addr" class="sgs-account" data-auth-layout="side" style="width:1000px"><div class="sgs-account__wc">
	<div class="u-columns woocommerce-Addresses col2-set addresses">
		<div class="u-column1 col-1 woocommerce-Address">Billing</div>
		<div class="u-column2 col-2 woocommerce-Address">Shipping</div>
	</div>
</div></div>
<div id="pair" class="sgs-account" data-auth-layout="side" style="width:1000px"><div class="sgs-account__wc">
	<div class="u-columns col2-set" id="customer_login">
		<div class="u-column1 col-1">Sign in</div>
		<div class="u-column2 col-2">Register</div>
	</div>
</div></div>
<div id="tabs" class="sgs-account" data-auth-layout="tabs" style="width:1000px"><div class="sgs-account__wc">
	<div class="u-columns col2-set" id="customer_login">
		<div class="u-column1 col-1">Sign in</div>
		<div class="u-column2 col-2">Register</div>
	</div>
</div></div>
<div id="reset" class="sgs-account" data-auth-layout="side" style="width:1000px"><div class="sgs-account__wc">
	<form method="post" class="woocommerce-ResetPassword lost_reset_password">
		<p class="woocommerce-form-row woocommerce-form-row--first form-row form-row-first"><input type="text" name="password_1"></p>
		<p class="woocommerce-form-row woocommerce-form-row--last form-row form-row-last"><input type="text" name="password_2"></p>
	</form>
</div></div>`;

const read = () => {
	const box = (el) => el.getBoundingClientRect();
	const one = (root, sel) => document.querySelector(`${root} ${sel}`);
	const addrCards = [...document.querySelectorAll('#addr .woocommerce-Address')].map(box);
	const addrSet = one('#addr', '.col2-set');
	const pairCols = [...document.querySelectorAll('#pair #customer_login > div')].map(box);
	const tabsSet = one('#tabs', '#customer_login');
	const tabsCol = one('#tabs', '#customer_login > .col-1');
	const form = one('#reset', 'form');
	const rows = [...document.querySelectorAll('#reset form > p')];
	const cs = getComputedStyle(form);
	const formInner = box(form).width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
	const addrCs = getComputedStyle(addrSet);
	const addrInner = box(addrSet).width;
	const gap = parseFloat(addrCs.columnGap) || 0;
	return {
		addrClearfix: getComputedStyle(addrSet, '::before').content,
		addrSameRow: addrCards.length === 2 && Math.abs(addrCards[0].top - addrCards[1].top) < 1,
		addrCellWidth: addrCards.map((b) => Math.round(b.width)),
		addrExpected: Math.round((addrInner - gap) / 2),
		pairClearfix: getComputedStyle(one('#pair', '#customer_login'), '::before').content,
		pairSameRow: pairCols.length === 2 && Math.abs(pairCols[0].top - pairCols[1].top) < 1,
		tabsColWidth: Math.round(box(tabsCol).width),
		tabsSetWidth: Math.round(box(tabsSet).width - parseFloat(getComputedStyle(tabsSet).paddingLeft) - parseFloat(getComputedStyle(tabsSet).paddingRight) - parseFloat(getComputedStyle(tabsSet).borderLeftWidth) - parseFloat(getComputedStyle(tabsSet).borderRightWidth)),
		tabsColFloat: getComputedStyle(tabsCol).float,
		resetFloats: rows.map((r) => getComputedStyle(r).float),
		resetWidths: rows.map((r) => Math.round(box(r).width)),
		resetExpected: Math.round(formInner),
	};
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
let failures = 0;
const ok = (cond, label) => {
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
	if (!cond) failures++;
};

// RED CONTROL: WooCommerce alone floats the columns, so the reads below can tell the block's rules from no rules.
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${THEME_CSS}</style><style>.sgs-account{container-type:inline-size;container-name:sgs-account}</style><style>${WOO_CSS}</style></head><body class="woocommerce-account woocommerce-page">${BODY}</body></html>`);
const control = await page.evaluate(read);
ok(control.tabsColFloat === 'left' && control.tabsColWidth < control.tabsSetWidth * 0.6, `control: WooCommerce alone floats a column at 48% (${control.tabsColWidth}px of ${control.tabsSetWidth}px)`);
ok(control.resetFloats[0] === 'left' && control.resetWidths[0] < control.resetExpected * 0.6, `control: WooCommerce alone floats a password row at 47% (${control.resetWidths[0]}px of ${control.resetExpected}px)`);
ok(control.addrClearfix === '" "', 'control: WooCommerce alone prints the clearfix pseudo-element');

await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${THEME_CSS}</style><style>${blockCss}</style><style>${WOO_CSS}</style></head><body class="woocommerce-account woocommerce-page">${BODY}</body></html>`);
const r = await page.evaluate(read);
ok(r.addrClearfix === 'none', `addresses: the clearfix pseudo-element is gone (content ${r.addrClearfix})`);
ok(r.addrSameRow, 'addresses: both cards sit in row 1');
ok(r.addrCellWidth.every((w) => Math.abs(w - r.addrExpected) <= 1), `addresses: each card fills its cell (${r.addrCellWidth.join(', ')}px, cell ${r.addrExpected}px)`);
ok(r.pairClearfix === 'none', `sign-in pair: the clearfix pseudo-element is gone (content ${r.pairClearfix})`);
ok(r.pairSameRow, 'sign-in pair: both columns sit on one line');
ok(r.tabsColFloat === 'none' && Math.abs(r.tabsColWidth - r.tabsSetWidth) <= 1, `tabs layout: a column is as wide as the card (${r.tabsColWidth}px of ${r.tabsSetWidth}px, float ${r.tabsColFloat})`);
ok(r.resetFloats.every((f) => f === 'none') && r.resetWidths.every((w) => Math.abs(w - r.resetExpected) <= 1), `lost-password form: both rows run the form's width unfloated (${r.resetWidths.join(', ')}px of ${r.resetExpected}px)`);

await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
