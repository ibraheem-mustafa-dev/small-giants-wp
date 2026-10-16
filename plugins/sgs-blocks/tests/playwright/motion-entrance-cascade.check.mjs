// Real-browser cascade check: a Spec 38A entrance owns every animation longhand while it plays, whatever else the
// element carries, and an element's own looping animation (the media atom's ken burns or svg presentation, the
// wave-gradient drift, the container ken burns) keeps running underneath it and after it.
//
// jsdom has no cascade and no Web Animations, so this drives real Chromium against static pages that load the real
// stylesheets (assets/css/motion.css, motion-triggers.css, media-element.css, fx-wave-gradient.css and the container
// and nav-drawer-menu block styles). It runs every case with the stylesheets in both orders, so a result never depends
// on which file the page happens to print last. No WordPress site, no credentials.
//
// Run:             node tests/playwright/motion-entrance-cascade.check.mjs
// Mutation check:  SGS_ENTRANCE_CASCADE_MUTATE=<id> node tests/playwright/motion-entrance-cascade.check.mjs
//                  (removes one declaration from the stylesheets in memory; the run must go red). Ids are in MUTATIONS.
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, '..', '..');
const require = createRequire(path.join(pluginRoot, 'package.json'));
const { chromium } = require('playwright');

// Each mutation deletes every line of one file that contains the needle (the declaration under test).
const MUTATIONS = {
	'entrance-iteration': { file: 'assets/css/motion.css', needle: 'animation-iteration-count: var(--sgs-me-a-list-iteration-count)' },
	'entrance-duration': { file: 'assets/css/motion.css', needle: 'animation-duration: var(--sgs-me-a-list-duration)' },
	'base-name': { file: 'assets/css/media-element.css', needle: '--sgs-base-animation-name:' },
	'open-longhands': { file: 'assets/css/motion-triggers.css', needle: 'animation-direction: var(--sgs-me-a-list-direction)' },
};
const MUTATE = process.env.SGS_ENTRANCE_CASCADE_MUTATE || '';
if (MUTATE && !MUTATIONS[MUTATE]) {
	console.error(`unknown mutation "${MUTATE}"; one of: ${Object.keys(MUTATIONS).join(', ')}`);
	process.exit(2);
}

function css(rel) {
	const text = readFileSync(path.join(pluginRoot, rel), 'utf8');
	const m = MUTATIONS[MUTATE];
	if (!m || m.file !== rel) return text;
	const out = text.split('\n').filter((line) => !line.includes(m.needle));
	if (out.length === text.split('\n').length) {
		console.error(`mutation "${MUTATE}" matched nothing in ${rel}`);
		process.exit(2);
	}
	return out.join('\n');
}

const MOTION = ['assets/css/motion.css', 'assets/css/motion-triggers.css'];
const OTHERS = ['assets/css/media-element.css', 'assets/css/fx-wave-gradient.css', 'src/blocks/container/style.css', 'src/blocks/nav-drawer-menu/style.css'];
const ORDERS = { 'motion first': [...MOTION, ...OTHERS], 'motion last': [...OTHERS, ...MOTION] };
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const KB = '--sgs-media-motion-animation-name:sgs-media-motion-ken-burns;--sgs-media-motion-animation-duration:12s';
const ENTRANCE = 'sgs-me-translate, none, none, none, sgs-me-opacity, none, none';
const E7 = (v) => Array(7).fill(v).join(', ');

