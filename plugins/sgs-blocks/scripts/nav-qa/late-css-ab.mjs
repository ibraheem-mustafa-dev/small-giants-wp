/**
 * late-css-ab.mjs — the Spec 36 FR-36-16 late-CSS A/B.
 *
 * WHAT IT ASSERTS
 * ----------------
 * The open drawer's GEOMETRY comes from the block's own scoped inline `<style>`,
 * not from an external stylesheet that may arrive late or be optimised away.
 * At 375 / 768 / 1440, with the drawer OPEN in both runs:
 *
 *   A — the page loaded normally.
 *   B — every external stylesheet request aborted (resourceType 'stylesheet',
 *       which covers `<link rel=stylesheet>` loads) except the collected block CSS
 *       under /uploads/sgs-css/, which is the blocks' own scoped styles. Inline `<style>` survives.
 *
 * Measured in both runs: getBoundingClientRect() of the open drawer dialog,
 * its close control and its first link. PASS = every edge (left, top, right,
 * bottom) matches between A and B within 1px, AND in run B Escape closes the
 * drawer and focus returns to the opener.
 *
 * Colour, typography and token differences between A and B are EXPECTED and are
 * not measured. Geometry and dismissibility only.
 *
 * Usage
 * -----
 *   node late-css-ab.mjs --url <page-url> [--open <selector>] [--dialog <selector>]
 *                        [--close <selector>] [--link <selector>]
 *                        [--widths 375,768,1440] [--height <px>] [--tolerance <px>]
 *                        [--open-via click|keyboard] [--headed] [--json]
 *
 * Defaults: --open ".sgs-nav-bar-menu__burger", --dialog "dialog.sgs-nav-drawer",
 * --close ".sgs-nav-drawer__close", --link "a[href]" (first link inside the dialog
 * that is not the close control).
 *
 * A width at which the opener is not visible in a run has no open state: it is
 * UNMEASURED (reported, never a pass). If nothing at all was measured the run
 * exits 3.
 *
 * Exit codes
 * ----------
 *   0 — every measured rect within tolerance and Escape dismissal passed
 *   1 — a rect differs by more than the tolerance, or dismissal failed
 *   2 — bad arguments or navigation failure
 *   3 — VACUOUS: no width could be measured in both runs
 *
 * Spec 36 coverage: FR-36-16 "the late-CSS A/B". Needs no credentials (public page).
 */
'use strict';

import { chromium } from 'playwright';
import { EXIT, OpenError, openSurface } from './lib/openness-guard.mjs';

const TAG = 'late-css-ab';

function parseArgs( argv ) {
	const args = {
		url: null,
		open: '.sgs-nav-bar-menu__burger',
		dialog: 'dialog.sgs-nav-drawer',
		close: '.sgs-nav-drawer__close',
		link: 'a[href]',
		widths: [ 375, 768, 1440 ],
		height: 900,
		tolerance: 1,
		openVia: 'click',
		headed: false,
		json: false,
	};
	const rest = [ ...argv ];
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--url' ) args.url = rest.shift();
		else if ( flag === '--open' ) args.open = rest.shift();
		else if ( flag === '--dialog' ) args.dialog = rest.shift();
		else if ( flag === '--close' ) args.close = rest.shift();
		else if ( flag === '--link' ) args.link = rest.shift();
		else if ( flag === '--widths' ) args.widths = String( rest.shift() ).split( ',' ).map( ( w ) => parseInt( w, 10 ) );
		else if ( flag === '--height' ) args.height = parseInt( rest.shift(), 10 );
		else if ( flag === '--tolerance' ) args.tolerance = parseFloat( rest.shift() );
		else if ( flag === '--open-via' ) args.openVia = rest.shift();
		else if ( flag === '--headed' ) args.headed = true;
		else if ( flag === '--json' ) args.json = true;
		else usage( `unrecognised argument "${ flag }".` );
	}
	if ( ! args.url ) usage( 'missing required --url.' );
	if ( args.widths.some( ( w ) => ! Number.isFinite( w ) || w <= 0 ) ) usage( '--widths must be positive numbers.' );
	if ( ! Number.isFinite( args.height ) || ! Number.isFinite( args.tolerance ) ) usage( '--height and --tolerance must be numbers.' );
	if ( ! [ 'click', 'keyboard' ].includes( args.openVia ) ) usage( '--open-via must be "click" or "keyboard".' );
	return args;
}

