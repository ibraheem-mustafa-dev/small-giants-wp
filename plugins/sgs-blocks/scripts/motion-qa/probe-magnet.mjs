/**
 * Spec 38A unit M5.4: live acceptance of the magnet effect (FR-38A-40) on a deployed site, in Chromium and Firefox.
 *
 * One runtime serves every magnet: a document-level, rAF-throttled pointer listener, so a proximity magnet pulls while the
 * pointer is still OUTSIDE its box. Checks (each has a negative control that must come out red):
 *   magnet-proximity-outside:prox   a 120px proximity magnet reads a pull toward the pointer with the pointer 40px outside
 *                                   its box, equal to the model (distance pull x 1 - distance / radius), within 1.5px
 *   magnet-proximity-edge:prox      the pointer 1px outside the radius reads rest; 1px inside reads a pull
 *   magnet-over-outside:over        an over-element magnet does not move with the pointer 30px outside its box
 *   magnet-normalised:over          spans 10px and 8px read translate (5px, 0) at the right-edge midpoint and (5px, 4px) at
 *                                   the bottom-right corner (within 0.3px)
 *   magnet-1px-outside:over         the pointer 1px outside the element returns the over magnet to rest
 *   magnet-return:over              the return takes 250ms (+/- 70ms) and is a transition, not a snap
 *   magnet-nav-label                (needs --nav-page, or a nav-bar label magnet on --page) the label moves horizontally only,
 *                                   inside +/-8px, toward the pointer on both sides
 *   magnet-no-magnet:control        an element with no magnet never moves with the pointer at its edge and 40px away
 *   magnet-no-inline-translate      no magnet element carries an inline transform or translate (FR-38A-47)
 *   magnet-reduced                  reduced motion at load, and a mid-session switch in both directions, rests the magnet
 *
 * FIXTURE: tests/fixtures/motion/pages/magnet.json, built with scripts/wp-build-page.js. Elements are found by marker class
 * (`.m54-*`); a check whose marker is missing reports UNANSWERED.
 *
 * Usage:
 *   node scripts/motion-qa/probe-magnet.mjs --page <id> [--nav-page <id>] [--engine chromium|firefox ...] [--width 1440|768|375 ...] [--site sandybrown]
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { launchOptions, gotoThroughCheck, parseArgs, siteBase, Reporter, near, parseTranslate, isRest, styleWritesTransform } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const SETTLE = 450;
// The pull eases over the magnet's 250ms transition; a read sooner than that lands mid-ease (20px of a 30px pull).
const READ_MS = 450;
const TARGET = ( cls ) => `${ cls }[data-sgs-fx~="magnet"], ${ cls } [data-sgs-fx~="magnet"]`;
const OVER = TARGET( '.m54-over' );
const PROX = TARGET( '.m54-prox' );
const CONTROL = '.m54-control';
const NAV = '[data-magnet] .sgs-nav-bar-menu__magnet-target';

/** The proximity fixture's values (m54-prox): distance model, factor 0.5, cap 30px, radius 120px. */
const PROX_MODEL = { factor: 0.5, cap: 30, radius: 120 };

/** The pull the distance model gives on x for a pointer `gap` px right of the box (box width `w`). */
export function expectedProximityPull( w, gap, { factor, cap, radius } ) {
	if ( gap > radius ) return 0;
	// The runtime caps the offset pull first and then scales it by 1 - distance / radius (magnet.js::apply and pull).
	return Math.min( cap, ( w / 2 + gap ) * factor ) * ( 1 - gap / radius );
}

/** Take the pointer there and read the element once the frame and the pull have landed. */
async function readAt( page, selector, point ) {
	if ( point ) {
		await page.mouse.move( point.x, point.y, { steps: 3 } );
		await page.waitForTimeout( READ_MS );
	}
	return page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle( el );
		return { translate: cs.translate, style: el.getAttribute( 'style' ) || '', mag: [ cs.getPropertyValue( '--sgs-mag-x' ), cs.getPropertyValue( '--sgs-mag-y' ) ] };
	}, selector );
}

