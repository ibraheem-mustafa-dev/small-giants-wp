/**
 * Spec 38A unit M5.10: acceptance of the sheen sweep (FR-38A-35, FR-38A-49) in real engines.
 *
 * The band is the `::before` of the injected `span.sgs-motion-layer[data-sgs-layer="sheen"]`, animated by
 * `assets/css/fx-sheen.css` (CSS only). The draft is Indus `shine()`: a 60% wide band at skewX(-18deg) that runs from
 * translateX(-120%) to translateX(260%) of its own width in 750ms on cubic-bezier(.16,.84,.32,1).
 *
 * SAMPLE MODE: after the pointer enters, the running `sgs-sheen-sweep` animation is paused and set to 0, 375 and 750ms,
 * and the band's computed `transform` is read (translate in px, skew from the matrix). That is deterministic where a
 * wall-clock sample would drift by a frame. The expectation is computed from the draft's keyframes and easing, not from
 * the stylesheet.
 *
 * CHECKS (each has a negative control that must come out red):
 *   sheen-keyframe:<t>ms    band translateX at 0, 375 and 750ms = (-120% + 380% x ease(t/750)) of the band's own width
 *   sheen-geometry          band width = 60% of the layer; skew angle = -18deg (matrix c = tan(-18deg))
 *   sheen-replay            leaving ends the sweep (parked off the element) and a second entry starts a fresh one
 *   sheen-focus-visible     Tab onto the link card starts the sweep, with the pointer nowhere near
 *   sheen-reduced-motion    under prefers-reduced-motion: reduce neither hover nor focus plays and the layer is not shown
 *   sheen-aria-hidden       the layer is aria-hidden="true"
 *   sheen-no-style          no sheen element, layer or descendant carries a `style` attribute
 *   sheen-control           the card with no sheen never shows a band, on hover
 *
 * TWO MODES
 *   --page <id>   the live site: the tree in tests/fixtures/motion/pages/sheen.json (`.m510-sheen`, `.m510-sheen-link`,
 *                 `.m510-control`).
 *   --local       an offline harness built from the repository's own `assets/css/motion.css` and `assets/css/fx-sheen.css`
 *                 and the renderer's markup contract.
 *
 * Usage:
 *   node scripts/motion-qa/probe-sheen.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375] [--site sandybrown]
 *   node scripts/motion-qa/probe-sheen.mjs --local [--engine ...]
 *   node scripts/motion-qa/probe-sheen.mjs --self-test      (offline: the easing and expectation maths)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const HEIGHT = 900;
const SAMPLES = [ 0, 375, 750 ];
const DURATION = 750;
const BAND_SHARE = 0.6;
const ANGLE = -18;
const FROM = -120;
const TO = 260;
const EASE = [ 0.16, 0.84, 0.32, 1 ];
const TOLERANCE_PX = 1;
const SHEEN = '.m510-sheen';
const LINK = '.m510-sheen-link';
const CONTROL = '.m510-control';

// ---- Pure judges ------------------------------------------------------------------------------------------------

/** CSS cubic-bezier(x1, y1, x2, y2) at progress p, solved by bisection on x. */
export function bezier( [ x1, y1, x2, y2 ], p ) {
	const at = ( a, b, t ) => 3 * a * ( 1 - t ) * ( 1 - t ) * t + 3 * b * ( 1 - t ) * t * t + t * t * t;
	let lo = 0;
	let hi = 1;
	for ( let i = 0; i < 60; i++ ) {
		const mid = ( lo + hi ) / 2;
		if ( at( x1, x2, mid ) < p ) lo = mid;
		else hi = mid;
	}
	return at( y1, y2, ( lo + hi ) / 2 );
}

/** The band's translateX (px) at `ms` into the sweep, for a band `bandPx` wide (Indus shine()). */
export function expectedTranslate( ms, bandPx ) {
	const eased = bezier( EASE, Math.min( 1, Math.max( 0, ms / DURATION ) ) );
	return ( ( FROM + ( TO - FROM ) * eased ) / 100 ) * bandPx;
}

// ---- The offline harness ----------------------------------------------------------------------------------------

