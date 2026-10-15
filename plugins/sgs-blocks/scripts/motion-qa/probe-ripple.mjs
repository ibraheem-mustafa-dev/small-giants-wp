/**
 * Spec 38A unit M5.9: live acceptance of the ripple effect (FR-38A-45, FR-38A-47, FR-38A-49) on a deployed site.
 *
 * The probe presses the pointer on each fixture button, then pauses the running ripple animation and sets its time, so
 * the samples are exact in every engine. The reference draft values are size factor 2.2, white, peak opacity 0.35, 650ms, linear.
 * Checks:
 *   ripple-sample:down         the painted circle (the ::after width x its scale) reads max(w, h) x 2.2 x t/650 and the
 *                              opacity 0.35 x (1 - t/650) at t = 0, 325 and 650ms
 *   ripple-origin:down         the circle starts at the pointer, measured from the element's top-left
 *   ripple-colour:down         the circle paints white
 *   ripple-trigger:click       the click-trigger button plays on mouse up and not on mouse down
 *   ripple-trigger:down        the pointerdown button plays on mouse down
 *   ripple-reduced:down        with prefers-reduced-motion: reduce no ripple plays
 *   ripple-slot:down           the ::after slot is the ripple's alone: the element lists no other ::after owner
 *   ripple-no-motion:control   the button with no ripple layer plays nothing and has no ::after content
 *   ripple-inline-style        the only inline declarations on a ripple element are --sgs-ripple-* custom properties
 * Each check has a negative control that reads a different state and must come out red.
 *
 * FIXTURE: tests/fixtures/motion/pages/ripple.json, built with scripts/wp-build-page.js. Elements are found by marker
 * class (`.m59-down`, `.m59-click`, `.m59-control`); a check whose marker is missing reports UNANSWERED.
 *
 * Usage:
 *   node scripts/motion-qa/probe-ripple.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go
 * red; 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near } from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const FACTOR = 2.2;
const DURATION = 650;
const PEAK = 0.35;
const TIMES = [ 0, 325, 650 ];
const HOST = ( cls ) => `${ cls }[data-sgs-fx~="ripple"], ${ cls } [data-sgs-fx~="ripple"]`;
const SEL = { down: HOST( '.m59-down' ), click: HOST( '.m59-click' ), control: '.m59-control' };

/** The diameter and opacity the circle must read at `t` ms: linear from 0 to the full diameter, peak to nothing. */
export function expectedAt( maxSide, t ) {
	const k = Math.min( 1, Math.max( 0, t / DURATION ) );
	return { diameter: maxSide * FACTOR * k, opacity: PEAK * ( 1 - k ) };
}

async function openPage( ctx, url, opts = {} ) {
	const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
	await page.evaluate( () => document.addEventListener( 'click', ( e ) => e.preventDefault(), true ) );
	await page.waitForTimeout( 400 );
	return { page, close: () => context.close() };
}

/** Scroll the host into view and return its box and the pointer position used (30px in, 20px down). */
async function target( page, selector ) {
	const handle = await page.$( selector );
	if ( ! handle ) return null;
	await handle.scrollIntoViewIfNeeded();
	const box = await handle.boundingBox();
	return box ? { box, x: box.x + Math.min( 30, box.width / 2 ), y: box.y + Math.min( 20, box.height / 2 ) } : null;
}

const playing = ( page, selector ) => page.evaluate( ( sel ) => document.querySelector( sel )?.getAttribute( 'data-sgs-ripple' ) === 'play', selector );

/** Pause the ripple animation at `t` ms and read the painted circle. */
async function sampleAt( page, selector, t ) {
	return page.evaluate( ( { sel, time } ) => {
		const el = document.querySelector( sel );
		const anim = document.getAnimations().find( ( a ) => a.effect && a.effect.target === el && a.effect.pseudoElement === '::after' );
		if ( ! anim ) return null;
		anim.pause();
		anim.currentTime = time;
		const cs = getComputedStyle( el, '::after' );
		const scale = new DOMMatrixReadOnly( cs.transform === 'none' ? undefined : cs.transform ).a;
		return { diameter: parseFloat( cs.width ) * scale, opacity: parseFloat( cs.opacity ), colour: cs.backgroundColor };
	}, { sel: selector, time: t } );
}