/** The element's box at rest (the pointer parked far away first), scrolled to the middle of the viewport. */
async function restBox( page, selector ) {
	await page.mouse.move( 5, 5 );
	await page.evaluate( ( sel ) => document.querySelector( sel )?.scrollIntoView( { block: 'center', behavior: 'instant' } ), selector );
	// Lenis smooth scroll keeps moving the page after an instant jump: wait until the box is steady and Lenis has stopped.
	await page.waitForFunction( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return true;
		const top = el.getBoundingClientRect().top;
		const steady = window.__magTop !== undefined && Math.abs( window.__magTop - top ) < 0.5;
		window.__magTop = top;
		return steady && ! document.documentElement.classList.contains( 'lenis-scrolling' );
	}, selector, { polling: 120, timeout: 5000 } ).catch( () => null );
	await page.evaluate( () => { delete window.__magTop; } );
	await page.waitForTimeout( SETTLE );
	return page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
	}, selector );
}

/** Sample the computed translate x every frame from the pointer's next move until `ms` have passed. */
async function sampleReturn( page, selector, ms ) {
	await page.evaluate( ( { sel, span } ) => {
		const el = document.querySelector( sel );
		window.__magReturn = new Promise( ( resolve ) => {
			const samples = [];
			let t0 = null;
			document.addEventListener( 'mousemove', () => { t0 = performance.now(); }, { once: true, capture: true } );
			const loop = ( now ) => {
				if ( t0 !== null ) {
					samples.push( [ now - t0, parseFloat( getComputedStyle( el ).translate ) || 0 ] );
					if ( now - t0 > span ) return resolve( samples );
				}
				requestAnimationFrame( loop );
			};
			requestAnimationFrame( loop );
		} );
	}, { sel: selector, span: ms } );
}