const HARNESS_ORIGIN = 'http://sgs.test';
const LAYER_HTML = '<span class="sgs-motion-layer" data-sgs-layer="sheen" aria-hidden="true"></span>';
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>sheen harness</title>
<link rel="stylesheet" href="/assets/css/motion.css"><link rel="stylesheet" href="/assets/css/fx-sheen.css">
<style>
body { margin: 0; padding: 40px 80px; font: 16px sans-serif; }
.card { position: relative; width: 420px; height: 160px; margin: 0 0 40px; background: #ddd; }
</style></head><body>
<div class="card m510-sheen" data-sgs-mc="injected" data-sgs-fx="sheen">${ LAYER_HTML }Sheen card</div>
<div class="card m510-sheen-link" data-sgs-mc="injected" data-sgs-fx="sheen"><a href="#t">Sheen link card</a>${ LAYER_HTML }</div>
<div class="card m510-control">Control</div>
</body></html>`;

async function openHarness( context ) {
	await context.route( `${ HARNESS_ORIGIN }/**`, ( route ) => {
		const rel = new URL( route.request().url() ).pathname;
		if ( rel === '/' || rel === '/harness.html' ) return route.fulfill( { status: 200, contentType: 'text/html', body: HARNESS } );
		const file = path.join( PLUGIN, rel );
		if ( ! file.startsWith( PLUGIN ) || ! fs.existsSync( file ) ) return route.fulfill( { status: 404, body: 'not found' } );
		return route.fulfill( { status: 200, contentType: 'text/css', body: fs.readFileSync( file ) } );
	} );
	const page = await context.newPage();
	await page.goto( `${ HARNESS_ORIGIN }/harness.html`, { waitUntil: 'load' } );
	return page;
}

// ---- In-page readers --------------------------------------------------------------------------------------------

/** The running sweep on a card's layer (or null), paused and set to `ms` when given, with the band's geometry. */
const readBand = ( [ sel, ms ] ) => {
	const card = document.querySelector( sel );
	const layer = card && card.querySelector( ':scope > .sgs-motion-layer[data-sgs-layer="sheen"]' );
	if ( ! layer ) return { layer: false };
	const sweep = layer.getAnimations( { subtree: true } ).find( ( a ) => a.animationName === 'sgs-sheen-sweep' ) || null;
	if ( sweep && ms !== null ) {
		sweep.pause();
		sweep.currentTime = ms;
	}
	const band = getComputedStyle( layer, '::before' );
	const m = new DOMMatrix( band.transform === 'none' ? undefined : band.transform );
	return {
		layer: true,
		playing: !! sweep,
		running: !! sweep && sweep.playState === 'running',
		time: sweep ? Number( sweep.currentTime ) : null,
		tx: m.m41,
		skew: m.c,
		bandPx: parseFloat( band.width ),
		layerPx: layer.getBoundingClientRect().width,
		display: getComputedStyle( layer ).display,
	};
};

const readHygiene = ( sel ) => {
	const card = document.querySelector( sel );
	const layer = card && card.querySelector( ':scope > .sgs-motion-layer[data-sgs-layer="sheen"]' );
	if ( ! card || ! layer ) return null;
	return {
		ariaHidden: layer.getAttribute( 'aria-hidden' ),
		styled: [ card, ...card.querySelectorAll( '*' ) ].filter( ( el ) => el.hasAttribute( 'style' ) ).map( ( el ) => String( el.className || el.tagName ) ),
	};
};

const focusInside = ( sel ) => !! document.querySelector( sel )?.matches( ':has(:focus-visible), :focus-visible' );

async function band( page, sel, ms = null ) {
	return page.evaluate( readBand, [ sel, ms ] );
}

async function enter( page, sel ) {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 60 );
	const box = await page.locator( sel ).first().boundingBox();
	await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2, { steps: 4 } );
	await page.waitForTimeout( 80 );
}

async function tabTo( page, sel ) {
	let focused = false;
	for ( let i = 0; i < 25 && ! focused; i++ ) {
		await page.keyboard.press( 'Tab' );
		focused = await page.evaluate( focusInside, sel );
	}
	await page.waitForTimeout( 80 );
	return focused;
}

// ---- Checks -----------------------------------------------------------------------------------------------------

