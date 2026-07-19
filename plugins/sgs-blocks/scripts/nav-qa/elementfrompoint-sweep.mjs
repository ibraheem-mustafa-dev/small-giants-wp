/**
 * elementfrompoint-sweep.mjs — the Spec 36 §8 / FR-36-16 `elementFromPoint`
 * occlusion sweep, carried verbatim from Spec 34 FR-S9-5 / FR-34-7 (D101).
 *
 * METHODOLOGY (Spec 36 §8, quoted for anyone reading this file cold)
 * --------------------------------------------------------------------
 * With the drawer OPEN, at 375 + 768 + 1440: `document.elementFromPoint()`
 * at each probe returns the expected top-layer node —
 *   - the header row's probe returns the toggle/close control (not BODY
 *     or the scrim);
 *   - every drawer link probed at its own centre returns itself;
 *   - everything below the header is unreachable (a probe over a hero
 *     link returns the scrim / `inert` layer, never the underlying link).
 * PASS = every probe returns its expected node. Baseline: 10/10 Mama's,
 * 18/18 Indus.
 *
 * Geometry check (also Spec 36 §8): a partial drawer's
 * `getBoundingClientRect().top` === header bottom ±1px at all three
 * widths. Run separately with --geometry (see below) — it needs a real
 * desktop width with a classic scrollbar (D340 bounce test) which device
 * emulation cannot reproduce, so this script flags that limitation rather
 * than pretending to cover it.
 *
 * WHY PARAMETERISED PROBES (the blocks don't exist yet)
 * -------------------------------------------------------
 * This script is written in Wave-0, before `sgs/nav-menu` / `sgs/nav-drawer`
 * exist, so it cannot hardcode selectors. Probes are supplied as a JSON
 * file (see probes.example.json in this directory for the exact shape).
 *
 * PROBES JSON SHAPE
 * ------------------
 * Either a flat config (applied at every requested viewport) or a
 * per-viewport keyed config (different probe sets per breakpoint, since
 * desktop mega vs mobile drawer geometry differ):
 *
 *   Flat:
 *   {
 *     "openSelector": ".sgs-nav-menu__toggle",
 *     "probes": [ { ... }, { ... } ]
 *   }
 *
 *   Per-viewport:
 *   {
 *     "375":  { "openSelector": "...", "probes": [ ... ] },
 *     "768":  { "openSelector": "...", "probes": [ ... ] },
 *     "1440": { "openSelector": "...", "probes": [ ... ] }
 *   }
 *
 * Each probe is one of two kinds:
 *
 *   1. Point probe — a fixed spot in the viewport, expects a specific node:
 *      {
 *        "name": "header-row-toggle",
 *        "kind": "point",
 *        "xRatio": 0.95, "yRatio": 0.05,   // 0..1 of viewport width/height
 *        "expectSelector": ".sgs-nav-drawer__toggle"
 *      }
 *
 *   2. Self probe — probes the CENTRE of a selector's own bounding box,
 *      expects elementFromPoint to land on that same element (or a
 *      descendant of it — closest() is used so an icon/span inside the
 *      link still counts as "the link"):
 *      {
 *        "name": "drawer-link-1",
 *        "kind": "self",
 *        "selector": ".sgs-nav-drawer__link:nth-child(1)"
 *      }
 *
 * Both kinds accept an optional "expectSelector" override; "self" probes
 * default expectSelector to their own "selector".
 *
 * Usage
 * -----
 *   node elementfrompoint-sweep.mjs <url> --probes <probes.json> --open-target <drawer|mega> [--viewports 375,768,1440] [--json]
 *
 * --open-target is documentation-only (drawer vs mega) — it's printed in
 * the report so a human reading the output knows what was swept; the
 * actual open trigger comes from the probes JSON's "openSelector".
 *
 * Exit codes
 * ----------
 *   0 — every probe at every requested viewport passed
 *   1 — one or more probes failed (see printed report, "N/M" summary line)
 *   2 — bad/missing arguments, navigation failure, or an unreadable probes file
 *
 * Spec 36 coverage: FR-36-16 elementFromPoint occlusion sweep (baseline 10/10 Mama's, 18/18 Indus).
 */
