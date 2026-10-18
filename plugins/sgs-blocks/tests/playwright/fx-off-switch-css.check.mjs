// Computed-style check for the per-device off switch in the fx-*.css stylesheets (Spec 38A FR-38A-23).
//
// jsdom does not evaluate media queries, so this drives real Chromium at 375 / 767 / 768 / 900 / 1023 / 1024 / 1440 wide (both sides of each tier edge) against a static
// fixture that loads the real assets/css files (motion.css plus the effect's own stylesheet). It needs no WordPress
// site and no credentials, so it is a standalone script rather than part of the live-site Playwright suite.
//
// For every effect it proves, per width:
//   - RED CONTROL: with no off attribute the effect is present (the probe value differs from the neutral value),
//     so a neutral reading is a real change and not an artefact of the fixture.
//   - data-sgs-fx-off-<tier> names the effect: neutral at that tier only; the other tiers and desktop keep the effect.
//   - data-sgs-fx-disable-<tier> (flat): neutral at that tier only.
//   - an off list naming a different effect leaves this effect alone.
//
// Run:            node tests/playwright/fx-off-switch-css.check.mjs
// Prove it fails: SGS_FX_CSS_BASELINE=1 node tests/playwright/fx-off-switch-css.check.mjs
//                 (loads each stylesheet as committed at HEAD, before the gate blocks; the gate cases must go red).
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..', '..');
const require = createRequire(path.join(pluginRoot, 'package.json'));
const { chromium } = require('playwright');
const BASELINE = process.env.SGS_FX_CSS_BASELINE === '1';

const WIDTHS = [375, 767, 768, 900, 1023, 1024, 1440];
const TIER_OF = { 375: 'mobile', 767: 'mobile', 768: 'tablet', 900: 'tablet', 1023: 'tablet', 1024: 'desktop', 1440: 'desktop' };
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

