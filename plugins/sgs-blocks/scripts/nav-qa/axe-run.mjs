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
 * OPENNESS GUARD (added 2026-07-29 — STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY)
 * ------------------------------------------------------------------------------------------------
 * The paragraph above was ASPIRATIONAL, not implemented: the script clicked
 * the trigger and then only checked the scope selector MATCHED an element.
 * A `<dialog>` is in the DOM whether open or closed, and axe's default
 * `excludeHidden` skips hidden subtrees — so a CLOSED drawer returned
 * "0 violations" identically to an open one. Every scoped drawer result from
 * before this guard proves nothing.
 *
 * The guard now measures the scope's ACTUAL rendered state before axe runs:
 * a `<dialog>` must carry the `open` property; any scope must be visible with
 * a non-zero box; and it must contain at least one focusable element (a panel
 * you cannot Tab into is not an open panel). Failing the guard reports
 * **VACUOUS** and exits 3 — never a passing 0.
 *
 * It arms itself whenever the run implies an opened surface (`--open` given,
 * or the scope resolves to a `<dialog>`). `--require-open` arms it for any
 * scope; `--allow-closed` disarms it deliberately and stamps the output
 * `guard: "SKIPPED"` so an unguarded result can never be mistaken for a
 * guarded one.
 *
 * Usage
 * -----
 *   node axe-run.mjs <url> [--open <selector>] [--open-via click|keyboard]
 *                          [--scope <selector>] [--viewport <width>]
 *                          [--require-open] [--allow-closed] [--json]
 *
 * --open-via (added 2026-07-29)
 * ----------------------------
 *   click    (default) — click the trigger, then park the pointer away from the
 *                        opened surface. Correct for a `<dialog>` drawer.
 *   keyboard           — focus the trigger and press Enter; the pointer never
 *                        touches the surface. REQUIRED for the desktop mega,
 *                        which is a hover-bridge component: parking the pointer
 *                        fires its leave-bridge (170ms grace) and closes it, so
 *                        the click path always ended VACUOUS.
 *
 * Examples
 * --------
 *   # Whole-page pass, no interaction
 *   node axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/
 *
 *   # Open the drawer, then scope the axe run to the drawer only (guard auto-arms)
 *   node axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/ \
 *     --open ".sgs-nav-menu__burger" --scope ".sgs-nav-drawer"
 *
 *   # Open a desktop mega (hover-bridge — MUST use the keyboard path), scope to
 *   # the panel in the page content, force a 1440 viewport
 *   node axe-run.mjs https://sandybrown-nightingale-600381.hostingersite.com/gate3-mega-nav/ \
 *     --open ".entry-content .sgs-nav-menu__mega-trigger" --open-via keyboard \
 *     --scope ".entry-content .sgs-nav-menu__mega-panel-wrap" --viewport 1440
 *
 * Exit codes
 * ----------
 *   0 — zero violations in the scoped run (guard passed, or not applicable)
 *   1 — one or more violations found (see printed report)
 *   2 — bad/missing arguments, navigation failure, or axe-core injection failure
 *   3 — VACUOUS: the scoped surface was not genuinely open, so the run proves nothing
 *
 * Spec 36 coverage: FR-36-16 "axe = 0 on the OPEN drawer AND an OPEN desktop mega".
 */
'use strict';

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The openness guard + opener were EXTRACTED to a shared module 2026-07-30
// (DP7). They used to live inline in main() below, which is exactly why three
// other nav-qa scripts never got them. This script's behaviour is unchanged —
// verified by re-running it against the same fixture before and after the move.
import {
	EXIT,
	OpenError,
	openSurface,
	guardScope,
	formatVacuous,
	selfTest,
} from './lib/openness-guard.mjs';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// Local axe-core build. Falls back to the CDN only if the local copy is
// somehow missing (kept as a last resort — loud console note either way,
// never a silent fallback).
const LOCAL_AXE_PATH = path.resolve( __dirname, '../../node_modules/axe-core/axe.min.js' );
const CDN_AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';