// Each case: markup (the probe is #t), and the computed longhands it must read. `live` checks the running animations.
const CASES = [
	{
		id: 'entrance only, playing',
		html: `<div id="t" data-sgs-me="scroll translate opacity" data-sgs-in style="--sgs-me-dur:500ms;--sgs-me-from-ty:24px;--sgs-me-from-op:0"></div>`,
		want: { 'animation-name': `none, ${ENTRANCE}`, 'animation-duration': `0s, ${E7('0.5s')}`, 'animation-iteration-count': `1, ${E7('1')}`, 'animation-direction': `normal, ${E7('normal')}`, 'animation-fill-mode': `none, ${E7('backwards')}` },
	},
	{
		id: 'negative control: media atom only keeps its own composed animation',
		html: `<img id="t" class="sgs-media-el" src="${PIXEL}" alt="" style="${KB}">`,
		want: { 'animation-name': 'none, sgs-media-motion-ken-burns', 'animation-duration': '0s, 12s', 'animation-iteration-count': 'infinite, infinite', 'animation-direction': 'alternate, alternate', 'animation-fill-mode': 'none, none' },
	},
	{
		id: 'media atom + scroll entrance before reveal: the media loop alone, untouched',
		html: `<img id="t" class="sgs-media-el" data-sgs-me="scroll translate opacity" src="${PIXEL}" alt="" style="${KB};--sgs-me-dur:500ms;--sgs-me-from-ty:24px;--sgs-me-from-op:0">`,
		want: { 'animation-name': 'none, sgs-media-motion-ken-burns', 'animation-duration': '0s, 12s', 'animation-iteration-count': 'infinite, infinite', 'animation-direction': 'alternate, alternate' },
	},
	{
		id: 'media atom + scroll entrance playing: entrance owns its positions, the loop keeps its own',
		html: `<img id="t" class="sgs-media-el" data-sgs-me="scroll translate opacity" data-sgs-in src="${PIXEL}" alt="" style="${KB};--sgs-me-dur:500ms;--sgs-me-from-ty:24px;--sgs-me-from-op:0">`,
		want: { 'animation-name': `none, sgs-media-motion-ken-burns, ${ENTRANCE}`, 'animation-duration': `0s, 12s, ${E7('0.5s')}`, 'animation-iteration-count': `infinite, infinite, ${E7('1')}`, 'animation-direction': `alternate, alternate, ${E7('normal')}`, 'animation-fill-mode': `none, none, ${E7('backwards')}`, 'animation-timeline': `auto, auto, ${E7('auto')}` },
		live: true,
	},
	{
		id: 'media atom (parallax timeline) + load entrance: the entrance runs on the document timeline',
		html: `<img id="t" class="sgs-media-el" data-sgs-me="load opacity" src="${PIXEL}" alt="" style="--sgs-media-motion-animation-name:sgs-media-motion-parallax;--sgs-media-motion-animation-timing-function:linear;--sgs-media-motion-animation-iteration-count:1;--sgs-media-motion-animation-direction:normal;--sgs-media-motion-animation-fill-mode:both;--sgs-media-motion-animation-timeline:scroll(root);--sgs-me-dur:500ms;--sgs-me-from-op:0">`,
		want: { 'animation-name': 'none, sgs-media-motion-parallax, none, none, none, none, sgs-me-opacity, none, none', 'animation-duration': `0s, 20s, ${E7('0.5s')}`, 'animation-timeline': `scroll(root), scroll(root), ${E7('auto')}` },
	},
	{
		id: 'open entrance on a media atom: the open duration default, fill both, one run',
		html: `<div data-sgs-motion-state="open"><img id="t" class="sgs-media-el" data-sgs-me="open opacity" src="${PIXEL}" alt="" style="${KB};--sgs-me-from-op:0"></div>`,
		want: { 'animation-name': 'none, sgs-media-motion-ken-burns, none, none, none, none, sgs-me-opacity, none, none', 'animation-duration': `0s, 12s, ${E7('0.45s')}`, 'animation-iteration-count': `infinite, infinite, ${E7('1')}`, 'animation-direction': `alternate, alternate, ${E7('normal')}`, 'animation-fill-mode': `none, none, ${E7('both')}` },
	},
	{
		id: 'close entrance on a media atom: the close timing, one run',
		html: `<div data-sgs-motion-state="close"><img id="t" class="sgs-media-el" data-sgs-me="open opacity" src="${PIXEL}" alt="" style="${KB};--sgs-me-from-op:0;--sgs-me-close-dur:300ms;--sgs-me-close-delay:40ms"></div>`,
		want: { 'animation-name': 'none, sgs-media-motion-ken-burns, none, none, none, none, sgs-me-close-opacity, none, none', 'animation-duration': `0s, 12s, ${E7('0.3s')}`, 'animation-delay': `0s, 0s, ${E7('0.04s')}`, 'animation-iteration-count': `infinite, infinite, ${E7('1')}` },
	},
	{
		id: 'state entrance on a media atom (per-instance name rule): one run at its own duration',
		extraCss: '#host #t:is([data-sgs-motion-state~="on"],[data-sgs-motion-state~="on"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none)}',
		html: `<div id="host" data-sgs-motion-state="on"><img id="t" class="sgs-media-el" data-sgs-me="state opacity" src="${PIXEL}" alt="" style="${KB};--sgs-me-dur:500ms;--sgs-me-from-op:0"></div>`,
		want: { 'animation-name': 'none, sgs-media-motion-ken-burns, none, none, none, none, sgs-me-opacity, none, none', 'animation-duration': `0s, 12s, ${E7('0.5s')}`, 'animation-iteration-count': `infinite, infinite, ${E7('1')}`, 'animation-fill-mode': `none, none, ${E7('both')}` },
	},
	{
		id: 'wave-gradient (pastel) host + entrance playing: the drift keeps its own timing',
		html: `<div id="t" class="sgs-wave-gradient--pastel" data-sgs-fx="wave-gradient" data-sgs-me="load opacity" style="--sgs-me-dur:500ms;--sgs-me-from-op:0"></div>`,
		want: { 'animation-name': 'sgs-wave-pastel-base, none, none, none, none, sgs-me-opacity, none, none', 'animation-duration': `26s, ${E7('0.5s')}`, 'animation-iteration-count': `infinite, ${E7('1')}` },
	},
	{
		id: 'wave-gradient (pastel) host, no entrance: its own animation unchanged',
		html: `<div id="t" class="sgs-wave-gradient--pastel" data-sgs-fx="wave-gradient"></div>`,
		want: { 'animation-name': 'sgs-wave-pastel-base', 'animation-duration': '26s', 'animation-iteration-count': 'infinite' },
	},
	{
		id: 'container ken burns + entrance playing: the zoom keeps its own timing',
		html: `<div id="t" class="sgs-container--ken-burns" data-sgs-me="load opacity" style="--sgs-me-dur:500ms;--sgs-me-from-op:0"></div>`,
		want: { 'animation-name': 'sgs-container-ken-burns, none, none, none, none, sgs-me-opacity, none, none', 'animation-duration': `20s, ${E7('0.5s')}`, 'animation-iteration-count': `infinite, ${E7('1')}`, 'animation-direction': `alternate, ${E7('normal')}` },
	},
	{
		id: 'drawer drill item with an open entrance: fills backwards only (nav-drawer-menu override survives)',
		html: `<div data-sgs-motion-state="open"><ul class="sgs-nav-drawer-menu__bar--drawer" data-drill-enhanced><li id="t" class="sgs-nav-drawer-menu__item" data-sgs-me="open translate" style="--sgs-me-from-ty:8px"></li></ul></div>`,
		want: { 'animation-fill-mode': `none, ${E7('backwards')}`, 'animation-iteration-count': `1, ${E7('1')}` },
	},
];

