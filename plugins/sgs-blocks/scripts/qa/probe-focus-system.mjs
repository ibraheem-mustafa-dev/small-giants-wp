#!/usr/bin/env node
/**
 * Probe: the unified keyboard focus system, measured (plan 2026-10-17-unified-focus-system.md, Task 2).
 *
 *   --local              a generated fixture (light, .sgs-on-dark and .sgs-container--has-bg-image grounds; eight controls
 *                        each) with the focus CSS file, in Chromium, Firefox and WebKit (--engine, repeatable).
 *   --site <target>      a live site: serial Tab-through of --pages at --widths (default 1440,768,375), up to --max-stops (130)
 *                        stops per page; reaching the cap before the last focusable element prints STOP CAP HIT and exits 1.
 *   --negative-control   runs --local against a deliberately bad CSS (1px outline in the background colour) and passes
 *                        only if the probe fails it.
 *   --determinism        runs --local twice in the same engine and passes only if every stop's contrast reading is identical.
 *
 * Per stop: outline-*, box-shadow and border-radius at rest and on focus; the clip test; and a pixel check (an
 * unfocused and a focused screenshot of the element's box grown by 8px, each taken once the frame has settled: --settle
 * ms (default 1200) after the focus change, then until two consecutive shots are pixel-identical, at most 3 s more; at up
 * to 20 points (four per edge on the straight part, one per corner at 45 degrees) the ring and the inner band are compared
 * with the unfocused pixel 1px outside the ring; a stop passes at min over points of max(contrast(ring), contrast(inner))
 * >= 3). A point whose topmost element (elementsFromPoint) is neither the target, an ancestor of it nor a descendant is a
 * neighbour's box and is skipped; the usable count is recorded, and a stop with fewer than 6 usable points is
 * `unmeasurable` (neither a pass nor a fail, counted on its own line). A focusable neighbour sitting over a sample point is
 * reported as a neighbour overlap. A rounded corner's ring colour is read from the pixel centres of the 3x3 block around
 * its point that lie inside the band, taking the one strongest against the neighbour (the ring's core, as on a straight
 * edge, not its antialiased fringe). A range input that paints its own ring is measured on its thumb, sized from the
 * winning thumb rule when the engine reports no pseudo-element size; a range that is a focus source (the before-after
 * slider) is measured on its proxy.
 * A focus source (`sgs-focus-source`, visually hidden) is measured on the element that paints its ring (the adjacent
 * `sgs-focus-proxy`, the first proxy in the nearest `sgs-focus-scope`, or the `sgs-focus-card`), recorded as
 * `measuredOn: 'proxy'`; a source with none of them is a FAIL named `no-proxy`. The radius-change criterion exempts
 * `.screen-reader-text` and `.skip-link` (visually hidden at rest, so a rest-versus-focus comparison says nothing): the
 * exemption is counted and printed. Prints `looks`, `min contrast` and `clipped` and exits 1 when the acceptance fails
 * (looks > 1 apart from inset and signature stops, min contrast < 3, a clipped non-inset stop, radius changing on
 * focus, a source with no proxy, or fewer fixture controls reached than exist), 2 on a usage or environment error, else 0.
 *
 * Flags: --css <path> (default theme/sgs-theme/assets/css/focus.css) --forced-colors --reduced-motion --axe
 * --shots <dir> --json <file> --widths a,b --open-drawer --open-mega --max-stops N --settle ms (default 1200; --local
 * caps it at 120) --pause ms --self-test (offline judges, then a browser fixture for proxy, neighbour and radius cases)
 *
 * Fixture coverage (page 5389, about 100 stops): light, dark and photo sections each carry SGS buttons, a multi-button, links,
 * form controls, option picker, accordion, tabs and a slider; the light section also carries `sgs-focus--inset`,
 * `sgs-focus--signature` and `sgs-focus--duotone` buttons and a before-after range input. Stacked buttons sit 8px apart
 * (a gap on their container), because the bloom of one overpaints the next. Known gap: no dual-thumb price slider (no SGS
 * block renders it; WooCommerce's own filter markup does, so /shop/ covers it).
 *
 * Token check: each stop's computed outline-color must equal the resolved --sgs-focus-ring (--sgs-focus-ground-core for a
 * signature stop or a duotone or photo ground) and its box-shadow must carry a solid hairline in the resolved
 * --sgs-focus-hairline, which on a G2 stop must differ from the core, else `token-mismatch`. An inline element that wraps
 * (one ring per line box) is measured on its widest line box. A page with no --sgs-focus-* properties prints `tokens not defined` and judges nothing.
 *
 * Own headless Playwright from plugins/sgs-blocks/node_modules, never the shared MCP browser.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, selfTest, summarise } from './lib/focus-probe-lib.mjs';
import { BAD_CSS, readCss, runLocalEngine } from './lib/focus-local.mjs';
import { runSite } from './lib/focus-site.mjs';
import { browserSelfTest } from './lib/focus-selftest-browser.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', '..' );
const DEFAULT_CSS = path.join( REPO, 'theme', 'sgs-theme', 'assets', 'css', 'focus.css' );
const ENGINES = { chromium, firefox, webkit };

const fmt = ( v ) => ( v === null || v === undefined ? 'n/a' : Number( v ).toFixed( 2 ) );

/** The headline numbers over a set of widths' summaries, in the format the plan quotes. */
function headline( perWidth, extraFails ) {
	const looks = Math.max( 0, ...perWidth.map( ( s ) => s.looks ) );
	const exempt = [ ...new Set( perWidth.flatMap( ( s ) => s.exempt ) ) ];
	const mins = perWidth.map( ( s ) => s.minContrast ).filter( ( v ) => v !== null );
	return {
		looks,
		looksFull: Math.max( 0, ...perWidth.map( ( s ) => s.looksFull ) ),
		exempt,
		minContrast: mins.length ? Math.min( ...mins ) : null,
		clipped: perWidth.reduce( ( n, s ) => n + s.clipped, 0 ),
		radiusChanged: perWidth.reduce( ( n, s ) => n + s.radiusChanged, 0 ),
		radiusExempt: perWidth.reduce( ( n, s ) => n + s.radiusExempt, 0 ),
		radiusExemptReasons: [ ...new Set( perWidth.flatMap( ( s ) => s.radiusExemptReasons ) ) ],
		measuredOnProxy: perWidth.reduce( ( n, s ) => n + s.measuredOnProxy, 0 ),
		noProxy: perWidth.reduce( ( n, s ) => n + s.noProxy, 0 ),
		unmeasurable: perWidth.reduce( ( n, s ) => n + s.unmeasurable, 0 ),
		unmeasurableReasons: perWidth.flatMap( ( s ) => s.unmeasurableReasons ),
		unsettled: perWidth.reduce( ( n, s ) => n + s.unsettled, 0 ),
		neighbourOverlaps: perWidth.flatMap( ( s ) => s.neighbourOverlaps ),
		tokenMismatches: perWidth.reduce( ( n, s ) => n + s.tokenMismatches, 0 ),
		tokenStatus: perWidth.some( ( s ) => s.tokenised > 0 )
			? `checked on ${ perWidth.reduce( ( n, s ) => n + s.tokenised, 0 ) } of ${ perWidth.reduce( ( n, s ) => n + s.stops, 0 ) } stops`
			: 'tokens not defined (the page has no --sgs-focus-* properties; nothing judged)',
		fails: [ ...perWidth.flatMap( ( s ) => s.fails ), ...extraFails ],
	};
}

