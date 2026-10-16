/**
 * Spec 38A unit M5.6: live acceptance of Follow pointer and glare (FR-38A-41, FR-38A-47, FR-38A-50).
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red, so a vacuous check cannot pass):
 *   follow-corner-angles      at the top right corner the computed `transform` decomposes to rotateX 8deg and rotateY
 *                             8deg within 0.2deg (the matrix is decomposed from the computed value, never read back
 *                             from the custom properties the script wrote). Control: the bottom left corner against the
 *                             same judge must fail (it reads -8deg and -8deg).
 *   scale-and-rotation        the computed `scale` (hover scale 1.04) and a non-zero rotation hold at the same time, so
 *                             Follow pointer composes with the hover state instead of replacing it. Control: the card
 *                             with no Follow pointer, at its corner, never rotates.
 *   style-custom-only         the element's `style` attribute holds only custom properties while tilted (FR-38A-50's
 *                             reworded clause) and is not empty, which proves the writer ran. Control: a planted
 *                             `transform` declaration is caught by the same judge.
 *   glare-layer               the injected glare layer is `aria-hidden`, paints a radial gradient centred on the pointer
 *                             (`--sgs-glare-x` and `--sgs-glare-y` as percentages) with a non-zero opacity while the
 *                             pointer is over the card. Control: the card with no glare has no glare layer.
 *   reduced-motion-live       a mid-session `prefers-reduced-motion` switch to reduce removes the tilt with no reload and
 *                             no further write follows; switching back resumes it. Control: before the switch the card
 *                             was rotated (the check is not vacuous).
 *   reset-settles             after the pointer leaves, the angle is still easing shortly after and is 0 by the end of
 *                             the reset duration plus a margin (the CSS settle transition does the easing).
 *
 * TWO MODES
 *   --page <id>   the live site (the tree in tests/fixtures/motion/pages/follow-pointer.json, built with
 *                 scripts/wp-build-page.js): the cards are found by `.m56-follow` and `.m56-plain`.
 *   --local       an offline harness built from the repository's own `assets/css/motion.css`, `assets/css/fx-glare.css`,
 *                 `src/shared/effects/fx-follow-pointer.js` and `fx-glare.js` and the renderer's markup contract, so the
 *                 script and stylesheet are measured in real engines before any deploy.
 *
 * Usage:
 *   node scripts/motion-qa/probe-follow-pointer.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375] [--site sandybrown]
 *   node scripts/motion-qa/probe-follow-pointer.mjs --local [--engine ...]
 *   node scripts/motion-qa/probe-follow-pointer.mjs --self-test      (offline: the judges and their controls)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { launchOptions, gotoThroughCheck, parseArgs, siteBase, Reporter } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const FOLLOW = '.m56-follow';
const PLAIN = '.m56-plain';
const MAX_ANGLE = 8;
const TOLERANCE = 0.2;
const RESET_MS = 600;
const HEIGHT = 900;

// ---- Pure judges (the live checks and --self-test both run them) ------------------------------------------------

/** rotateX and rotateY (deg) of `perspective() rotateX(a) rotateY(b)`, read from a matrix's m23 m22 m31 m11. */
export function decompose( m ) {
	const deg = ( r ) => ( r * 180 ) / Math.PI;
	return { x: deg( Math.atan2( m.m23, m.m22 ) ), y: deg( Math.atan2( m.m31, m.m11 ) ) };
}

/** Whether both angles are the expected ones within the tolerance. */
/** The top right reading: Y at the maximum, X positive and short of it (the pointer sits 11.5% down, not on the edge). */
export const nearCorner = ( a ) => Math.abs( a.y - MAX_ANGLE ) <= TOLERANCE && a.x >= 0.5 * MAX_ANGLE && a.x <= MAX_ANGLE + TOLERANCE;
export const anglesNear = ( a, x, y, tol = TOLERANCE ) => Math.abs( a.x - x ) <= tol && Math.abs( a.y - y ) <= tol;