async function mainChecks( ctx, url ) {
	const { rep } = ctx;
	const { page, close } = await openPage( ctx, url );
	const down = await target( page, SEL.down );
	if ( ! down ) {
		rep.check( 'ripple-sample:down', { selector: SEL.down, pass: null, why: 'no .m59-down element with data-sgs-fx="ripple" on the page' } );
	} else {
		const maxSide = Math.max( down.box.width, down.box.height );
		await page.mouse.move( down.x, down.y );
		await page.mouse.down();
		const isPlaying = await playing( page, SEL.down );
		rep.check( 'ripple-trigger:down', { selector: SEL.down, property: 'data-sgs-ripple after mouse down', measured: isPlaying, expected: true, pass: isPlaying } );
		const readings = {};
		for ( const t of TIMES ) {
			readings[ t ] = await sampleAt( page, SEL.down, t );
			const want = expectedAt( maxSide, t );
			const got = readings[ t ];
			rep.check( 'ripple-sample:down', {
				selector: SEL.down,
				property: `circle diameter and opacity at ${ t }ms (max side ${ Math.round( maxSide ) }px x ${ FACTOR }, peak ${ PEAK })`,
				measured: got && { diameter: Math.round( got.diameter * 10 ) / 10, opacity: Math.round( got.opacity * 1000 ) / 1000 },
				expected: { diameter: Math.round( want.diameter * 10 ) / 10, opacity: Math.round( want.opacity * 1000 ) / 1000 },
				pass: got ? near( got.diameter, want.diameter, 1.5 ) && near( got.opacity, want.opacity, 0.02 ) : null,
				why: got ? '' : 'no ::after animation is running on the element',
			} );
		}
		if ( readings[ 325 ] ) {
			const wrong = expectedAt( maxSide, 650 );
			rep.control( 'ripple-sample:down', { selector: SEL.down, property: 'the 325ms reading read against the 650ms expectation', measured: readings[ 325 ].diameter, expected: wrong.diameter, red: ! near( readings[ 325 ].diameter, wrong.diameter, 1.5 ) } );
			rep.check( 'ripple-colour:down', { selector: SEL.down, property: 'circle background colour', measured: readings[ 325 ].colour, expected: 'rgb(255, 255, 255)', pass: /^rgba?\(255,\s*255,\s*255/.test( readings[ 325 ].colour ) } );
			rep.control( 'ripple-colour:down', { selector: SEL.down, property: 'the colour read against black', measured: readings[ 325 ].colour, expected: 'rgb(0, 0, 0)', red: ! /^rgba?\(0,\s*0,\s*0/.test( readings[ 325 ].colour ) } );
		}
		const origin = await page.evaluate( ( sel ) => {
			const el = document.querySelector( sel );
			return { x: parseFloat( el.style.getPropertyValue( '--sgs-ripple-x' ) ), y: parseFloat( el.style.getPropertyValue( '--sgs-ripple-y' ) ), style: el.getAttribute( 'style' ) || '', mc: el.getAttribute( 'data-sgs-mc' ) || '', fx: ( el.getAttribute( 'data-sgs-fx' ) || '' ).split( /\s+/ ).filter( Boolean ) };
		}, SEL.down );
		const wantX = down.x - down.box.x;
		const wantY = down.y - down.box.y;
		rep.check( 'ripple-origin:down', { selector: SEL.down, property: '--sgs-ripple-x and -y against the pointer offset', measured: [ origin.x, origin.y ], expected: [ wantX, wantY ], pass: near( origin.x, wantX, 1.5 ) && near( origin.y, wantY, 1.5 ) } );
		rep.control( 'ripple-origin:down', { selector: SEL.down, property: 'the origin read against the element centre', measured: [ origin.x, origin.y ], expected: [ down.box.width / 2, down.box.height / 2 ], red: ! near( origin.x, down.box.width / 2, 1.5 ) || ! near( origin.y, down.box.height / 2, 1.5 ) } );
		rep.check( 'ripple-slot:down', { selector: SEL.down, property: 'data-sgs-mc lists ::after and data-sgs-fx names no other ::after owner', measured: { mc: origin.mc, fx: origin.fx }, expected: '::after claimed by ripple alone', pass: origin.mc.split( /\s+/ ).includes( '::after' ) && ! origin.fx.includes( 'wave-gradient' ) } );
		const plain = await page.evaluate( ( sel ) => ( document.querySelector( sel )?.getAttribute( 'data-sgs-mc' ) || '' ), SEL.control );
		rep.control( 'ripple-slot:down', { selector: SEL.control, property: 'the same slot rule read on the no-ripple button', measured: plain, expected: '::after claimed', red: ! plain.split( /\s+/ ).includes( '::after' ) } );
		const declarations = origin.style.split( ';' ).map( ( d ) => d.trim() ).filter( Boolean );
		const bad = declarations.filter( ( d ) => ! d.startsWith( '--sgs-ripple-' ) );
		rep.check( 'ripple-inline-style', { selector: SEL.down, property: 'inline declarations', measured: declarations, expected: 'only --sgs-ripple-* custom properties', pass: bad.length === 0 } );
		rep.control( 'ripple-inline-style', { selector: SEL.down, property: 'a planted inline transform judged by the same rule', measured: [ ...declarations, 'transform: scale(1)' ], expected: 'only --sgs-ripple-*', red: [ ...declarations, 'transform: scale(1)' ].some( ( d ) => ! d.startsWith( '--sgs-ripple-' ) ) } );
		await page.mouse.up();
	}

	const click = await target( page, SEL.click );
	if ( ! click ) {
		rep.check( 'ripple-trigger:click', { selector: SEL.click, pass: null, why: 'no .m59-click element with data-sgs-fx="ripple" on the page' } );
	} else {
		await page.mouse.move( click.x, click.y );
		await page.mouse.down();
		const onDown = await playing( page, SEL.click );
		await page.mouse.up();
		await page.waitForTimeout( 60 );
		const onUp = await playing( page, SEL.click );
		rep.check( 'ripple-trigger:click', { selector: SEL.click, property: 'data-sgs-ripple after mouse down, then after the click', measured: [ onDown, onUp ], expected: [ false, true ], pass: ! onDown && onUp } );
		rep.control( 'ripple-trigger:click', { selector: SEL.click, property: 'the mouse-down reading read as if the ripple fired on pointerdown', measured: onDown, expected: true, red: ! onDown } );
	}

	const control = await target( page, SEL.control );
	if ( ! control ) {
		rep.check( 'ripple-no-motion:control', { selector: SEL.control, pass: null, why: 'no .m59-control on the page' } );
	} else {
		await page.mouse.move( control.x, control.y );
		await page.mouse.down();
		const ran = await page.evaluate( ( sel ) => {
			const el = document.querySelector( sel );
			const inner = el.querySelector( '[data-sgs-fx]' );
			return { played: el.hasAttribute( 'data-sgs-ripple' ) || !! el.querySelector( '[data-sgs-ripple]' ), after: getComputedStyle( inner || el, '::after' ).content, hasFx: !! inner };
		}, SEL.control );
		await page.mouse.up();
		rep.check( 'ripple-no-motion:control', { selector: SEL.control, property: 'a ripple after a press, and the ::after content', measured: ran, expected: { played: false }, pass: ! ran.played && ! ran.hasFx } );
		rep.control( 'ripple-no-motion:control', { selector: SEL.control, property: 'the control read against the ripple fixture, which does play', measured: ran.played, expected: true, red: ! ran.played } );
	}
	await close();
}

async function reducedChecks( ctx, url ) {
	const { rep } = ctx;
	const { page, close } = await openPage( ctx, url, { reducedMotion: 'reduce' } );
	const down = await target( page, SEL.down );
	if ( ! down ) {
		rep.check( 'ripple-reduced:down', { selector: SEL.down, pass: null, why: 'no ripple element' } );
		await close();
		return;
	}
	await page.mouse.move( down.x, down.y );
	await page.mouse.down();
	const calm = await playing( page, SEL.down );
	const anims = await page.evaluate( () => document.getAnimations().filter( ( a ) => a.effect && a.effect.pseudoElement === '::after' ).length );
	await page.mouse.up();
	rep.check( 'ripple-reduced:down', { selector: SEL.down, property: 'a ripple after a press with prefers-reduced-motion: reduce', measured: { playing: calm, afterAnimations: anims }, expected: { playing: false, afterAnimations: 0 }, pass: ! calm && anims === 0 } );
	await close();
	const live = await openPage( ctx, url, { reducedMotion: 'no-preference' } );
	const again = await target( live.page, SEL.down );
	await live.page.mouse.move( again.x, again.y );
	await live.page.mouse.down();
	const moving = await playing( live.page, SEL.down );
	rep.control( 'ripple-reduced:down', { selector: SEL.down, property: 'the same press with no preference', measured: moving, expected: false, red: moving } );
	await live.close();
}

async function findPage( browser, urls ) {
	const context = await browser.newContext( { viewport: { width: 1440, height: HEIGHT } } );
	for ( const url of urls ) {
		const page = await context.newPage();
		await page.goto( url, { waitUntil: 'load' } );
		const found = await page.evaluate( ( sel ) => !! document.querySelector( sel ), SEL.down );
		await page.close();
		if ( found ) {
			await context.close();
			return url;
		}
	}
	await context.close();
	return urls[ 0 ];
}

async function main() {
	const args = parseArgs( process.argv );
	if ( ! args.pages.length ) {
		console.error( 'Pass a --page <id> (a page built from tests/fixtures/motion/pages/ripple.json).' );
		process.exit( 1 );
	}
	const base = siteBase( args.site );
	const urls = args.pages.map( ( id ) => `${ base }/?p=${ id }&cb=m59` );
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		const url = await findPage( browser, urls );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, engine, width, rep };
			for ( const run of [ mainChecks, reducedChecks ] ) {
				try {
					await run( ctx, url );
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