const browser = await chromium.launch();
let fails = 0;
let checks = 0;
const report = (ok, msg) => {
	checks += 1;
	if (!ok) fails += 1;
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

for (const [order, files] of Object.entries(ORDERS)) {
	for (const c of CASES) {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
		await page.setContent(`<!doctype html><html class="sgs-js sgs-motion-ready"><head><meta charset="utf-8"></head><body style="min-height:3000px">${c.html}</body></html>`);
		for (const f of files) await page.addStyleTag({ content: css(f) });
		if (c.extraCss) await page.addStyleTag({ content: c.extraCss });
		const got = await page.evaluate((props) => {
			const cs = getComputedStyle(document.getElementById('t'));
			return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p).trim()]));
		}, Object.keys(c.want));
		for (const [prop, want] of Object.entries(c.want)) {
			report(got[prop] === want, `[${order}] ${c.id}: ${prop} reads "${got[prop]}"${got[prop] === want ? '' : `, wants "${want}"`}`);
		}
		if (c.live) {
			// Behaviour, not only computed values: the fade animates (never a one-frame snap), runs once, and the
			// media loop is the same running animation before, during and after the entrance.
			const live = await page.evaluate(async () => {
				const el = document.getElementById('t');
				const byName = (n) => el.getAnimations().find((a) => a.animationName === n);
				el.removeAttribute('data-sgs-in');
				await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
				const loopBefore = byName('sgs-media-motion-ken-burns');
				el.setAttribute('data-sgs-in', '');
				await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
				const fade = byName('sgs-me-opacity');
				const timing = fade ? fade.effect.getComputedTiming() : null;
				const samples = [];
				if (fade) {
					fade.pause();
					for (const t of [0, 125, 250, 375]) {
						fade.currentTime = t;
						samples.push(Number(getComputedStyle(el).opacity));
					}
					try {
						fade.finish();
					} catch {
						// An endless fade cannot finish; the iteration and rest checks below report it.
					}
				}
				await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
				const loopAfter = byName('sgs-media-motion-ken-burns');
				return {
					duration: timing ? timing.duration : null,
					iterations: timing ? timing.iterations : null,
					samples,
					fadeGone: !byName('sgs-me-opacity') || byName('sgs-me-opacity').playState === 'finished',
					sameLoop: Boolean(loopBefore) && loopBefore === loopAfter,
					loopRunning: loopAfter ? loopAfter.playState : 'absent',
					opacityAfter: Number(getComputedStyle(el).opacity),
				};
			});
			const rising = live.samples.length === 4 && live.samples.every((v, i, a) => i === 0 || v > a[i - 1]) && live.samples[1] > 0 && live.samples[3] < 1;
			report(live.duration === 500 && live.iterations === 1, `[${order}] ${c.id}: the fade runs once for 500ms (duration ${live.duration}, iterations ${live.iterations})`);
			report(rising, `[${order}] ${c.id}: opacity rises through the fade, no snap (samples at 0/125/250/375ms: ${live.samples.map((v) => v.toFixed(3)).join(', ')})`);
			report(live.sameLoop && live.loopRunning === 'running', `[${order}] ${c.id}: the media loop is the same running animation before and after the entrance (same ${live.sameLoop}, ${live.loopRunning})`);
			report(live.fadeGone && live.opacityAfter === 1, `[${order}] ${c.id}: after the fade the element rests at full opacity (${live.opacityAfter})`);
		}
		await page.close();
	}
}

await browser.close();
console.log(`\n${checks - fails}/${checks} checks passed${MUTATE ? ` (mutation "${MUTATE}": failures are expected)` : ''}`);
process.exit(fails === 0 ? 0 : 1);