/** The declaration names of a style attribute. */
export const styleNames = ( style ) => ( style || '' ).split( ';' ).map( ( d ) => d.split( ':' )[ 0 ].trim() ).filter( Boolean );

/** A style attribute holds at least one declaration and every one is a custom property. */
export const customOnly = ( style ) => {
	const names = styleNames( style );
	return names.length > 0 && names.every( ( n ) => n.startsWith( '--' ) );
};

/** A glare gradient centred on the written pointer position, as percentages. */
export function glareCentred( gradient, x, y ) {
	const m = /radial-gradient\(\s*circle at ([\d.]+)% ([\d.]+)%/.exec( gradient || '' );
	return !! m && Math.abs( parseFloat( m[ 1 ] ) - parseFloat( x ) ) < 0.5 && Math.abs( parseFloat( m[ 2 ] ) - parseFloat( y ) ) < 0.5;
}

function selfTest() {
	const failures = [];
	const want = ( cond, what ) => cond || failures.push( what );
	const rot = ( a, b ) => new DOMMatrixLike( a, b );
	want( anglesNear( decompose( rot( 8, 8 ) ), 8, 8 ), 'decompose reads back 8 and 8' );
	want( ! anglesNear( decompose( rot( -8, -8 ) ), 8, 8 ), 'the judge rejects the opposite corner' );
	want( ! anglesNear( decompose( rot( 8, 7.5 ) ), 8, 8 ), 'the judge rejects a 0.5deg error' );
	want( nearCorner( decompose( rot( 6.2, 8 ) ) ), 'the corner judge accepts Y at the maximum and X short of it' );
	want( ! nearCorner( decompose( rot( -6.2, -8 ) ) ), 'the corner judge rejects the opposite corner' );
	want( ! nearCorner( decompose( rot( 2.4, 2.4 ) ) ), 'the corner judge rejects a mid-decay reading' );
	want( customOnly( '--sgs-tilt-x: 8deg; --sgs-tilt-y: 8deg;' ), 'custom-only accepts two custom properties' );
	want( ! customOnly( '--sgs-tilt-x: 8deg; transform: none;' ), 'custom-only rejects a transform' );
	want( ! customOnly( '' ), 'custom-only rejects an empty style (the writer did not run)' );
	want( glareCentred( 'radial-gradient(circle at 75% 25%, rgb(255, 255, 255), rgba(0, 0, 0, 0) 55%)', '75.0%', '25.0%' ), 'glare is centred on the written position' );
	want( ! glareCentred( 'radial-gradient(circle at 50% 50%, red, blue)', '75.0%', '25.0%' ), 'glare off the pointer is rejected' );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

/** Just enough of a DOMMatrix to self-test the decomposition without a browser: perspective() rotateX(a) rotateY(b). */
class DOMMatrixLike {
	constructor( a, b ) {
		const r = ( d ) => ( d * Math.PI ) / 180;
		this.m22 = Math.cos( r( a ) );
		this.m23 = Math.sin( r( a ) );
		this.m11 = Math.cos( r( b ) );
		this.m31 = Math.sin( r( b ) );
	}
}

// ---- The offline harness ------------------------------------------------------------------------------------------

const HARNESS_ORIGIN = 'http://sgs.test';
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>follow pointer harness</title>
<link rel="stylesheet" href="/assets/css/motion.css"><link rel="stylesheet" href="/assets/css/fx-glare.css">
<style>
body { margin: 0; padding: 120px 160px; font: 16px sans-serif; }
.card { position: relative; width: 420px; height: 220px; margin: 0 0 80px; background: #ddd; }
.card[data-sgs-mh] { --sgs-mh-s: 1; --sgs-persp-self: 1100px; --sgs-tilt-max: 8deg; --sgs-tilt-lock: none; }
.card[data-sgs-mh]:hover { --sgs-mh-s: 1.04; --sgs-mh-on: 1; }
@media (prefers-reduced-motion: reduce) { .card[data-sgs-mh]:hover { --sgs-mh-s: 1; } }
.card[data-sgs-mh]:not(:hover) { transition: --sgs-tilt-x ${ RESET_MS }ms ease-out, --sgs-tilt-y ${ RESET_MS }ms ease-out; }
</style></head><body>
<div class="card m56-follow" data-sgs-mh="self" data-sgs-mc="scale transform injected" data-sgs-fx="follow-pointer glare">
<span class="sgs-motion-layer" data-sgs-layer="glare" aria-hidden="true"></span>Follow pointer</div>
<div class="card m56-plain" data-sgs-mh="self" data-sgs-mc="scale">Control</div>
<script type="module" src="/src/shared/effects/fx-follow-pointer.js"></script>
<script type="module" src="/src/shared/effects/fx-glare.js"></script>
</body></html>`;

/** Serve the harness and the repository's real assets from memory and disk. */
export async function openHarness( context ) {
	await context.route( `${ HARNESS_ORIGIN }/**`, ( route ) => {
		const rel = new URL( route.request().url() ).pathname;
		if ( rel === '/' || rel === '/harness.html' ) return route.fulfill( { status: 200, contentType: 'text/html', body: HARNESS } );
		// The modules import each other without an extension (webpack resolves it); a browser needs the real file.
		const file = path.join( PLUGIN, path.extname( rel ) ? rel : `${ rel }.js` );
		if ( ! file.startsWith( PLUGIN ) || ! fs.existsSync( file ) ) return route.fulfill( { status: 404, body: 'not found' } );
		const type = file.endsWith( '.css' ) ? 'text/css' : 'text/javascript';
		return route.fulfill( { status: 200, contentType: type, body: fs.readFileSync( file ) } );
	} );
	const page = await context.newPage();
	if ( process.env.SGS_PROBE_DEBUG ) {
		page.on( 'console', ( m ) => console.error( 'console:', m.text() ) );
		page.on( 'pageerror', ( e ) => console.error( 'pageerror:', e.message ) );
		page.on( 'response', ( r ) => console.error( r.status(), r.url() ) );
	}
	await page.goto( `${ HARNESS_ORIGIN }/harness.html`, { waitUntil: 'load' } );
	return page;
}

// ---- In-page readers ----------------------------------------------------------------------------------------------

export const readState = ( sel ) => {
	const el = document.querySelector( sel );
	const cs = getComputedStyle( el );
	const m = new DOMMatrix( cs.transform === 'none' ? undefined : cs.transform );
	const layer = el.querySelector( '.sgs-motion-layer[data-sgs-layer="glare"]' );
	const lcs = layer ? getComputedStyle( layer ) : null;
	return {
		matrix: { m11: m.m11, m22: m.m22, m23: m.m23, m31: m.m31 },
		scale: cs.scale,
		style: el.getAttribute( 'style' ),
		glareX: el.style.getPropertyValue( '--sgs-glare-x' ),
		glareY: el.style.getPropertyValue( '--sgs-glare-y' ),
		layer: layer ? { ariaHidden: layer.getAttribute( 'aria-hidden' ), image: lcs.backgroundImage, opacity: parseFloat( lcs.opacity ) } : null,
	};
};

/**
 * Move the pointer well away, then onto one of a card's corners, `inset` px inside the resting box, and let the writer and
 * frames settle. A tilted card's far corners recede and can leave the pointer outside it, so only the near corner (top
 * right, where both angles are positive) is read at 1px.
 */
export async function atCorner( page, sel, corner, inset = 1 ) {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( RESET_MS + 400 );
	const box = await ( await page.$( sel ) ).boundingBox();
	// A tilted card's corner is pulled inward (6px on a 1280px card at 8deg), so a pointer within about 20px of an edge flickers
	// in and out of :hover and the angle reads mid-decay. The point is 5% in horizontally (where the writer reaches the maximum
	// on Y) and 11.5% in vertically, with `inset` as the floor; X is then positive and short of the maximum.
	const insetX = Math.max( inset, box.width * 0.05 );
	const insetY = Math.max( inset, box.height * 0.115 );
	const x = corner.includes( 'right' ) ? box.x + box.width - insetX : box.x + insetX;
	const y = corner.includes( 'top' ) ? box.y + insetY : box.y + box.height - insetY;
	await page.mouse.move( x, y - 20 );
	await page.mouse.move( x, y, { steps: 4 } );
	await page.waitForTimeout( 300 );
	return page.evaluate( readState, sel );
}

// ---- The checks ---------------------------------------------------------------------------------------------------

async function checks( page, rep ) {
	if ( ! ( await page.$( FOLLOW ) ) || ! ( await page.$( PLAIN ) ) ) {
		rep.check( 'follow-corner-angles', { pass: null, why: `the page has no ${ FOLLOW } and ${ PLAIN } (build tests/fixtures/motion/pages/follow-pointer.json)` } );
		return;
	}
	const tr = await atCorner( page, FOLLOW, 'top right', 8 );
	const angles = decompose( tr.matrix );
	rep.check( 'follow-corner-angles', { selector: FOLLOW, property: 'computed transform at the top right corner', measured: angles, expected: `rotateY ${ MAX_ANGLE }deg within ${ TOLERANCE }deg and rotateX positive, between ${ 0.5 * MAX_ANGLE } and ${ MAX_ANGLE }deg`, pass: nearCorner( angles ) } );
	const bl = await atCorner( page, FOLLOW, 'bottom left', 12 );
	const opposite = decompose( bl.matrix );
	rep.control( 'follow-corner-angles', { selector: FOLLOW, property: 'the bottom left corner (12px in) against the same judge', measured: opposite, expected: 'both angles negative, so the top right judge rejects it', red: ! nearCorner( opposite ) && opposite.x < -1 && opposite.y < -1 } );

	const both = await atCorner( page, FOLLOW, 'top right', 8 );
	const plain = await atCorner( page, PLAIN, 'top right' );
	const plainAngles = decompose( plain.matrix );
	rep.check( 'scale-and-rotation', { selector: FOLLOW, property: 'computed scale with a non-zero rotation', measured: { scale: both.scale, angles: decompose( both.matrix ) }, expected: 'scale 1.04 and |rotateX| above 1deg together', pass: Math.abs( parseFloat( both.scale ) - 1.04 ) < 0.005 && Math.abs( decompose( both.matrix ).x ) > 1 } );
	rep.control( 'scale-and-rotation', { selector: PLAIN, property: 'the card with no Follow pointer, at its top right corner', measured: { scale: plain.scale, angles: plainAngles }, expected: 'scale 1.04 and no rotation (so rotation is not an artefact of hovering)', red: Math.abs( parseFloat( plain.scale ) - 1.04 ) < 0.005 && anglesNear( plainAngles, 0, 0, 0.01 ) } );

	rep.check( 'style-custom-only', { selector: FOLLOW, property: 'style attribute while tilted', measured: both.style, expected: 'only custom properties, at least one', pass: customOnly( both.style ) } );
	rep.control( 'style-custom-only', { selector: FOLLOW, property: 'a planted transform declaration', measured: '--sgs-tilt-x: 8deg; transform: none', expected: 'the same judge rejects it', red: ! customOnly( '--sgs-tilt-x: 8deg; transform: none' ) } );
	rep.check( 'style-custom-only/control-card', { selector: PLAIN, property: 'style attribute of the card with no Follow pointer', measured: plain.style, expected: 'no style attribute, or an empty one', pass: ! plain.style } );

	const layer = both.layer;
	rep.check( 'glare-layer', { selector: `${ FOLLOW } .sgs-motion-layer`, property: 'aria-hidden, gradient centred on the pointer, opacity', measured: { layer, x: both.glareX, y: both.glareY }, expected: 'aria-hidden true, radial gradient at the written position, opacity above 0 while hovered', pass: !! layer && layer.ariaHidden === 'true' && glareCentred( layer.image, both.glareX, both.glareY ) && layer.opacity > 0 } );
	rep.control( 'glare-layer', { selector: PLAIN, property: 'glare layers on the card with no glare', measured: plain.layer, expected: 'none', red: plain.layer === null } );

	await atCorner( page, FOLLOW, 'top right', 8 );
	const before = decompose( ( await page.evaluate( readState, FOLLOW ) ).matrix );
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.waitForTimeout( 400 );
	const reducedNow = await page.evaluate( readState, FOLLOW );
	const box = await ( await page.$( FOLLOW ) ).boundingBox();
	await page.mouse.move( box.x + box.width * 0.95, box.y + box.height * 0.115 );
	await page.waitForTimeout( 300 );
	const reducedMoved = await page.evaluate( readState, FOLLOW );
	await page.emulateMedia( { reducedMotion: 'no-preference' } );
	await page.waitForTimeout( 100 );
	await page.mouse.move( box.x + box.width * 0.95, box.y + box.height * 0.115, { steps: 3 } );
	await page.waitForTimeout( 400 );
	const resumed = decompose( ( await page.evaluate( readState, FOLLOW ) ).matrix );
	const stopped = anglesNear( decompose( reducedNow.matrix ), 0, 0, 0.05 ) && anglesNear( decompose( reducedMoved.matrix ), 0, 0, 0.05 ) && ! /--sgs-tilt/.test( reducedMoved.style || '' );
	rep.check( 'reduced-motion-live', { selector: FOLLOW, property: 'computed transform across a mid-session reduced-motion switch', measured: { reducedNow: decompose( reducedNow.matrix ), reducedMoved: decompose( reducedMoved.matrix ), resumed }, expected: 'rotation 0 and no tilt write while reduced, rotation again when switched back', pass: stopped && Math.abs( resumed.x ) > 1 } );
	rep.control( 'reduced-motion-live', { selector: FOLLOW, property: 'the angle before the switch', measured: before, expected: 'rotated (above 1deg), so the stop is a change and not a card that never tilted', red: Math.abs( before.x ) > 1 } );

	await atCorner( page, FOLLOW, 'top right', 8 );
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 60 );
	const easing = decompose( ( await page.evaluate( readState, FOLLOW ) ).matrix );
	await page.waitForTimeout( RESET_MS + 400 );
	const settled = decompose( ( await page.evaluate( readState, FOLLOW ) ).matrix );
	rep.check( 'reset-settles', { selector: FOLLOW, property: `computed transform 60ms and ${ RESET_MS + 460 }ms after the pointer leaves`, measured: { easing, settled }, expected: 'still rotated while easing, 0 after the reset duration', pass: Math.abs( easing.x ) > 0.5 && anglesNear( settled, 0, 0, 0.05 ) } );
	rep.control( 'reset-settles', { selector: FOLLOW, property: 'the angle 60ms after leaving', measured: easing, expected: 'not yet 0, so settling is a transition and not a snap', red: Math.abs( easing.x ) > 0.5 } );
}

async function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const local = argv.includes( '--local' );
	const args = parseArgs( [ 'node', 'probe', ...argv.filter( ( a ) => a !== '--local' ) ] );
	if ( ! local && ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/follow-pointer.json) or --local.' );
		process.exit( 1 );
	}
	const url = local ? null : `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m56`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: local ? 'local' : 'live' } );
			const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
			try {
				let page;
				if ( local ) {
					page = await openHarness( context );
				} else {
					page = await context.newPage();
					await gotoThroughCheck( page, url );
				}
				await page.waitForTimeout( 400 );
				await checks( page, rep );
			} catch ( e ) {
				rep.check( 'error:checks', { pass: false, why: String( e && e.message ? e.message : e ) } );
			}
			await context.close();
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	process.exit( finish.summary() );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().catch( ( e ) => {
		console.error( e );
		process.exit( 1 );
	} );
}