async function keyframeChecks( page, rep ) {
	const rest = await band( page, SHEEN );
	if ( ! rest.layer ) {
		rep.check( 'sheen-keyframe', { selector: SHEEN, pass: null, why: `no sheen layer inside ${ SHEEN }` } );
		return;
	}
	rep.control( 'sheen-keyframe', { selector: SHEEN, property: 'a sweep running before any pointer entry', measured: rest.playing, expected: false, red: rest.playing === false } );
	await enter( page, SHEEN );
	for ( const ms of SAMPLES ) {
		const r = await band( page, SHEEN, ms );
		if ( ! r.playing ) {
			rep.check( `sheen-keyframe:${ ms }ms`, { selector: SHEEN, pass: false, why: 'no sgs-sheen-sweep animation is running after pointer entry' } );
			continue;
		}
		const want = expectedTranslate( ms, r.bandPx );
		rep.check( `sheen-keyframe:${ ms }ms`, { selector: SHEEN, property: `band translateX at ${ ms }ms`, measured: Math.round( r.tx * 10 ) / 10, expected: Math.round( want * 10 ) / 10, pass: near( r.tx, want, TOLERANCE_PX ) } );
		if ( ms === 375 ) {
			const wrong = expectedTranslate( 0, r.bandPx );
			rep.control( 'sheen-keyframe:375ms', { selector: SHEEN, property: 'the 375ms reading against the 0ms expectation', measured: r.tx, expected: wrong, red: ! near( r.tx, wrong, TOLERANCE_PX ) } );
		}
		if ( ms === 0 ) {
			const tan = Math.tan( ( ANGLE * Math.PI ) / 180 );
			rep.check( 'sheen-geometry', { selector: SHEEN, property: 'band width as a share of the layer', measured: Math.round( ( r.bandPx / r.layerPx ) * 1000 ) / 1000, expected: BAND_SHARE, pass: near( r.bandPx / r.layerPx, BAND_SHARE, 0.01 ) } );
			rep.check( 'sheen-geometry:skew', { selector: SHEEN, property: 'skewX matrix c', measured: Math.round( r.skew * 1000 ) / 1000, expected: Math.round( tan * 1000 ) / 1000, pass: near( r.skew, tan, 0.005 ) } );
			rep.control( 'sheen-geometry', { selector: SHEEN, property: 'the skew read against +18deg', measured: r.skew, expected: -tan, red: ! near( r.skew, -tan, 0.005 ) } );
		}
	}
}

async function replayChecks( page, rep ) {
	await enter( page, SHEEN );
	const first = await band( page, SHEEN );
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 80 );
	const left = await band( page, SHEEN );
	const parked = left.layer && ! left.running && left.tx < 0 && Math.abs( left.tx ) >= left.bandPx;
	await enter( page, SHEEN );
	const again = await band( page, SHEEN );
	rep.check( 'sheen-replay', { selector: SHEEN, property: 'sweep ends and parks off the element on leave; a new entry starts a fresh sweep', measured: { first: first.running, leftRunning: left.running, leftTx: Math.round( left.tx ), again: again.running, againTime: again.time }, expected: 'playing, parked, playing from the start', pass: first.running === true && parked && again.running === true && again.time < 400 } );
	rep.control( 'sheen-replay', { selector: SHEEN, property: 'the parked reading read as a sweep still playing', measured: left.running, expected: true, red: left.running === false } );
}

async function focusChecks( page, rep ) {
	await page.mouse.move( 2, 2 );
	await page.waitForTimeout( 60 );
	const before = await band( page, LINK );
	if ( ! before.layer ) {
		rep.check( 'sheen-focus-visible', { selector: LINK, pass: null, why: `no sheen layer inside ${ LINK }` } );
		return;
	}
	const focused = await tabTo( page, LINK );
	const after = await band( page, LINK );
	rep.check( 'sheen-focus-visible', { selector: LINK, property: 'sweep starts when keyboard focus lands in the card, pointer elsewhere', measured: { focused, playing: after.playing }, expected: { focused: true, playing: true }, pass: focused && after.playing === true } );
	rep.control( 'sheen-focus-visible', { selector: LINK, property: 'the same card before any key press', measured: before.playing, expected: true, red: before.playing === false } );
}

async function hygieneChecks( page, rep ) {
	for ( const sel of [ SHEEN, LINK ] ) {
		const h = await page.evaluate( readHygiene, sel );
		if ( ! h ) {
			rep.check( 'sheen-aria-hidden', { selector: sel, pass: null, why: 'no sheen layer' } );
			continue;
		}
		rep.check( 'sheen-aria-hidden', { selector: sel, measured: h.ariaHidden, expected: 'true', pass: h.ariaHidden === 'true' } );
		rep.check( 'sheen-no-style', { selector: sel, property: 'elements carrying a style attribute', measured: h.styled, expected: [], pass: h.styled.length === 0 } );
	}
	const planted = await page.evaluate( () => {
		const probe = document.createElement( 'div' );
		probe.setAttribute( 'style', 'color: red' );
		return [ probe ].filter( ( el ) => el.hasAttribute( 'style' ) ).length;
	} );
	rep.control( 'sheen-no-style', { property: 'the style-attribute filter run over a planted styled element', measured: planted, expected: 0, red: planted === 1 } );
}