// probe: { sel, pseudo?, prop, off, custom? } reads one value; `off` is the value the neutralised state must read.
// skipControlAt: widths where the effect is not active by design (neutral already), so only the neutral side applies.
const CASES = [
	{ slug: 'sheen', html: (a) => `<div data-test-host data-sgs-fx="sheen" ${a}><span class="sgs-motion-layer" data-sgs-layer="sheen"></span></div>`, probe: { sel: '.sgs-motion-layer', prop: 'display', off: 'none' } },
	{ slug: 'glare', html: (a) => `<div data-test-host data-sgs-fx="glare" ${a}><span class="sgs-motion-layer" data-sgs-layer="glare"></span></div>`, probe: { sel: '.sgs-motion-layer', prop: 'display', off: 'none' } },
	{ slug: 'curtain', html: (a) => `<div data-test-host data-sgs-fx="curtain" ${a}><span class="sgs-motion-layer" data-sgs-layer="curtain"></span></div>`, probe: { sel: '.sgs-motion-layer', prop: 'display', off: 'none' } },
	{ slug: 'ripple', html: (a) => `<div data-test-host data-sgs-fx="ripple" data-sgs-mc="::after" ${a}></div>`, probe: { sel: null, pseudo: '::after', prop: 'display', off: 'none' } },
	{ slug: 'scroll-progress', html: (a) => `<div data-test-host data-sgs-fx="scroll-progress" style="--sgs-scroll-progress:0.5" ${a}></div>`, probe: { sel: null, prop: '--sgs-scroll-progress-value', off: '0' } },
	{ slug: 'parallax', html: (a) => `<div data-test-host data-sgs-fx="parallax" style="--sgs-fx-parallax-travel:100px;--sgs-fx-parallax-ratio:0.5" ${a}></div>`, probe: { sel: null, prop: '--sgs-plx-y', off: '0px' } },
	{ slug: 'magnet', html: (a) => `<div data-test-host data-sgs-fx="magnet" style="--sgs-mag-x:12px" ${a}></div>`, probe: { sel: null, prop: '--sgs-mag-x', off: '0px' } },
	{ slug: 'particles', html: (a) => `<div data-test-host data-sgs-fx="particles" ${a}><canvas class="sgs-particles__canvas"></canvas></div>`, probe: { sel: 'canvas', prop: 'display', off: 'none' } },
	{ slug: 'grid-dots', html: (a) => `<div data-test-host data-sgs-fx="grid-dots" ${a}><canvas class="sgs-grid-dots__canvas"></canvas></div>`, probe: { sel: 'canvas', prop: 'display', off: 'none' } },
	{ slug: 'surface-treatment', html: (a) => `<div data-test-host data-sgs-fx="surface-treatment" ${a}><img src="${PIXEL}" alt=""><canvas class="sgs-webgl-surface"></canvas></div>`, probe: { sel: 'canvas', prop: 'display', off: 'none' } },
	{ slug: 'marquee', name: 'marquee clone', html: (a) => `<div data-test-host data-sgs-fx="marquee" data-sgs-marquee="on" ${a}><div data-sgs-marquee-lane="on"><div data-sgs-marquee-set>a</div><div data-sgs-marquee-clone>a</div></div></div>`, probe: { sel: '[data-sgs-marquee-clone]', prop: 'display', off: 'none' } },
	{ slug: 'marquee', name: 'marquee translate', html: (a) => `<div data-test-host data-sgs-fx="marquee" data-sgs-marquee="on" ${a}><div data-sgs-marquee-lane="on"><div data-sgs-marquee-set style="--sgs-marquee-x:10px">a</div></div></div>`, probe: { sel: '[data-sgs-marquee-set]', prop: 'translate', off: 'none' } },
	{ slug: 'marquee', name: 'marquee edge fade', html: (a) => `<div data-test-host data-sgs-fx="marquee" data-sgs-marquee="on" data-sgs-fx-marquee-edge-fade="true" ${a}><div data-sgs-marquee-lane="on"><div data-sgs-marquee-set>a</div></div></div>`, probe: { sel: '[data-sgs-marquee-lane]', prop: 'mask-image', off: 'none' } },
	{ slug: 'lottie', name: 'lottie player svg', html: (a) => `<div data-test-host class="sgs-lottie" data-sgs-fx="lottie" ${a}><img src="${PIXEL}" alt=""><svg></svg></div>`, probe: { sel: 'svg', prop: 'display', off: 'none' } },
	{ slug: 'lottie', name: 'lottie poster', html: (a) => `<div data-test-host class="sgs-lottie" data-sgs-fx="lottie" ${a}><img src="${PIXEL}" alt=""><svg></svg></div>`, probe: { sel: 'img', prop: 'visibility', off: 'visible' } },
	{ slug: 'generative-background', name: 'generative-background ground', html: (a) => `<div data-test-host data-sgs-fx="generative-background" ${a}></div>`, probe: { sel: null, prop: 'background-image', off: 'none' } },
	{ slug: 'generative-background', name: 'generative-background canvas', html: (a) => `<div data-test-host data-sgs-fx="generative-background" ${a}><canvas class="sgs-generative-background__canvas"></canvas></div>`, probe: { sel: 'canvas', prop: 'display', off: 'none' } },
	{ slug: 'wave-gradient', name: 'wave-gradient animation', html: (a) => `<div data-test-host class="sgs-wave-gradient--pastel" data-sgs-fx="wave-gradient" ${a}></div>`, probe: { sel: null, prop: 'animation-name', off: 'none' } },
	{ slug: 'wave-gradient', name: 'wave-gradient blob', html: (a) => `<div data-test-host class="sgs-wave-gradient--pastel" data-sgs-fx="wave-gradient" ${a}></div>`, probe: { sel: null, pseudo: '::before', prop: 'display', off: 'none' } },
	{ slug: 'cursor-field', name: 'cursor-field layer', html: (a) => `<div data-test-host data-sgs-fx="cursor-field" data-sgs-cursor-field="glow" ${a}><div data-sgs-cursor-participant></div></div>`, probe: { sel: null, prop: '--sgs-cursor-field-layer', off: 'none' } },
	{ slug: 'cursor-field', name: 'cursor-field participant', html: (a) => `<div data-test-host data-sgs-fx="cursor-field" data-sgs-cursor-field="glow" ${a}><div data-sgs-cursor-participant></div></div>`, probe: { sel: '[data-sgs-cursor-participant]', prop: 'background-image', off: 'none' } },
	{ slug: 'horizontal-panel', name: 'horizontal-panel (default breakpoint)', skipControlAt: [375, 767], html: (a) => `<div data-test-host data-sgs-fx="horizontal-panel" ${a}><div data-sgs-fx-track><div class="wp-block-sgs-container"><div></div></div></div></div>`, probe: { sel: null, prop: 'overflow-x', off: 'auto' } },
	{ slug: 'horizontal-panel', name: 'horizontal-panel (mobile breakpoint)', html: (a) => `<div data-test-host data-sgs-fx="horizontal-panel" data-sgs-fx-horizontal-panel-breakpoint="mobile" ${a}><div data-sgs-fx-track><div class="wp-block-sgs-container"><div></div></div></div></div>`, probe: { sel: null, prop: 'overflow-x', off: 'auto' } },
	{ slug: 'motion-path', html: (a) => `<div data-test-host class="sgs-fx-motion-path--resting" data-sgs-fx="motion-path" ${a}></div>`, probe: { sel: null, prop: 'position', off: 'static' } },
	{ slug: 'morph', name: 'morph overlay (attributes on the block root)', html: (a) => `<div id="root" data-test-host ${a}></div><svg class="sgs-fx-shape-visual" viewBox="0 0 100 100"><path data-sgs-fx="morph" d="M0 0"></path></svg><svg class="sgs-fx-shape-target" viewBox="0 0 100 100"><path d="M0 0"></path></svg>`, probe: { sel: '.sgs-fx-shape-visual', scope: 'document', prop: 'display', off: 'none' } },
	{ slug: 'morph', name: 'morph overlay (attributes on the path)', html: (a) => `<div id="root"></div><svg class="sgs-fx-shape-visual" viewBox="0 0 100 100"><path data-test-host data-sgs-fx="morph" ${a} d="M0 0"></path></svg>`, probe: { sel: '.sgs-fx-shape-visual', scope: 'document', prop: 'display', off: 'none' } },
];