function printHeadline( h, label ) {
	const suffix = h.exempt.length ? ` (+ ${ h.exempt.join( ', ' ) })` : '';
	console.log( `${ label }looks: ${ h.looks }${ suffix }   [wider tuple incl. colour, shadow shape, radius: ${ h.looksFull }]` );
	console.log( `${ label }min contrast: ${ fmt( h.minContrast ) }` );
	console.log( `${ label }clipped: ${ h.clipped }` );
	console.log( `${ label }radius changed on focus: ${ h.radiusChanged }${ h.radiusExempt ? ` (exempt: ${ h.radiusExempt } stop${ h.radiusExempt === 1 ? '' : 's' } on ${ h.radiusExemptReasons.join( ', ' ) }, no rest-versus-focus comparison)` : '' }` );
	console.log( `${ label }focus sources: ${ h.measuredOnProxy } measured on their proxy, ${ h.noProxy } with no proxy` );
	console.log( `${ label }unmeasurable (under 6 usable sample points, neither pass nor fail): ${ h.unmeasurable }; unsettled (two shots never matched): ${ h.unsettled }; neighbour overlaps: ${ h.neighbourOverlaps.length }` );
	h.unmeasurableReasons.slice( 0, 6 ).forEach( ( r ) => console.log( `${ label }  unmeasurable ${ r }` ) );
	h.neighbourOverlaps.slice( 0, 6 ).forEach( ( r ) => console.log( `${ label }  neighbour overlap ${ r }` ) );
	console.log( `${ label }token match: ${ h.tokenStatus }${ h.tokenMismatches ? `, ${ h.tokenMismatches } token-mismatch` : '' }` );
}