async function magnetChecks( ctx, url ) {
	const { rep } = ctx;
	const { page, close } = await ctx.newPage( url );
	// The boxes are re-measured (restBox) right before each section reads them: scrolling one element in moves the others.
	let over = await restBox( page, OVER );
	let prox = await restBox( page, PROX );
	const mid = ( b ) => ( { x: ( b.left + b.right ) / 2, y: ( b.top + b.bottom ) / 2 } );

	if ( ! prox ) {
		rep.check( 'magnet-proximity-outside:prox', { selector: PROX, pass: null, why: 'no .m54-prox element with data-sgs-fx="magnet" on the page' } );
	} else {
		const { y } = mid( prox );
		const outside = await readAt( page, PROX, { x: prox.right + 40, y } );
		const want = expectedProximityPull( prox.width, 40, PROX_MODEL );
		const got = parseTranslate( outside.translate ).x;
		rep.check( 'magnet-proximity-outside:prox', { selector: PROX, property: 'translate x with the pointer 40px outside the box', measured: got, expected: want, pass: want > 0.5 && near( got, want, 1.5 ) } );
		const beyond = await readAt( page, PROX, { x: prox.right + 400, y } );
		rep.control( 'magnet-proximity-outside:prox', { selector: PROX, property: 'the same read with the pointer 400px away', measured: beyond.translate, expected: 'rest', red: isRest( beyond.translate ) } );

		const inside = await readAt( page, PROX, { x: prox.right + PROX_MODEL.radius - 1, y } );
		const past = await readAt( page, PROX, { x: prox.right + PROX_MODEL.radius + 1, y } );
		rep.check( 'magnet-proximity-edge:prox', { selector: PROX, property: 'translate x at radius-1 (a pull) and radius+1 (rest)', measured: [ inside.translate, past.translate ], expected: [ 'a pull', 'rest' ], pass: ! isRest( inside.translate ) && isRest( past.translate ) } );
		rep.control( 'magnet-proximity-edge:prox', { selector: PROX, property: 'the radius+1 read judged as a pull', measured: past.translate, expected: 'rest', red: isRest( past.translate ) } );
	}

	over = await restBox( page, OVER );
	if ( ! over ) {
		for ( const id of [ 'magnet-over-outside:over', 'magnet-normalised:over', 'magnet-1px-outside:over', 'magnet-return:over' ] ) {
			rep.check( id, { selector: OVER, pass: null, why: 'no .m54-over element with data-sgs-fx="magnet" on the page' } );
		}
	} else {
		let { y } = mid( over );
		const away = await readAt( page, OVER, { x: over.right + 30, y } );
		rep.check( 'magnet-over-outside:over', { selector: OVER, property: 'translate with the pointer 30px outside an over-element magnet', measured: away.translate, expected: 'rest', pass: isRest( away.translate ) } );
		if ( prox ) {
			prox = await restBox( page, PROX );
			const proxAway = await readAt( page, PROX, { x: prox.right + 30, y: mid( prox ).y } );
			rep.control( 'magnet-over-outside:over', { selector: PROX, property: 'a proximity magnet at the same distance', measured: proxAway.translate, expected: 'a pull', red: ! isRest( proxAway.translate ) } );
			over = await restBox( page, OVER );
			( { y } = mid( over ) );
		}

		const edge = await readAt( page, OVER, { x: over.right, y } );
		const corner = await readAt( page, OVER, { x: over.right, y: over.bottom } );
		const e = parseTranslate( edge.translate );
		const c = parseTranslate( corner.translate );
		rep.check( 'magnet-normalised:over', { selector: OVER, property: 'translate at the right-edge midpoint and the bottom-right corner', measured: [ [ e.x, e.y ], [ c.x, c.y ] ], expected: [ [ 5, 0 ], [ 5, 4 ] ], pass: near( e.x, 5, 0.3 ) && near( e.y, 0, 0.3 ) && near( c.x, 5, 0.3 ) && near( c.y, 4, 0.3 ) } );
		rep.control( 'magnet-normalised:over', { selector: OVER, property: 'the corner read against the edge-midpoint expectation (y 0)', measured: c.y, expected: 0, red: ! near( c.y, 0, 0.3 ) } );

		await readAt( page, OVER, { x: over.right, y } );
		const one = await readAt( page, OVER, { x: over.right + 1, y } );
		await page.waitForTimeout( 450 );
		const after = await readAt( page, OVER );
		rep.check( 'magnet-1px-outside:over', { selector: OVER, property: 'translate 450ms after the pointer moves 1px outside the box', measured: after.translate, expected: 'rest', pass: isRest( after.translate ) } );
		rep.control( 'magnet-1px-outside:over', { selector: OVER, property: 'the edge read judged as rest', measured: e.x, expected: 0, red: ! near( e.x, 0, 0.3 ) } );
		void one;

		await readAt( page, OVER, { x: over.right, y } );
		await sampleReturn( page, OVER, 700 );
		await page.mouse.move( over.right + 300, y );
		const samples = await page.evaluate( () => window.__magReturn );
		const settled = samples.find( ( [ t, x ] ) => t > 30 && Math.abs( x ) <= 0.01 );
		const duration = settled ? settled[ 0 ] : null;
		const between = samples.some( ( [ , x ] ) => x > 0.05 && x < 4.95 );
		rep.check( 'magnet-return:over', { selector: OVER, property: 'ms from the pointer leaving until translate x is 0, and a value between rest and the pull on the way', measured: [ duration, between ], expected: [ 250, true ], pass: duration !== null && near( duration, 250, 70 ) && between } );
		rep.control( 'magnet-return:over', { selector: OVER, property: 'the measured return judged against 120ms', measured: duration, expected: 120, red: ! near( duration, 120, 70 ) } );
	}

	const control = await restBox( page, CONTROL );
	if ( ! control ) {
		rep.check( 'magnet-no-magnet:control', { selector: CONTROL, pass: null, why: 'no .m54-control element on the page' } );
	} else {
		const { y } = mid( control );
		const edge = await readAt( page, CONTROL, { x: control.right, y } );
		const near40 = await readAt( page, CONTROL, { x: control.right + 40, y } );
		rep.check( 'magnet-no-magnet:control', { selector: CONTROL, property: 'translate with the pointer at the edge and 40px away', measured: [ edge.translate, near40.translate ], expected: 'rest', pass: isRest( edge.translate ) && isRest( near40.translate ) } );
		if ( prox ) {
			prox = await restBox( page, PROX );
			const pulled = await readAt( page, PROX, { x: prox.right + 40, y: mid( prox ).y } );
			rep.control( 'magnet-no-magnet:control', { selector: PROX, property: 'the proximity magnet read as the control', measured: pulled.translate, expected: 'rest', red: ! isRest( pulled.translate ) } );
		}
	}

	for ( const [ sel, name ] of [ [ OVER, 'over' ], [ PROX, 'prox' ] ] ) {
		const now = await readAt( page, sel );
		if ( now ) rep.check( 'magnet-no-inline-translate', { selector: sel, measured: now.style, expected: 'only --sgs-mag-* custom properties', pass: ! styleWritesTransform( now.style ) && /--sgs-mag-x/.test( now.style ), why: name } );
	}
	await close();
}