async function controlChecks( page, rep ) {
	await enter( page, CONTROL );
	const c = await page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		return el ? { layers: el.querySelectorAll( '.sgs-motion-layer[data-sgs-layer="sheen"]' ).length, sweeps: el.getAnimations( { subtree: true } ).filter( ( a ) => a.animationName === 'sgs-sheen-sweep' ).length } : null;
	}, CONTROL );
	if ( ! c ) {
		rep.check( 'sheen-control', { selector: CONTROL, pass: null, why: `no ${ CONTROL } element` } );
		return;
	}
	rep.check( 'sheen-control', { selector: CONTROL, property: 'sheen layers and sweeps on hover', measured: c, expected: { layers: 0, sweeps: 0 }, pass: c.layers === 0 && c.sweeps === 0 } );
	await enter( page, SHEEN );
	const s = await band( page, SHEEN );
	rep.control( 'sheen-control', { selector: SHEEN, property: 'the sheen card read as a control', measured: s.playing, expected: false, red: s.playing === true } );
}

async function reducedChecks( openPage, rep ) {
	const calm = await openPage( { reducedMotion: 'reduce' } );
	await enter( calm.page, SHEEN );
	const hovered = await band( calm.page, SHEEN );
	await calm.page.mouse.move( 2, 2 );
	await tabTo( calm.page, LINK );
	const keyed = await band( calm.page, LINK );
	rep.check( 'sheen-reduced-motion', { selector: SHEEN, property: 'sweeps playing and layer display under prefers-reduced-motion: reduce', measured: { hover: hovered.playing, focus: keyed.playing, display: hovered.display }, expected: { hover: false, focus: false, display: 'none' }, pass: hovered.layer === true && ! hovered.playing && ! keyed.playing && hovered.display === 'none' } );
	await calm.close();
	const live = await openPage( { reducedMotion: 'no-preference' } );
	await enter( live.page, SHEEN );
	const moving = await band( live.page, SHEEN );
	rep.control( 'sheen-reduced-motion', { selector: SHEEN, property: 'the same hover with no preference', measured: moving.playing, expected: false, red: moving.playing === true } );
	await live.close();
}

async function checks( page, openPage, rep ) {
	await keyframeChecks( page, rep );
	await replayChecks( page, rep );
	await focusChecks( page, rep );
	await hygieneChecks( page, rep );
	await controlChecks( page, rep );
	await reducedChecks( openPage, rep );
}

// ---- Self-test --------------------------------------------------------------------------------------------------

function selfTest() {
	const rep = new Reporter( { mode: 'self-test' } );
	rep.check( 'ease-endpoints', { measured: [ bezier( EASE, 0 ), bezier( EASE, 1 ) ], expected: [ 0, 1 ], pass: near( bezier( EASE, 0 ), 0, 1e-6 ) && near( bezier( EASE, 1 ), 1, 1e-6 ) } );
	rep.check( 'expect-0ms', { measured: expectedTranslate( 0, 100 ), expected: -120, pass: near( expectedTranslate( 0, 100 ), -120, 1e-6 ) } );
	rep.check( 'expect-750ms', { measured: expectedTranslate( 750, 100 ), expected: 260, pass: near( expectedTranslate( 750, 100 ), 260, 1e-6 ) } );
	rep.check( 'expect-375ms-is-ahead-of-linear', { measured: expectedTranslate( 375, 100 ), expected: '> 70 (linear midpoint)', pass: expectedTranslate( 375, 100 ) > 70 } );
	rep.control( 'expect-375ms', { measured: expectedTranslate( 375, 100 ), expected: expectedTranslate( 0, 100 ), red: ! near( expectedTranslate( 375, 100 ), expectedTranslate( 0, 100 ), 1 ) } );
	return rep.summary();
}

// ---- Main -------------------------------------------------------------------------------------------------------

async function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const local = argv.includes( '--local' );
	const args = parseArgs( [ 'node', 'probe', ...argv.filter( ( a ) => a !== '--local' ) ] );
	if ( ! local && ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/sheen.json), --local or --self-test.' );
		process.exit( 1 );
	}
	const url = local ? null : `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m510`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: local ? 'local' : 'live' } );
			const openPage = async ( opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				let page;
				if ( local ) {
					page = await openHarness( context );
				} else {
					page = await context.newPage();
					await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
				}
				await page.waitForTimeout( 400 );
				return { page, close: () => context.close() };
			};
			const first = await openPage();
			try {
				await checks( first.page, openPage, rep );
			} catch ( e ) {
				rep.check( 'error:checks', { pass: false, why: String( e && e.message ? e.message : e ) } );
			}
			await first.close();
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