'use strict';

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function parseArgs( argv ) {
	const args = { url: null, probesPath: null, viewports: [ 375, 768, 1440 ], openTarget: null, json: false };
	const rest = [ ...argv ];
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--probes' ) args.probesPath = rest.shift();
		else if ( flag === '--viewports' ) {
			args.viewports = rest.shift().split( ',' ).map( ( v ) => parseInt( v.trim(), 10 ) );
		} else if ( flag === '--open-target' ) args.openTarget = rest.shift();
		else if ( flag === '--json' ) args.json = true;
		else {
			process.stderr.write( `elementfrompoint-sweep: unrecognised argument "${ flag }"\n` );
			process.exit( 2 );
		}
	}
	return args;
}

function usageAndExit( message ) {
	process.stderr.write(
		`elementfrompoint-sweep: ${ message }\n\n` +
		'Usage: node elementfrompoint-sweep.mjs <url> --probes <probes.json> [--open-target <drawer|mega>] [--viewports 375,768,1440] [--json]\n' +
		'See probes.example.json in this directory for the probes-file shape.\n'
	);
	process.exit( 2 );
}

function loadProbesConfig( probesPath, viewports ) {
	if ( ! existsSync( probesPath ) ) {
		usageAndExit( `--probes file not found: ${ probesPath }` );
	}
	let raw;
	try {
		raw = JSON.parse( readFileSync( probesPath, 'utf8' ) );
	} catch ( e ) {
		usageAndExit( `--probes file is not valid JSON: ${ e.message }` );
	}

	// Per-viewport shape: every requested viewport width appears as a
	// top-level numeric key.
	const isPerViewport = viewports.every( ( vp ) => Object.prototype.hasOwnProperty.call( raw, String( vp ) ) );
	const perViewport = {};
	for ( const vp of viewports ) {
		const cfg = isPerViewport ? raw[ String( vp ) ] : raw;
		if ( ! cfg || ! Array.isArray( cfg.probes ) ) {
			usageAndExit( `--probes config for viewport ${ vp } is missing a "probes" array.` );
		}
		perViewport[ vp ] = cfg;
	}
	return perViewport;
}

// Runs in the page. Given the probe list, returns pass/fail + expected vs
// actual node description per probe.
const SWEEP = ( probes ) => {
	function describe( el ) {
		if ( ! el ) return null;
		if ( el === document.body ) return 'BODY';
		if ( el === document.documentElement ) return 'HTML';
		const tag = el.tagName ? el.tagName.toLowerCase() : '?';
		const id = el.id ? `#${ el.id }` : '';
		const cls = el.className && typeof el.className === 'string'
			? '.' + el.className.trim().split( /\s+/ ).slice( 0, 3 ).join( '.' )
			: '';
		return `${ tag }${ id }${ cls }`;
	}

	const results = [];
	for ( const probe of probes ) {
		let x;
		let y;
		let expectSelector = probe.expectSelector || null;

		if ( probe.kind === 'point' ) {
			x = Math.round( window.innerWidth * probe.xRatio );
			y = Math.round( window.innerHeight * probe.yRatio );
		} else if ( probe.kind === 'self' ) {
			const el = document.querySelector( probe.selector );
			if ( ! el ) {
				results.push( { name: probe.name, kind: probe.kind, pass: false, reason: `selector "${ probe.selector }" matched no element` } );
				continue;
			}
			const rect = el.getBoundingClientRect();
			x = Math.round( rect.left + rect.width / 2 );
			y = Math.round( rect.top + rect.height / 2 );
			expectSelector = expectSelector || probe.selector;
		} else {
			results.push( { name: probe.name, kind: probe.kind, pass: false, reason: `unknown probe kind "${ probe.kind }"` } );
			continue;
		}

		const hit = document.elementFromPoint( x, y );
		const expectEl = expectSelector ? document.querySelector( expectSelector ) : null;
		const pass = !! ( hit && expectEl && ( hit === expectEl || expectEl.contains( hit ) || ( hit.closest && hit.closest( expectSelector ) === expectEl ) ) );

		results.push( {
			name: probe.name,
			kind: probe.kind,
			x, y,
			expectSelector,
			expectFound: !! expectEl,
			actual: describe( hit ),
			expectDescribed: describe( expectEl ),
			pass,
		} );
	}
	return results;
};

