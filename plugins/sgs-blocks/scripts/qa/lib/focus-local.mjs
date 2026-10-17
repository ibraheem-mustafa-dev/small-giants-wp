/**
 * `--local` mode of probe-focus-system.mjs: a generated HTML fixture plus the focus CSS file, tabbed through in each
 * engine. Three grounds (light, `.sgs-on-dark`, `.sgs-container--has-bg-image`), nine controls on each: a filled
 * button, an outline button, a text link, a text input, a range, a proxied radio (`sgs-focus-source` with an adjacent
 * `sgs-focus-proxy`), an inset tab (`sgs-focus--inset` in a clipping box), a borderless signature button and a
 * signature button with a 2px border that declares it through `--sgs-focus-host-border`.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import { summarise } from './focus-probe-lib.mjs';
import { tabThrough } from './focus-measure.mjs';

export const CONTROLS_PER_GROUND = 9;
export const GROUNDS = [
	{ key: 'light', cls: 'sgs-on-light', css: 'background:#ffffff;color:#0b1020' },
	{ key: 'dark', cls: 'sgs-on-dark', css: 'background:#101828;color:#ffffff' },
	{ key: 'photo', cls: 'sgs-container--has-bg-image', css: 'background:repeating-conic-gradient(#7d7d7d 0 25%,#838383 0 50%) 0 0/12px 12px;color:#ffffff' },
];

/** The fixture page. `focusCss` is the text of the focus stylesheet under test. */
export function fixtureHtml( focusCss ) {
	const ground = ( g ) => `
<section class="g ${ g.cls }" data-ground="${ g.key }">
	<a class="b b-fill" href="#${ g.key }-fill">Filled ${ g.key }</a>
	<a class="b b-out" href="#${ g.key }-out">Outline ${ g.key }</a>
	<a class="link" href="#${ g.key }-link">Text link ${ g.key }</a>
	<input type="text" class="field" aria-label="Text input ${ g.key }" value="Input ${ g.key }">
	<input type="range" class="slider" aria-label="Range ${ g.key }" min="0" max="100" value="40">
	<label class="pick"><input type="radio" class="sgs-focus-source" name="pick-${ g.key }" aria-label="Radio ${ g.key }"><span class="sgs-focus-proxy pill">Pill ${ g.key }</span></label>
	<div class="clipbox"><button type="button" class="b b-fill sgs-focus--inset">Inset tab ${ g.key }</button></div>
	<button type="button" class="b b-fill sgs-focus--signature">Signature ${ g.key }</button>
	<button type="button" class="b b-out b-host-border sgs-focus--signature">Bordered signature ${ g.key }</button>
</section>`;
	return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--wp--preset--color--surface:#ffffff;--wp--preset--color--text:#0b1020;--wp--preset--color--accent:#0e7c86;--wp--preset--color--primary:#1f3a5f;--wp--preset--color--accent-light:#7ad0d8}
body{margin:0;font:16px/1.4 system-ui,sans-serif}
.g{padding:28px 24px;display:flex;flex-wrap:wrap;gap:28px;align-items:center}
.b{font:inherit;padding:10px 18px;border:2px solid transparent;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-block}
.b-fill{background:#0e7c86;color:#ffffff;border-width:0}
.b-out{background:transparent;border-color:currentColor;color:inherit}
.field{font:inherit;padding:8px 10px;border:1px solid #888;border-radius:4px;width:150px}
.slider{width:160px;height:20px;-webkit-appearance:none;appearance:none;background:transparent;margin:0}
.slider::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:color-mix(in srgb,currentColor 15%,transparent)}
.slider::-moz-range-track{height:4px;border-radius:2px;background:color-mix(in srgb,currentColor 15%,transparent)}
.slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-6px;width:16px;height:16px;border-radius:50%;background:#555}
.slider::-moz-range-thumb{width:16px;height:16px;border:0;border-radius:50%;background:#555}
.pick{display:inline-block;position:relative}
.sgs-focus-source{position:absolute;opacity:0;width:1px;height:1px;margin:0;clip-path:inset(50%)}
.pill{display:inline-block;padding:6px 16px;border:2px solid currentColor;border-radius:999px}
.clipbox{overflow:hidden;display:inline-block;line-height:0}
.clipbox .b{border-radius:0}
.b-host-border{--sgs-focus-host-border:2px}
</style>
<style id="focus-under-test">${ focusCss }</style>
</head><body>${ GROUNDS.map( ground ).join( '' ) }</body></html>`;
}

/** The deliberately bad CSS for the negative control: a 1px outline in the background's own colour, no shadow. */
export const BAD_CSS = `
.sgs-on-light :focus-visible{outline:1px solid #ffffff;box-shadow:none}
.sgs-on-dark :focus-visible{outline:1px solid #101828;box-shadow:none}
.sgs-container--has-bg-image :focus-visible{outline:1px solid #808080;box-shadow:none}
`;

/**
 * Tab through the fixture in one engine at each width. Returns the per-width results and an `ok` flag that is false
 * when the fixture was not fully reached (a vacuous pass is a failure).
 */
export async function runLocalEngine( browser, engine, cssText, opts, scratch ) {
	const mode = { forcedColors: opts.forcedColors, reducedMotion: opts.reducedMotion };
	const results = [];
	for ( const width of opts.widths ) {
		const context = await browser.newContext( {
			viewport: { width, height: 900 },
			forcedColors: opts.forcedColors ? 'active' : 'none',
			reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
		} );
		const page = await context.newPage();
		await page.setContent( fixtureHtml( cssText ) );
		const run = await tabThrough( page, {
			maxStops: opts.maxStops,
			tabKey: engine === 'webkit' ? 'programmatic' : 'Tab',
			settle: opts.settle,
			forcedColors: opts.forcedColors,
			shotsDir: opts.shots ? `${ opts.shots }/local-${ engine }` : null,
			shotPrefix: `w${ width }`,
			scratch,
		} );
		await context.close();
		const summary = summarise( run.stops, mode );
		if ( run.capHit ) summary.fails.push( `STOP CAP HIT at ${ width }px: ${ opts.maxStops } stops measured and more focusable elements follow; raise --max-stops` );
		const expected = GROUNDS.length * CONTROLS_PER_GROUND;
		if ( run.stops.length < expected ) {
			summary.fails.push( `only ${ run.stops.length } of ${ expected } fixture controls were reached by Tab (${ run.ended })` );
		}
		results.push( { width, stops: run.stops, ended: run.ended, capHit: run.capHit, summary } );
	}
	return results;
}

/** Read the CSS under test, or exit with a clear message when the file is missing. */
export function readCss( file ) {
	if ( ! fs.existsSync( file ) ) {
		console.error( `focus CSS not found: ${ file }\nPass --css <path> (the system file is theme/sgs-theme/assets/css/focus.css, written by plan Task 4).` );
		process.exit( 2 );
	}
	return fs.readFileSync( file, 'utf8' );
}