async function newScratch( browser ) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto( 'about:blank' );
	return page;
}

async function runLocal( opts, cssFile, label ) {
	const cssText = cssFile === 'bad' ? BAD_CSS : readCss( cssFile );
	const all = [];
	let failed = false;
	for ( const engine of opts.engines ) {
		const browser = await ENGINES[ engine ].launch();
		try {
			const scratch = await newScratch( browser );
			const results = await runLocalEngine( browser, engine, cssText, opts, scratch );
			const h = headline( results.map( ( r ) => r.summary ), [] );
			console.log( `\n[${ engine }] ${ results.map( ( r ) => `${ r.width }px: ${ r.summary.stops } stops` ).join( ', ' ) }` );
			printHeadline( h, `[${ engine }] ` );
			h.fails.slice( 0, 12 ).forEach( ( f ) => console.log( `  FAIL ${ f }` ) );
			if ( h.fails.length > 12 ) console.log( `  ... ${ h.fails.length - 12 } more` );
			failed = failed || h.fails.length > 0;
			all.push( { engine, headline: h, results } );
		} finally {
			await browser.close();
		}
	}
	console.log( `\n${ label }: ${ failed ? 'FAIL' : 'PASS' }` );
	return { failed, all };
}

/** The same --local run twice in each engine; passes only when every stop's contrast reading is identical both times. */
async function runDeterminism( opts, cssFile ) {
	const cssText = readCss( cssFile );
	let differing = 0;
	let total = 0;
	for ( const engine of opts.engines ) {
		const browser = await ENGINES[ engine ].launch();
		try {
			const scratch = await newScratch( browser );
			const readings = [];
			for ( let pass = 0; pass < 2; pass++ ) {
				const results = await runLocalEngine( browser, engine, cssText, opts, scratch );
				readings.push( results.flatMap( ( r ) => r.stops.map( ( s ) => `${ r.width } ${ s.label } ${ JSON.stringify( [ s.contrast.min, s.contrast.points, s.contrast.planned, s.contrast.usable, s.contrast.unmeasurable || null ] ) }` ) ) );
			}
			const diff = readings[ 0 ].filter( ( line, i ) => line !== readings[ 1 ][ i ] );
			differing += diff.length + Math.abs( readings[ 0 ].length - readings[ 1 ].length );
			total += readings[ 0 ].length;
			console.log( `[${ engine }] determinism: ${ readings[ 0 ].length } stops measured twice, ${ diff.length } differ` );
			diff.slice( 0, 5 ).forEach( ( d ) => console.log( `  DIFF ${ d }` ) );
		} finally {
			await browser.close();
		}
	}
	console.log( `determinism: ${ differing === 0 ? 'identical' : 'DIFFERS' } (${ total } stops)` );
	return differing === 0;
}