async function sweepViewport( browser, url, vpWidth, cfg ) {
	const page = await browser.newPage( { viewport: { width: vpWidth, height: 1200 } } );
	try {
		await page.goto( url, { waitUntil: 'networkidle', timeout: 30000 } );
	} catch ( e ) {
		await page.close();
		throw new Error( `navigation to "${ url }" failed at viewport ${ vpWidth }: ${ e.message }` );
	}

	if ( cfg.openSelector ) {
		const trigger = page.locator( cfg.openSelector );
		const count = await trigger.count();
		if ( count === 0 ) {
			await page.close();
			throw new Error( `openSelector "${ cfg.openSelector }" matched 0 elements at viewport ${ vpWidth }` );
		}
		await trigger.first().click();
		await page.waitForTimeout( 350 );
	}

	const results = await page.evaluate( SWEEP, cfg.probes );
	await page.close();
	return results;
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args.url ) usageAndExit( 'missing required <url> argument.' );
	if ( ! args.probesPath ) usageAndExit( 'missing required --probes <path> argument.' );
	if ( args.viewports.some( ( v ) => ! Number.isFinite( v ) || v <= 0 ) ) {
		usageAndExit( '--viewports must be a comma-separated list of positive numbers, e.g. 375,768,1440.' );
	}

	const perViewport = loadProbesConfig( path.resolve( args.probesPath ), args.viewports );

	const browser = await chromium.launch( { headless: true } );
	let totalPass = 0;
	let totalCount = 0;
	const byViewport = {};

	try {
		for ( const vp of args.viewports ) {
			let results;
			try {
				results = await sweepViewport( browser, args.url, vp, perViewport[ vp ] );
			} catch ( e ) {
				process.stderr.write( `elementfrompoint-sweep: ${ e.message }\n` );
				process.exit( 2 );
			}
			byViewport[ vp ] = results;
			totalCount += results.length;
			totalPass += results.filter( ( r ) => r.pass ).length;
		}
	} finally {
		await browser.close();
	}

	if ( args.json ) {
		process.stdout.write( JSON.stringify( { url: args.url, openTarget: args.openTarget, byViewport, summary: `${ totalPass }/${ totalCount }` }, null, 2 ) + '\n' );
	} else {
		process.stdout.write( `elementfrompoint-sweep: ${ args.url }${ args.openTarget ? ` (${ args.openTarget })` : '' }\n\n` );
		for ( const vp of args.viewports ) {
			const results = byViewport[ vp ];
			const pass = results.filter( ( r ) => r.pass ).length;
			process.stdout.write( `  viewport ${ vp }px — ${ pass }/${ results.length }\n` );
			for ( const r of results ) {
				const mark = r.pass ? 'PASS' : 'FAIL';
				process.stdout.write( `    [${ mark }] ${ r.name } (${ r.kind })\n` );
				if ( ! r.pass ) {
					if ( r.reason ) {
						process.stdout.write( `      reason: ${ r.reason }\n` );
					} else {
						process.stdout.write( `      expected: ${ r.expectDescribed || `(no element matched "${ r.expectSelector }")` }\n` );
						process.stdout.write( `      actual:   ${ r.actual }\n` );
					}
				}
			}
		}
		process.stdout.write( `\nelementfrompoint-sweep: TOTAL ${ totalPass }/${ totalCount }${ totalPass === totalCount ? ' — PASS' : ' — FAIL' }\n` );
	}

	process.exit( totalPass === totalCount ? 0 : 1 );
}

main().catch( ( e ) => {
	process.stderr.write( `elementfrompoint-sweep: unexpected failure — ${ e.stack || e.message }\n` );
	process.exit( 2 );
} );
