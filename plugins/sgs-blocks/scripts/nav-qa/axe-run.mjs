/**
 * axe-run.mjs — Playwright + axe-core accessibility gate for the SGS nav
 * blocks (Spec 36 §8 / FR-36-16: "axe = 0 on the OPEN drawer AND an OPEN
 * desktop mega").
 *
 * WHY THIS SHAPE
 * ---------------
 * FR-36-16 does not want a whole-page axe pass — it wants the drawer /
 * mega SCOPED to itself, and only AFTER it has been opened (a closed
 * `<dialog>`/disclosure has no violations to find, which would be a false
 * pass). So this script: navigates, optionally clicks an "open" trigger,
 * injects axe-core, and scopes the run to a container selector.
 *
 * axe-core is loaded from the LOCAL node_modules copy (already present —
 * verified 2026-07-19, `axe-core@^4.10.3`, transitively installed) rather
 * than a CDN, so the gate works offline/behind a firewall and is version-
 * pinned to what's on disk. `package.json` gets an explicit devDependency
 * added (see this repo's package.json) so it stops being an accident of
 * a transitive install.
 *
 * Usage
 * -----
 *   node axe-run.mjs <url> [--open <selector>] [--scope <selector>] [--viewport <width>] [--json]
 *
 * Examples
 * --------
 *   # Whole-page pass, no interaction
 *   node axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/
 *
 *   # Open the drawer, then scope the axe run to the drawer only
 *   node axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/ \
 *     --open ".sgs-nav-menu__toggle" --scope ".sgs-nav-drawer"
 *
 *   # Open a desktop mega, scope to the mega panel, force a 1440 viewport
 *   node axe-run.mjs https://palestine-lives.org/ \
 *     --open ".sgs-nav-menu__item--has-mega .sgs-nav-menu__link" \
 *     --scope ".sgs-nav-menu__mega-panel" --viewport 1440
 *
 * Exit codes
 * ----------
 *   0 — zero violations in the scoped run
 *   1 — one or more violations found (see printed report)
 *   2 — bad/missing arguments, navigation failure, or axe-core injection failure
 *
 * Spec 36 coverage: FR-36-16 "axe = 0 on the OPEN drawer AND an OPEN desktop mega".
 */
'use strict';

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// Local axe-core build. Falls back to the CDN only if the local copy is
// somehow missing (kept as a last resort — loud console note either way,
// never a silent fallback).
const LOCAL_AXE_PATH = path.resolve( __dirname, '../../node_modules/axe-core/axe.min.js' );
const CDN_AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';

function parseArgs( argv ) {
	const args = { url: null, open: null, scope: null, viewport: 1440, json: false };
	const rest = [ ...argv ];
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--open' ) args.open = rest.shift();
		else if ( flag === '--scope' ) args.scope = rest.shift();
		else if ( flag === '--viewport' ) args.viewport = parseInt( rest.shift(), 10 );
		else if ( flag === '--json' ) args.json = true;
		else {
			process.stderr.write( `axe-run: unrecognised argument "${ flag }"\n` );
			process.exit( 2 );
		}
	}
	return args;
}

function usageAndExit( message ) {
	process.stderr.write(
		`axe-run: ${ message }\n\n` +
		'Usage: node axe-run.mjs <url> [--open <selector>] [--scope <selector>] [--viewport <width>] [--json]\n'
	);
	process.exit( 2 );
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args.url ) usageAndExit( 'missing required <url> argument.' );
	if ( ! Number.isFinite( args.viewport ) || args.viewport <= 0 ) {
		usageAndExit( `--viewport must be a positive number, got "${ process.argv.includes( '--viewport' ) }".` );
	}

	const browser = await chromium.launch( { headless: true } );
	let exitCode = 0;

	try {
		const page = await browser.newPage( { viewport: { width: args.viewport, height: 1200 } } );

		try {
			await page.goto( args.url, { waitUntil: 'networkidle', timeout: 30000 } );
		} catch ( e ) {
			process.stderr.write( `axe-run: navigation to "${ args.url }" failed — ${ e.message }\n` );
			process.exit( 2 );
		}

		if ( args.open ) {
			const trigger = page.locator( args.open );
			const count = await trigger.count();
			if ( count === 0 ) {
				process.stderr.write( `axe-run: --open selector "${ args.open }" matched 0 elements on the page.\n` );
				process.exit( 2 );
			}
			await trigger.first().click();
			// Let CSS/JS transitions (dialog animation, aria-expanded toggle) settle.
			await page.waitForTimeout( 350 );
		}

		if ( args.scope ) {
			const scopeEl = page.locator( args.scope );
			const count = await scopeEl.count();
			if ( count === 0 ) {
				process.stderr.write(
					`axe-run: --scope selector "${ args.scope }" matched 0 elements after the open step. ` +
					'Either the trigger did not open it, or the selector is wrong.\n'
				);
				process.exit( 2 );
			}
		}

		// Inject axe-core.
		if ( existsSync( LOCAL_AXE_PATH ) ) {
			await page.addScriptTag( { content: readFileSync( LOCAL_AXE_PATH, 'utf8' ) } );
		} else {
			process.stderr.write(
				`axe-run: local axe-core not found at ${ LOCAL_AXE_PATH } — falling back to CDN (${ CDN_AXE_URL }). ` +
				'Run `npm install` in plugins/sgs-blocks to fix this.\n'
			);
			try {
				await page.addScriptTag( { url: CDN_AXE_URL } );
			} catch ( e ) {
				process.stderr.write( `axe-run: CDN fallback also failed — ${ e.message }\n` );
				process.exit( 2 );
			}
		}

		const results = await page.evaluate( async ( scopeSelector ) => {
			const context = scopeSelector ? document.querySelector( scopeSelector ) : document;
			// eslint-disable-next-line no-undef
			return await axe.run( context, {
				resultTypes: [ 'violations' ],
			} );
		}, args.scope );

		const violations = results.violations || [];

		if ( args.json ) {
			process.stdout.write( JSON.stringify( { url: args.url, scope: args.scope, open: args.open, viewport: args.viewport, violations }, null, 2 ) + '\n' );
		} else {
			process.stdout.write( `axe-run: ${ args.url } (viewport ${ args.viewport }px)${ args.open ? `, opened "${ args.open }"` : '' }${ args.scope ? `, scoped to "${ args.scope }"` : ' (whole page)' }\n` );
			if ( violations.length === 0 ) {
				process.stdout.write( 'axe-run: 0 violations.\n' );
			} else {
				process.stdout.write( `axe-run: ${ violations.length } violation type(s):\n\n` );
				for ( const v of violations ) {
					process.stdout.write( `  [${ v.impact || 'unknown' }] ${ v.id } — ${ v.help }\n` );
					process.stdout.write( `    ${ v.helpUrl }\n` );
					for ( const node of v.nodes ) {
						process.stdout.write( `    - ${ node.target.join( ' ' ) }\n` );
						if ( node.failureSummary ) {
							process.stdout.write( `      ${ node.failureSummary.replace( /\n/g, '\n      ' ) }\n` );
						}
					}
					process.stdout.write( '\n' );
				}
			}
		}

		exitCode = violations.length > 0 ? 1 : 0;
	} finally {
		await browser.close();
	}

	process.exit( exitCode );
}

main().catch( ( e ) => {
	process.stderr.write( `axe-run: unexpected failure — ${ e.stack || e.message }\n` );
	process.exit( 2 );
} );
