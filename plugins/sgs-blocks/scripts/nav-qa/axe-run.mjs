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
 *   node axe-run.mjs <url> [--open <selector>] [--scope <selector>] [--viewport <width>]
 *                          [--require-open] [--allow-closed] [--json]
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
 *   # Open a desktop mega, scope to the mega panel, force a 1440 viewport
 *   node axe-run.mjs https://palestine-lives.org/ \
 *     --open ".sgs-nav-menu__item--has-mega .sgs-nav-menu__link" \
 *     --scope ".sgs-nav-menu__mega-panel" --viewport 1440
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
	};
	const rest = [ ...argv ];
	args.url = rest.shift();
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--open' ) args.open = rest.shift();
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
			// Scroll the trigger to mid-viewport before clicking. A STICKY site
			// header will otherwise intercept the click on a trigger that sits
			// near the top of the page — the element reports visible+enabled and
			// the click still never lands (measured 2026-07-29 at 375px).
			await page.evaluate( ( sel ) => {
				const node = document.querySelector( sel );
				if ( ! node ) return;
				const r = node.getBoundingClientRect();
				window.scrollBy( 0, r.top - window.innerHeight / 2 );
			}, args.open );
			await page.waitForTimeout( 250 );
			try {
				await trigger.first().click( { timeout: 15000 } );
			} catch ( e ) {
				process.stderr.write(
					`axe-run: the --open trigger "${ args.open }" could not be clicked — ${ e.message.split( '\n' )[ 0 ] }\n` +
					'  Something is intercepting the click (commonly a sticky header). This is NOT a pass.\n'
				);
				process.exit( 2 );
			}
			// Park the pointer in the corner, away from the surface just opened.
			// After a click the cursor STAYS where it clicked, and an opened
			// panel frequently renders a link underneath it — that link then sits
			// in :hover and axe measures its HOVER colour. Measured 2026-07-29:
			// this produced a "serious color-contrast" violation on exactly one
			// drawer link (2.14:1) which vanished the moment the pointer moved,
			// i.e. a real-looking failure that described nothing a user would see
			// at rest. Hover states still deserve their own contrast check — but
			// as a deliberate, separate measurement, not a random by-product of
			// where the trigger happened to be.
			await page.mouse.move( 2, 2 );
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

		// --- Openness guard -------------------------------------------------
		// Measure the scope's RENDERED state. A closed <dialog> is present in
		// the DOM and axe skips its hidden subtree, so an unguarded scoped run
		// on a closed surface returns a meaningless 0.
		let guard = { status: 'NOT_APPLICABLE', reason: 'no --scope given', measured: null };

		if ( args.scope ) {
			const measured = await page.evaluate( ( scopeSelector ) => {
				const el = document.querySelector( scopeSelector );
				if ( ! el ) return null;
				const FOCUSABLE = [
					'a[href]', 'button:not([disabled])', 'input:not([disabled])',
					'select:not([disabled])', 'textarea:not([disabled])',
					'details > summary', '[tabindex]:not([tabindex="-1"])',
				].join( ',' );
				const rect = el.getBoundingClientRect();
				const style = window.getComputedStyle( el );
				const focusables = Array.from( el.querySelectorAll( FOCUSABLE ) ).filter( ( f ) => {
					const r = f.getBoundingClientRect();
					const s = window.getComputedStyle( f );
					return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
				} );
				return {
					tag: el.tagName,
					isDialog: el.tagName === 'DIALOG',
					dialogOpen: el.tagName === 'DIALOG' ? !! el.open : null,
					width: Math.round( rect.width ),
					height: Math.round( rect.height ),
					display: style.display,
					visibility: style.visibility,
					opacity: style.opacity,
					ariaHidden: el.getAttribute( 'aria-hidden' ),
					hiddenAttr: el.hasAttribute( 'hidden' ),
					focusableCount: focusables.length,
				};
			}, args.scope );

			// Arm the guard when the run implies an opened surface, or on demand.
			const armed = ! args.allowClosed && ( args.requireOpen || !! args.open || !! measured?.isDialog );

			if ( args.allowClosed ) {
				guard = { status: 'SKIPPED', reason: '--allow-closed passed; this result is UNGUARDED', measured };
			} else if ( ! armed ) {
				guard = {
					status: 'NOT_ARMED',
					reason: 'static scope, no --open and not a <dialog>; pass --require-open to enforce',
					measured,
				};
			} else {
				const failures = [];
				if ( ! measured ) {
					failures.push( 'scope element vanished before measurement' );
				} else {
					if ( measured.isDialog && ! measured.dialogOpen ) {
						failures.push( '<dialog> has no open property — it is CLOSED' );
					}
					if ( measured.width === 0 || measured.height === 0 ) {
						failures.push( `rendered box is ${ measured.width }x${ measured.height } (zero-size)` );
					}
					if ( measured.display === 'none' ) failures.push( 'computed display:none' );
					if ( measured.visibility === 'hidden' ) failures.push( 'computed visibility:hidden' );
					if ( parseFloat( measured.opacity ) === 0 ) failures.push( 'computed opacity:0' );
					if ( measured.ariaHidden === 'true' ) failures.push( 'aria-hidden="true"' );
					if ( measured.hiddenAttr ) failures.push( 'the [hidden] attribute is present' );
					if ( measured.focusableCount === 0 ) {
						failures.push( 'contains 0 visible focusable elements — nothing to Tab into' );
					}
				}

				if ( failures.length ) {
					guard = { status: 'VACUOUS', reason: failures.join( '; ' ), measured };
					if ( args.json ) {
						process.stdout.write( JSON.stringify( {
							url: args.url, scope: args.scope, open: args.open,
							viewport: args.viewport, guard, violations: null,
						}, null, 2 ) + '\n' );
					} else {
						process.stderr.write(
							`axe-run: VACUOUS — the scoped surface "${ args.scope }" was NOT genuinely open, ` +
							'so an axe result here would prove nothing.\n' +
							`  Why: ${ failures.join( '\n  Why: ' ) }\n` +
							'  Fix the --open step (or the selector) and re-run. This is NOT a pass.\n'
						);
					}
					process.exit( 3 );
				}

				guard = {
					status: 'PASS',
					reason: `open and interactive: ${ measured.width }x${ measured.height }, ` +
						`${ measured.focusableCount } focusable element(s)`,
					measured,
				};
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
			process.stdout.write( JSON.stringify( { url: args.url, scope: args.scope, open: args.open, viewport: args.viewport, guard, violations }, null, 2 ) + '\n' );
		} else {
			process.stdout.write( `axe-run: ${ args.url } (viewport ${ args.viewport }px)${ args.open ? `, opened "${ args.open }"` : '' }${ args.scope ? `, scoped to "${ args.scope }"` : ' (whole page)' }\n` );
			process.stdout.write( `axe-run: openness guard ${ guard.status } — ${ guard.reason }\n` );
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