// Which widths each variant neutralises.
const VARIANTS = [
	{ id: 'none', attrs: () => '', neutral: [] },
	{ id: 'off-both', attrs: (s) => `data-sgs-fx-off-mobile="${s}" data-sgs-fx-off-tablet="${s}"`, neutral: [375, 767, 768, 900, 1023] },
	{ id: 'off-mobile-only', attrs: (s) => `data-sgs-fx-off-mobile="${s}"`, neutral: [375, 767] },
	{ id: 'off-tablet-only', attrs: (s) => `data-sgs-fx-off-tablet="${s}"`, neutral: [768, 900, 1023] },
	{ id: 'disable-both', attrs: () => 'data-sgs-fx-disable-mobile="1" data-sgs-fx-disable-tablet="1"', neutral: [375, 767, 768, 900, 1023] },
	{ id: 'disable-tablet-only', attrs: () => 'data-sgs-fx-disable-tablet="1"', neutral: [768, 900, 1023] },
	{ id: 'off-other-effect', attrs: () => 'data-sgs-fx-off-mobile="zzz-other" data-sgs-fx-off-tablet="zzz-other"', neutral: [] },
];

function readCss(file) {
	if (BASELINE && file !== 'motion.css') {
		try {
			return execFileSync('git', ['show', `HEAD:plugins/sgs-blocks/assets/css/${file}`], { cwd: pluginRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
		} catch (e) {
			return readFileSync(path.join(pluginRoot, 'assets/css', file), 'utf8');
		}
	}
	return readFileSync(path.join(pluginRoot, 'assets/css', file), 'utf8');
}

const ROOT_VARS = ':root{--wp--preset--color--primary:#c00;--wp--preset--color--accent:#0c0;--wp--preset--color--accent-light:#0cc;--wp--preset--color--primary-dark:#600;--wp--preset--color--surface:#eee}';

async function read(page, probe) {
	return page.evaluate((p) => {
		const host = document.querySelector('[data-test-host]');
		const el = p.sel ? (p.scope === 'document' ? document : host).querySelector(p.sel) : host;
		const cs = getComputedStyle(el, p.pseudo || null);
		const v = p.prop.startsWith('--') ? cs.getPropertyValue(p.prop) : cs.getPropertyValue(p.prop);
		return String(v).trim();
	}, probe);
}

const browser = await chromium.launch();
let fails = 0;
let checks = 0;
const report = (ok, msg) => {
	checks += 1;
	if (!ok) fails += 1;
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

for (const c of CASES) {
	const label = c.name || c.slug;
	const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
	await page.setContent(`<!doctype html><html class="sgs-js"><head><meta charset="utf-8"><style>${ROOT_VARS}</style></head><body>${c.html('')}</body></html>`);
	await page.addStyleTag({ content: readCss('motion.css') });
	await page.addStyleTag({ content: readCss(`fx-${c.slug}.css`) });

	const control = {};
	for (const w of WIDTHS) {
		await page.setViewportSize({ width: w, height: 800 });
		control[w] = await read(page, c.probe);
	}
	// RED CONTROL: wherever the effect is active, the unswitched reading must not be the neutral one.
	for (const w of WIDTHS) {
		if ((c.skipControlAt || []).includes(w)) continue;
		report(control[w] !== c.probe.off, `${label} @${w} red control: effect present with no off attribute (reads "${control[w]}", neutral is "${c.probe.off}")`);
	}

	for (const v of VARIANTS) {
		if (v.id === 'none') continue;
		await page.setContent(`<!doctype html><html class="sgs-js"><head><meta charset="utf-8"><style>${ROOT_VARS}</style></head><body>${c.html(v.attrs(c.slug))}</body></html>`);
		await page.addStyleTag({ content: readCss('motion.css') });
		await page.addStyleTag({ content: readCss(`fx-${c.slug}.css`) });
		for (const w of WIDTHS) {
			await page.setViewportSize({ width: w, height: 800 });
			const got = await read(page, c.probe);
			const wantNeutral = v.neutral.includes(w);
			if (wantNeutral) {
				report(got === c.probe.off, `${label} @${w} (${TIER_OF[w]}) ${v.id}: neutralised (reads "${got}", wants "${c.probe.off}")`);
			} else if (!(c.skipControlAt || []).includes(w)) {
				report(got === control[w], `${label} @${w} (${TIER_OF[w]}) ${v.id}: effect kept (reads "${got}", control "${control[w]}")`);
			}
		}
	}
	await page.close();
}

await browser.close();
console.log(`\n${checks - fails}/${checks} checks passed${BASELINE ? ' (BASELINE stylesheets from HEAD: failures are expected here)' : ''}`);
process.exit(fails === 0 ? 0 : 1);