function usage( message ) {
	process.stderr.write(
		`${ TAG }: ${ message }\n\n` +
		'Usage: node late-css-ab.mjs --url <page-url> [--open <selector>] [--dialog <selector>] [--close <selector>] ' +
		'[--link <selector>] [--widths 375,768,1440] [--height <px>] [--tolerance <px>] [--open-via click|keyboard] [--headed] [--json]\n'
	);
	process.exit( EXIT.USAGE );
}

/** Rect of the first matching element (or null) as left/top/right/bottom. */
async function rectOf( page, selector, excludeSelector = null ) {
	return page.evaluate( ( { sel, exclude } ) => {
		const nodes = Array.from( document.querySelectorAll( sel ) )
			.filter( ( el ) => ! ( exclude && el.matches( exclude ) ) );
		const el = nodes[ 0 ];
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		const f = ( n ) => Math.round( n * 100 ) / 100;
		return { left: f( r.left ), top: f( r.top ), right: f( r.right ), bottom: f( r.bottom ) };
	}, { sel: selector, exclude: excludeSelector } );
}

/**
 * One run at one width.
 * status: 'measured' | 'unmeasured' (opener not visible) | 'error'.
 */
async function runOnce( browser, args, width, blockCss ) {
	const context = await browser.newContext( { viewport: { width, height: args.height } } );
	const page = await context.newPage();
	let blocked = 0;
	if ( blockCss ) {
		await page.route( '**/*', ( route ) => {
			// The collected block CSS (`/uploads/sgs-css/`, `sgs_css_output_mode` = file) is the
			// blocks' own scoped `<style>` rules delivered as one render-blocking head link,
			// the same content as the inline form (mode = head), so it is not a late external sheet.
			if ( route.request().resourceType() === 'stylesheet' && ! route.request().url().includes( '/uploads/sgs-css/' ) ) {
				blocked++;
				return route.abort();
			}
			return route.continue();
		} );
	}
	try {
		try {
			await page.goto( args.url, { waitUntil: 'load', timeout: 45000 } );
			await page.waitForTimeout( 800 );
		} catch ( e ) {
			return { status: 'error', reason: `navigation failed — ${ e.message.split( '\n' )[ 0 ] }` };
		}
		try {
			await openSurface( page, { open: args.open, openVia: args.openVia } );
		} catch ( e ) {
			if ( e instanceof OpenError && e.kind === 'not-visible' ) {
				return { status: 'unmeasured', reason: 'opener not visible at this width', blocked };
			}
			return { status: 'error', reason: e.message, blocked };
		}
		const isOpen = await page.evaluate(
			( sel ) => {
				const d = document.querySelector( sel );
				return !! d && d.open === true;
			},
			args.dialog
		);
		if ( ! isOpen ) {
			return { status: 'error', reason: `dialog "${ args.dialog }" is not open after the opener was activated`, blocked };
		}
		const rects = {
			dialog: await rectOf( page, args.dialog ),
			close: await rectOf( page, `${ args.dialog } ${ args.close }` ),
			link: await rectOf( page, `${ args.dialog } ${ args.link }`, args.close ),
		};
		const result = { status: 'measured', rects, blocked };
		if ( blockCss ) {
			await page.keyboard.press( 'Escape' );
			await page.waitForTimeout( 500 );
			result.escape = await page.evaluate(
				( { dlg, opener } ) => {
					const d = document.querySelector( dlg );
					const o = document.querySelector( opener );
					return { closed: ! d || ! d.open, focusOnOpener: !! o && document.activeElement === o };
				},
				{ dlg: args.dialog, opener: args.open }
			);
		}
		return result;
	} finally {
		await context.close();
	}
}

