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
 *
 * Per stop: outline-*, box-shadow and border-radius at rest and on focus; the clip test; and a pixel check (an
 * unfocused and a focused screenshot of the element's box grown by 8px; at up to 16 points the ring and the inner band
 * are compared with the unfocused pixel 1px outside the ring; a stop passes at min over points of max(contrast(ring),
 * contrast(inner)) >= 3). Prints `looks`, `min contrast` and `clipped` and exits 1 when the acceptance fails
 * (looks > 1 apart from inset and signature stops, min contrast < 3, a clipped non-inset stop, radius changing on
 * focus, or fewer fixture controls reached than exist), 2 on a usage or environment error, else 0.
 *
 * Flags: --css <path> (default theme/sgs-theme/assets/css/focus.css) --forced-colors --reduced-motion --axe
 * --shots <dir> --json <file> --widths a,b --open-drawer --open-mega --max-stops N --settle ms --pause ms --self-test
 *
 * Fixture coverage (page 5389, about 100 stops): light, dark and photo sections each carry SGS buttons, a multi-button, links,
 * form controls, option picker, accordion, tabs and a slider; the light section also carries `sgs-focus--inset`,
 * `sgs-focus--signature` and `sgs-focus--duotone` buttons and a before-after range input. Known gaps: no
 * `sgs-focus-source` + `sgs-focus-proxy` pair (no SGS block renders one until the proxy tasks land), and no dual-thumb price
 * slider (no SGS block renders it; WooCommerce's own filter markup does, so /shop/ covers it).
 *
 * Token check: each stop's computed outline-color must equal the resolved --sgs-focus-ring (--sgs-focus-ink for a signature
 * stop or a duotone or photo ground) and its box-shadow must carry a solid hairline in the resolved --sgs-focus-inner, else
 * `token-mismatch`. A page with no --sgs-focus-* properties prints `tokens not defined` and judges nothing.
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
	console.log( `${ label }radius changed on focus: ${ h.radiusChanged }` );
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
	if ( opts.selfTest ) return selfTest() ? 1 : 0;
	const cssFile = path.resolve( opts.css || DEFAULT_CSS );
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