/** The nav-bar label magnet: horizontal only, capped at 8px, toward the pointer on both sides. */
async function navChecks( ctx, url ) {
	const { rep } = ctx;
	const { page, close } = await ctx.newPage( url );
	const box = ctx.navGiven ? await restBox( page, NAV ) : null;
	if ( ! box ) {
		rep.check( 'magnet-nav-label', { selector: NAV, pass: null, why: 'no nav-bar label magnet on the page (pass --nav-page for a page with an sgs/nav-bar-menu that has the label magnet on)' } );
		await close();
		return;
	}
	const y = ( box.top + box.bottom ) / 2;
	const right = parseTranslate( ( await readAt( page, NAV, { x: box.right + 20, y: y + 15 } ) ).translate );
	const left = parseTranslate( ( await readAt( page, NAV, { x: box.left - 20, y } ) ).translate );
	const ok = right.x > 0 && right.x <= 8.01 && left.x < 0 && left.x >= -8.01 && near( right.y, 0, 0.01 ) && near( left.y, 0, 0.01 );
	rep.check( 'magnet-nav-label', { selector: NAV, property: 'translate with the pointer 20px right (and 15px below) and 20px left of the label', measured: [ [ right.x, right.y ], [ left.x, left.y ] ], expected: 'x within +/-8px toward the pointer, y 0', pass: ok } );
	rep.control( 'magnet-nav-label', { selector: NAV, property: 'the right-hand read judged as vertical movement', measured: right.y, expected: 'non-zero', red: right.y === 0 } );
	await close();
}

/** Reduced motion: at rest from load, and a mid-session switch in both directions. */
async function reducedChecks( ctx, url ) {
	const { rep } = ctx;
	const calm = await ctx.newPage( url, { reducedMotion: 'reduce' } );
	const calmBox = await restBox( calm.page, PROX );
	if ( ! calmBox ) {
		rep.check( 'magnet-reduced', { selector: PROX, pass: null, why: 'no .m54-prox element' } );
		await calm.close();
		return;
	}
	const point = { x: calmBox.right + 40, y: ( calmBox.top + calmBox.bottom ) / 2 };
	const still = await readAt( calm.page, PROX, point );
	await calm.close();

	const live = await ctx.newPage( url, { reducedMotion: 'no-preference' } );
	const box = await restBox( live.page, PROX );
	const pulled = await readAt( live.page, PROX, { x: box.right + 40, y: ( box.top + box.bottom ) / 2 } );
	await live.page.emulateMedia( { reducedMotion: 'reduce' } );
	await live.page.waitForTimeout( 500 );
	const rested = await readAt( live.page, PROX );
	const held = await readAt( live.page, PROX, { x: box.right + 30, y: ( box.top + box.bottom ) / 2 } );
	await live.page.emulateMedia( { reducedMotion: 'no-preference' } );
	await live.page.waitForTimeout( 300 );
	const back = await readAt( live.page, PROX, { x: box.right + 40, y: ( box.top + box.bottom ) / 2 } );
	rep.check( 'magnet-reduced', { selector: PROX, property: 'rest from load under reduce; rest after a switch to reduce; a pull again after the switch back', measured: [ still.translate, rested.translate, held.translate, back.translate ], expected: [ 'rest', 'rest', 'rest', 'a pull' ], pass: isRest( still.translate ) && isRest( rested.translate ) && isRest( held.translate ) && ! isRest( back.translate ) } );
	rep.control( 'magnet-reduced', { selector: PROX, property: 'the no-preference read judged as rest', measured: pulled.translate, expected: 'rest', red: ! isRest( pulled.translate ) } );
	await live.close();
}

async function main() {
	const argv = process.argv.slice( 0 );
	let navPage = null;
	const at = argv.indexOf( '--nav-page' );
	if ( at !== -1 ) navPage = argv.splice( at, 2 )[ 1 ];
	const args = parseArgs( argv );
	if ( ! args.pages.length ) {
		console.error( 'Pass a --page <id> (a page built from tests/fixtures/motion/pages/magnet.json).' );
		process.exit( 1 );
	}
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ args.pages[ 0 ] }&cb=m54`;
	const navUrl = navPage ? `${ base }/?p=${ navPage }&cb=m54` : url;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const newPage = async ( target, opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				const page = await context.newPage();
				await gotoThroughCheck( page, target );
				await page.waitForTimeout( 500 );
				return { page, close: () => context.close() };
			};
			const ctx = { browser, engine, width, rep, newPage, navGiven: !! navPage };
			for ( const [ run, target ] of [ [ magnetChecks, url ], [ navChecks, navUrl ], [ reducedChecks, url ] ] ) {
				try {
					await run( ctx, target );
				} catch ( e ) {
					rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
				}
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