/** Largest edge delta between two rects, or null when either is missing. */
function maxDelta( a, b ) {
	if ( ! a || ! b ) return null;
	return Math.max( ...[ 'left', 'top', 'right', 'bottom' ].map( ( k ) => Math.abs( a[ k ] - b[ k ] ) ) );
}

const fmt = ( r ) => ( r ? `${ r.left },${ r.top },${ r.right },${ r.bottom }` : 'absent' );

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	const browser = await chromium.launch( { headless: ! args.headed, args: [ '--hide-scrollbars' ] } );
	const rows = [];
	const widthsOut = [];
	let failures = 0;
	let measuredWidths = 0;

	try {
		for ( const width of args.widths ) {
			const a = await runOnce( browser, args, width, false );
			const b = await runOnce( browser, args, width, true );
			const entry = { width, a: a.status, b: b.status };

			if ( a.status === 'error' || b.status === 'error' ) {
				entry.verdict = 'ERROR';
				entry.reason = `A: ${ a.reason || a.status }; B: ${ b.reason || b.status }`;
				failures++;
			} else if ( a.status === 'unmeasured' || b.status === 'unmeasured' ) {
				entry.verdict = 'UNMEASURED';
				entry.reason = `A: ${ a.reason || a.status }; B: ${ b.reason || b.status }`;
			} else {
				measuredWidths++;
				entry.blockedRequests = b.blocked;
				for ( const name of [ 'dialog', 'close', 'link' ] ) {
					const delta = maxDelta( a.rects[ name ], b.rects[ name ] );
					const ok = delta !== null && delta <= args.tolerance;
					if ( ! ok ) failures++;
					rows.push( { width, element: name, a: fmt( a.rects[ name ] ), b: fmt( b.rects[ name ] ), delta, ok } );
				}
				entry.escape = b.escape;
				const dismissed = !! ( b.escape && b.escape.closed && b.escape.focusOnOpener );
				if ( ! dismissed ) failures++;
				entry.verdict = 'MEASURED';
				rows.push( {
					width,
					element: 'escape (B)',
					a: '',
					b: `closed=${ b.escape.closed } focusOnOpener=${ b.escape.focusOnOpener }`,
					delta: null,
					ok: dismissed,
				} );
			}
			widthsOut.push( entry );
		}
	} finally {
		await browser.close();
	}

	if ( args.json ) {
		process.stdout.write( JSON.stringify( { url: args.url, tolerance: args.tolerance, widths: widthsOut, rows, failures }, null, 2 ) + '\n' );
	} else {
		process.stdout.write( `${ TAG }: ${ args.url } (tolerance ${ args.tolerance }px; rects are left,top,right,bottom)\n\n` );
		for ( const r of rows ) {
			process.stdout.write(
				`${ r.ok ? 'PASS' : 'FAIL' }  ${ String( r.width ).padStart( 4 ) }  ${ r.element.padEnd( 10 ) }  ` +
				`A[${ r.a }]  B[${ r.b }]` + ( r.delta !== null ? `  maxDelta=${ r.delta }px` : '' ) + '\n'
			);
		}
		for ( const w of widthsOut.filter( ( x ) => x.verdict !== 'MEASURED' ) ) {
			process.stdout.write( `${ w.verdict === 'ERROR' ? 'FAIL' : 'SKIP' }  ${ String( w.width ).padStart( 4 ) }  ${ w.verdict }: ${ w.reason }\n` );
		}
	}

	if ( failures > 0 ) {
		process.stderr.write( `${ TAG }: FAIL — ${ failures } check(s) outside tolerance, not dismissible, or errored.\n` );
		process.exit( EXIT.FAILURES );
	}
	if ( measuredWidths === 0 ) {
		process.stderr.write( `${ TAG }: VACUOUS — no width was measured in both runs, so nothing is proven.\n` );
		process.exit( EXIT.VACUOUS );
	}
	process.stdout.write( `\n${ TAG }: PASS — ${ measuredWidths } width(s) measured; geometry within ${ args.tolerance }px and dismissal OK.\n` );
	process.exit( EXIT.OK );
}

main().catch( ( e ) => {
	process.stderr.write( `${ TAG }: ${ e.stack || e.message }\n` );
	process.exit( EXIT.USAGE );
} );