function parseArgs( argv ) {
	const args = {
		url: null,
		open: null,
		scope: null,
		viewport: 1440,
		json: false,
		requireOpen: false,
		allowClosed: false,
		openVia: 'click',
	};
	const rest = [ ...argv ];
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--open' ) args.open = rest.shift();
		else if ( flag === '--open-via' ) args.openVia = rest.shift();
		else if ( flag === '--scope' ) args.scope = rest.shift();
		else if ( flag === '--viewport' ) args.viewport = parseInt( rest.shift(), 10 );
		else if ( flag === '--json' ) args.json = true;
		else if ( flag === '--require-open' ) args.requireOpen = true;
		else if ( flag === '--allow-closed' ) args.allowClosed = true;
		else {
			process.stderr.write( `axe-run: unrecognised argument "${ flag }"\n` );
			process.exit( 2 );
		}
	}
	if ( ! [ 'click', 'keyboard' ].includes( args.openVia ) ) {
		process.stderr.write( `axe-run: --open-via must be "click" or "keyboard", got "${ args.openVia }".\n` );
		process.exit( 2 );
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

/**
 * Negative controls for the openness guard — the single most load-bearing check
 * in this script. Before 2026-07-30 its only proof of function was a prose note
 * in README.md recording a manual run, which is not re-runnable and therefore
 * not evidence. Delegates to the shared module so the guard and its proof can
 * never drift apart.
 */
async function runSelfTest() {
	const { ok, results } = await selfTest( { chromium } );
	for ( const r of results ) {
		process.stdout.write(
			`${ r.ok ? 'PASS' : 'FAIL' }  ${ r.name }\n` +
			`      expected ${ r.expected }, got ${ r.actual }${ r.ok ? '' : ` — ${ r.reason }` }\n`
		);
	}
	const failed = results.filter( ( r ) => ! r.ok ).length;
	process.stdout.write(
		`\n${ results.length - failed }/${ results.length } openness-guard self-tests passed.\n` +
		( ok
			? 'The guard can still FAIL when it should — axe results from this script mean something.\n'
			: 'THE GUARD IS BROKEN — an injected violation went undetected. Do not trust any run.\n' )
	);
	process.exit( ok ? EXIT.OK : EXIT.FAILURES );
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) {
		await runSelfTest();
		return;
	}

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
			// Opener (click / keyboard park semantics, sticky-header scroll fix)
			// now lives in lib/openness-guard.mjs — see its docblock for WHY the
			// keyboard path is mandatory on a hover-bridge panel.
			try {
				await openSurface( page, { open: args.open, openVia: args.openVia } );
			} catch ( e ) {
				if ( e instanceof OpenError ) {
					process.stderr.write( `axe-run: ${ e.message }\n` );
					process.exit( EXIT.USAGE );
				}
				throw e;
			}
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

		// --- Openness guard -------------------------------------------------
		// Measurement + judgement now live in lib/openness-guard.mjs (shared with
		// sweep-drawer-variants, shoot-drawer-pairs and elementfrompoint-sweep).
		// Formatting + the exit code stay HERE deliberately — the old inline
		// version printed from inside the guard, which is what made it unreusable.
		const guard = await guardScope( page, {
			scope: args.scope,
			open: args.open,
			requireOpen: args.requireOpen,
			allowClosed: args.allowClosed,
		} );

		if ( guard.status === 'VACUOUS' ) {
			if ( args.json ) {
				process.stdout.write( JSON.stringify( {
					url: args.url, scope: args.scope, open: args.open,
					viewport: args.viewport, guard, violations: null,
				}, null, 2 ) + '\n' );
			} else {
				process.stderr.write( `axe-run: ${ formatVacuous( args.scope, guard ) }` );
			}
			process.exit( EXIT.VACUOUS );
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

		// INCOMPLETE IS REPORTED, NOT DISCARDED (2026-07-30).
		//
		// This used to pass `resultTypes: [ 'violations' ]`, which threw away axe's
		// INCOMPLETE ("needs review") bucket. That is not a cosmetic omission:
		// measured on the canary POC drawers, axe places EVERY text element inside
		// an open `<dialog>` into `incomplete` with "Element's background color
		// could not be determined because it is overlapped by another element" —
		// because a dialog renders in the top layer over a ::backdrop and axe
		// cannot resolve the background stack.
		//
		// So axe's color-contrast rule CANNOT return a violation inside an open
		// drawer, and this script was printing a confident "0 violations" while 8
		// elements — including 3 rendering at 1:1 contrast, i.e. invisible — sat
		// unresolved in a bucket nobody read. A clean 0 that hides 8 unknowns is
		// the same class of falsehood as a vacuous pass.
		const results = await page.evaluate( async ( scopeSelector ) => {
			const context = scopeSelector ? document.querySelector( scopeSelector ) : document;
			// eslint-disable-next-line no-undef
			return await axe.run( context, {} );
		}, args.scope );

		const violations = results.violations || [];
		const incomplete = results.incomplete || [];
		const incompleteNodeCount = incomplete.reduce( ( n, r ) => n + r.nodes.length, 0 );

		if ( args.json ) {
			process.stdout.write( JSON.stringify( { url: args.url, scope: args.scope, open: args.open, viewport: args.viewport, guard, violations, incomplete }, null, 2 ) + '\n' );
		} else {
			process.stdout.write( `axe-run: ${ args.url } (viewport ${ args.viewport }px)${ args.open ? `, opened "${ args.open }"` : '' }${ args.scope ? `, scoped to "${ args.scope }"` : ' (whole page)' }\n` );
			process.stdout.write( `axe-run: openness guard ${ guard.status } — ${ guard.reason }\n` );
			if ( incompleteNodeCount > 0 ) {
				process.stdout.write(
					`axe-run: ⚠ ${ incompleteNodeCount } element(s) axe could NOT decide (${ incomplete.length } rule(s)) — ` +
					'NOT counted as passing:\n'
				);
				for ( const r of incomplete ) {
					process.stdout.write( `  [needs review] ${ r.id } — ${ r.help }\n` );
					for ( const node of r.nodes ) {
						const why = ( node.any?.[ 0 ]?.message || node.all?.[ 0 ]?.message || '' ).split( '\n' )[ 0 ];
						process.stdout.write( `    - ${ node.target.join( ' ' ) }\n` );
						if ( why ) process.stdout.write( `      ${ why }\n` );
					}
				}
				if ( incomplete.some( ( r ) => r.id === 'color-contrast' ) ) {
					process.stdout.write(
						'  NOTE: colour-contrast inside an open <dialog> lands here by construction (top-layer\n' +
						'  ::backdrop defeats axe\'s background resolution). Contrast on a drawer must be measured\n' +
						'  by the per-element sweep in sweep-drawer-variants.mjs, NOT by this axe leg.\n'
					);
				}
				process.stdout.write( '\n' );
			}
			if ( violations.length === 0 ) {
				process.stdout.write(
					`axe-run: 0 violations${ incompleteNodeCount > 0 ? ` (with ${ incompleteNodeCount } undecided — see above)` : '' }.\n`
				);
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