async function runLive( opts ) {
	const browser = await ENGINES[ opts.engines[ 0 ] ].launch();
	try {
		const scratch = await newScratch( browser );
		const pages = await runSite( browser, opts, scratch );
		const mode = { forcedColors: opts.forcedColors, reducedMotion: opts.reducedMotion };
		console.log( '' );
		for ( const p of pages ) {
			for ( const w of p.widths ) {
				const s = w.summary;
				if ( w.capHit ) console.log( `STOP CAP HIT ${ p.page } @${ w.width }: ${ s.stops } stops measured, more focusable elements follow (raise --max-stops)` );
				console.log( `${ p.page } @${ w.width }: ${ s.stops } stops (${ w.ended }), looks ${ s.looks }, min contrast ${ fmt( s.minContrast ) }, clipped ${ s.clipped }, radius changed ${ s.radiusChanged }, css ${ w.css.total } B${ w.notes.length ? `, ${ w.notes.join( ', ' ) }` : '' }` );
			}
			if ( p.axe ) console.log( `${ p.page } axe: ${ p.axe.error || p.axe.violations.map( ( v ) => `${ v.id }x${ v.nodes }` ).join( ' ' ) || 'no violations' }` );
		}
		// "One look" holds across pages: compare every page's stops together at each width.
		const perWidth = opts.widths.map( ( width ) => summarise( pages.flatMap( ( p ) => p.widths.filter( ( w ) => w.width === width ).flatMap( ( w ) => w.stops ) ), mode ) );
		const capFails = pages.flatMap( ( p ) => p.widths.filter( ( w ) => w.capHit ).map( ( w ) => `STOP CAP HIT on ${ p.page } @${ w.width }` ) );
		const h = headline( perWidth, capFails );
		const cssBytes = Object.fromEntries( pages.map( ( p ) => [ p.page, p.widths[ 0 ].css.total ] ) );
		console.log( '' );
		printHeadline( h, '' );
		console.log( `css bytes per page (first width): ${ JSON.stringify( cssBytes ) }` );
		h.fails.slice( 0, 15 ).forEach( ( f ) => console.log( `  FAIL ${ f }` ) );
		if ( h.fails.length > 15 ) console.log( `  ... ${ h.fails.length - 15 } more (all in the JSON)` );
		console.log( `\nfocus system (${ opts.site }): ${ h.fails.length ? 'FAIL' : 'PASS' }` );
		return { failed: h.fails.length > 0, headline: h, pages, cssBytes };
	} finally {
		await browser.close();
	}
}

async function main() {
	let opts;
	try {
		opts = parseArgs( process.argv.slice( 2 ) );
	} catch ( e ) {
		console.error( `${ e.message }\nUsage: probe-focus-system.mjs (--local | --negative-control | --site <target> --pages a,b) [flags]; see the file header.` );
		process.exit( 2 );
	}
	if ( opts.help ) {
		console.log( fs.readFileSync( fileURLToPath( import.meta.url ), 'utf8' ).split( '*/' )[ 0 ] );
		return 0;
	}
	const cssFile = path.resolve( opts.css || DEFAULT_CSS );
	if ( opts.selfTest ) {
		let failures = selfTest();
		const browser = await ENGINES[ opts.engines[ 0 ] ].launch();
		try {
			failures += await browserSelfTest( browser, readCss( cssFile ) );
		} finally {
			await browser.close();
		}
		console.log( failures ? `self-test: ${ failures } failing` : 'self-test: all passed' );
		return failures ? 1 : 0;
	}
	if ( opts.determinism ) {
		opts.settle = Math.min( opts.settle, 120 );
		return ( await runDeterminism( opts, cssFile ) ) ? 0 : 1;
	}
	let result;
	if ( opts.negativeControl ) {
		opts.settle = Math.min( opts.settle, 120 );
		const run = await runLocal( opts, 'bad', 'negative control (bad CSS)' );
		console.log( run.failed ? 'negative control: the probe rejected the bad CSS, as it must (exit 0)' : 'negative control: the probe PASSED a bad CSS, the probe is broken (exit 1)' );
		return run.failed ? 0 : 1;
	}
	if ( opts.local ) {
		opts.settle = Math.min( opts.settle, 120 );
		result = await runLocal( opts, cssFile, `focus system (local, css ${ cssFile })` );
	} else {
		result = await runLive( opts );
	}
	if ( opts.json ) {
		fs.mkdirSync( path.dirname( path.resolve( opts.json ) ), { recursive: true } );
		fs.writeFileSync( opts.json, JSON.stringify( { when: new Date().toISOString(), host: os.hostname(), options: opts, ...result }, null, '\t' ) + '\n' );
		console.log( `json: ${ opts.json }` );
	}
	return result.failed ? 1 : 0;
}

main().then( ( code ) => process.exit( code ), ( e ) => {
	console.error( e.stack || e.message );
	process.exit( 2 );
} );
