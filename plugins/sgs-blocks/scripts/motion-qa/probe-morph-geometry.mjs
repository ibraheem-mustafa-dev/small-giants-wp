/**
 * D452 close-out (2026-08-21) — does `fx-morph` actually morph on the live canary?
 *
 * WHAT D452 LEFT OPEN. `fx-shape-routes.php` used to put `data-sgs-fx="morph"` on the
 * injected `<svg class="sgs-fx-shape-visual">` WRAPPER while the geometry lives on the
 * inner `<path>`. MorphSVGPlugin refuses an `<svg>` outright, so morph had NEVER animated
 * on any block. The source fix moved the attributes onto the `<path>` — and D452 closed
 * with `⚠ OUTSTANDING: fix unverified live … Re-run geometry sampling on page 2113
 * post-deploy.` The gap register has carried it as UNVERIFIED since.
 *
 * The emit shape was confirmed live before this probe was written (curl: the attributes
 * are on `<path>`, the `<svg>` wrapper is clean) and the deployed module was confirmed to
 * be the real one. What was still missing is the only thing artefacts cannot supply:
 * AN OBSERVATION OF RENDERED GEOMETRY CHANGING. That is what this samples.
 *
 * METHOD
 *   Sample the `d` attribute across animation frames and count DISTINCT values. D452's
 *   pre-fix measurement was 148 frames over 1.6s with `d` unchanged throughout — one
 *   distinct value. A working morph must produce many.
 *
 * NEGATIVE CONTROL — the point of the whole exercise.
 *   The same sampler is run against the `sgs-fx-shape-target` path, which is the morph
 *   DESTINATION and is never animated. If the sampler reported "changed" for that too,
 *   a PASS on the visual path would prove nothing — it would just mean the sampler says
 *   "changed" about everything. The control must report exactly one distinct value.
 *
 * Run:  node scripts/motion-qa/probe-morph-geometry.mjs
 */

import { chromium } from 'playwright';

const URL_UNDER_TEST =
	'https://sandybrown-nightingale-600381.hostingersite.com/morph-fx-qa-canary/?cb=d728';

/** Sample one element's `d` across rAF frames. Returns distinct values seen, in order. */
const SAMPLER = ( [ selector, ms ] ) =>
	new Promise( ( resolve ) => {
		const el = document.querySelector( selector );
		if ( ! el ) {
			resolve( { error: `no element for ${ selector }` } );
			return;
		}
		const seen = [];
		let frames = 0;
		const started = performance.now();
		const tick = () => {
			frames += 1;
			const d = el.getAttribute( 'd' );
			if ( seen[ seen.length - 1 ] !== d ) {
				seen.push( d );
			}
			if ( performance.now() - started < ms ) {
				requestAnimationFrame( tick );
			} else {
				resolve( {
					frames,
					distinct: seen.length,
					first: seen[ 0 ] ? seen[ 0 ].slice( 0, 48 ) : null,
					last: seen[ seen.length - 1 ]
						? seen[ seen.length - 1 ].slice( 0, 48 )
						: null,
					firstEqualsLast: seen.length > 1 ? seen[ 0 ] === seen[ seen.length - 1 ] : true,
				} );
			}
		};
		requestAnimationFrame( tick );
	} );

const VISUAL = 'path[data-sgs-fx="morph"]';
const STATIC_CONTROL = '.sgs-fx-shape-target path';

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );

const consoleErrors = [];
page.on( 'console', ( m ) => {
	if ( m.type() === 'error' ) consoleErrors.push( m.text() );
} );

let exitCode = 0;
const line = ( s ) => console.log( `[morph-geometry] ${ s }` );

try {
	// `data-sgs-fx-trigger="load"` — sampling must begin before the tween finishes, so
	// wait only for DOM readiness, never for networkidle.
	await page.goto( URL_UNDER_TEST, { waitUntil: 'domcontentloaded' } );

	// Presence check FIRST. A missing element must read as a broken probe, never as a
	// silent pass — that is how the original defect survived artefact-only verification.
	const present = await page.evaluate(
		( [ v, s ] ) => ( {
			visual: !! document.querySelector( v ),
			control: !! document.querySelector( s ),
		} ),
		[ VISUAL, STATIC_CONTROL ]
	);
	if ( ! present.visual || ! present.control ) {
		line(
			`FAIL — probe is broken, not the feature: visual=${ present.visual } ` +
				`control=${ present.control }. Nothing was measured.`
		);
		process.exit( 1 );
	}

	const [ visual, control ] = await Promise.all( [
		page.evaluate( SAMPLER, [ VISUAL, 2000 ] ),
		page.evaluate( SAMPLER, [ STATIC_CONTROL, 2000 ] ),
	] );

	line(
		`negative control (${ STATIC_CONTROL }, never animated): ` +
			`${ control.frames } frames, ${ control.distinct } distinct d value(s)`
	);
	if ( control.distinct !== 1 ) {
		line(
			`FAIL — the static destination path reported ${ control.distinct } distinct ` +
				'values. The sampler says "changed" about an element that cannot change, ' +
				'so a PASS below would prove nothing.'
		);
		exitCode = 1;
	} else {
		line( 'negative control OK — the sampler CAN report "unchanged".' );
	}

	line(
		`morph path (${ VISUAL }): ${ visual.frames } frames, ` +
			`${ visual.distinct } distinct d value(s)`
	);
	line( `  first: ${ visual.first }…` );
	line( `  last:  ${ visual.last }…` );

	if ( visual.distinct <= 1 ) {
		line(
			'FAIL — geometry never changed. This is exactly D452\'s pre-fix measurement ' +
				'(148 frames, one value). Morph is still not animating.'
		);
		exitCode = 1;
	} else if ( visual.firstEqualsLast ) {
		line(
			'FAIL — geometry moved but returned to its starting value; that is a bounce, ' +
				'not a morph to the target shape.'
		);
		exitCode = 1;
	} else {
		line(
			`PASS — geometry changed across ${ visual.distinct } distinct values and ended ` +
				'somewhere other than it started. Morph animates live.'
		);
	}

	if ( consoleErrors.length ) {
		line( `console errors (${ consoleErrors.length }):` );
		consoleErrors.slice( 0, 5 ).forEach( ( e ) => line( `  ${ e }` ) );
	} else {
		line( 'no console errors — MorphSVGPlugin did not reject the element.' );
	}
} finally {
	await browser.close();
}

process.exit( exitCode );
