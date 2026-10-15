/**
 * Spec 38A unit M5.D: acceptance of the drawer entrances on the motion model in real engines: the one-edge clip
 * (wipe down), the clip anchored to the opener row (reveal from the bar) and the curtain sweep, each on the `open`
 * trigger.
 *
 * OPENING: the fixture's panels are generic containers, which have no script of their own to open them, so the probe
 * plays the owning block's part: it sets `data-sgs-motion-state="open"` (then `close`) on each panel, the attribute
 * `@sgs/motion-state` sets on a real drawer, and declares the opener row's bottom (`--sgs-drawer-opener-row-bottom`,
 * which the nav drawer's script measures) as a stylesheet rule on :root. Nothing is written to a `style` attribute.
 *
 * SAMPLE MODE: the running animation (`sgs-me-clip-path` on a panel, `sgs-curtain-<direction>` on the curtain band) is
 * paused and set to 0, 150, 300, 450 and 600ms of its 600ms linear run. A clip is read by hit-testing a column down the
 * panel (the visible extent from its top, which a `clip-path` governs in every engine); the band by its computed
 * `clip-path` (left and right insets as shares of the layer). Expectations come from the fixture's values, not the CSS.
 *
 * CHECKS (each has a negative control that must come out red):
 *   wipe:<t>ms           wipe down: the visible extent is the panel height x t/600 (inset(0 0 100% 0) to inset(0))
 *   bar:<t>ms            reveal from the bar: the extent is row + (height - row) x t/600, from the 64px opener row
 *   bar-fallback         with no opener row declared the bar entrance starts fully clipped (the stored 100%)
 *   held                 once open, both panels hold inset(0): the whole panel is visible
 *   curtain:<t>ms        the band covers [0, 2t/600] of the width to half way, then [2t/600 - 1, 1]; colour #1f2937
 *   curtain-close        closing plays the sweep back (a reversed animation)
 *   curtain-aria-hidden  the band's layer is aria-hidden="true"
 *   no-style             no panel, layer or descendant carries a `style` attribute
 *   reduced-motion       under prefers-reduced-motion: reduce nothing animates, the panels show whole, no band shows
 *   control              the control panel never animates and has no layer, even with the open state set on it
 *
 * TWO MODES
 *   --page <id>   the live site: the tree in tests/fixtures/motion/pages/drawer-entrances.json (`.m5d-wipe`, `.m5d-bar`,
 *                 `.m5d-curtain`, `.m5d-control`). The curtain needs its fx_effects row (so the registry enqueues
 *                 assets/css/fx-curtain.css); without it the curtain rows report UNANSWERED.
 *   --local       an offline harness: the repository's motion.css, motion-triggers.css and fx-curtain.css, with the
 *                 fixture's markup and scoped CSS printed by the shipped PHP emitters
 *                 (`php tests/php/run-motion-clip-edge-standalone.php --dump-harness`).
 *
 * Usage:
 *   node scripts/motion-qa/probe-drawer-entrances.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375] [--site sandybrown]
 *   node scripts/motion-qa/probe-drawer-entrances.mjs --local [--engine ...]
 *   node scripts/motion-qa/probe-drawer-entrances.mjs --self-test      (offline: the expectation and parsing maths)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near } from './probe-motion-model-lib.mjs';
import { ROW, expectedWipe, expectedBar, expectedBand, parseInset, harnessHtml, openHarness } from './probe-drawer-entrances-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const SAMPLES = [ 0, 150, 300, 450, 600 ];
const TOLERANCE_PX = 2;
const TOLERANCE_SHARE = 0.01;
const BAND_RGB = 'rgb(31, 41, 55)';
const WIPE = '.m5d-wipe';
const BAR = '.m5d-bar';
const CURTAIN = '.m5d-curtain';
const CONTROL = '.m5d-control';
const ROW_RULE = `:root { --sgs-drawer-opener-row-bottom: ${ ROW }px; }`;

// ---- In-page readers --------------------------------------------------------------------------------------------

/** Set (or clear, with '') the motion state on the selectors' elements. */
const setState = ( [ sels, state ] ) => sels.forEach( ( sel ) => {
	const el = document.querySelector( sel );
	if ( el && state ) el.setAttribute( 'data-sgs-motion-state', state );
	else if ( el ) el.removeAttribute( 'data-sgs-motion-state' );
} );

/** A panel's clip animation paused at `ms` (when given), and its visible extent from the top by hit-testing. */
const readClip = ( [ sel, ms ] ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return { found: false };
	el.scrollIntoView( { block: 'center' } );
	const anim = el.getAnimations().find( ( a ) => a.animationName === 'sgs-me-clip-path' ) || null;
	if ( anim && null !== ms ) {
		anim.pause();
		anim.currentTime = ms;
	}
	const r = el.getBoundingClientRect();
	const hits = ( x, y ) => {
		const hit = document.elementFromPoint( x, y );
		return !! hit && ( hit === el || el.contains( hit ) ) && ! hit.classList.contains( 'sgs-motion-layer' );
	};
	let extent = 0;
	for ( let y = Math.ceil( r.top ); y < r.bottom; y++ ) {
		if ( hits( r.left + r.width / 2, y + 0.5 ) ) extent = y + 1 - r.top;
	}
	const cs = getComputedStyle( el );
	return {
		found: true,
		playing: !! anim,
		height: r.height,
		extent: Math.round( extent * 10 ) / 10,
		edgesOpen: extent > 4 ? hits( r.left + 1, r.top + 2 ) && hits( r.right - 1, r.top + 2 ) : null,
		clipB: cs.getPropertyValue( '--sgs-me-clip-b' ).trim(),
		clipT: cs.getPropertyValue( '--sgs-me-clip-t' ).trim(),
		animations: el.getAnimations().length,
	};
};

/** The curtain band at `ms` (when given): its animation, computed clip-path insets as shares and colour. */
const readBand = ( [ sel, ms ] ) => {
	const el = document.querySelector( sel );
	const layer = el && el.querySelector( ':scope > .sgs-motion-layer[data-sgs-layer="curtain"]' );
	if ( ! layer ) return { layer: false };
	el.scrollIntoView( { block: 'center' } );
	const anim = layer.getAnimations( { subtree: true } ).find( ( a ) => /^sgs-curtain-/.test( a.animationName ) ) || null;
	if ( anim && null !== ms ) {
		anim.pause();
		anim.currentTime = ms;
	}
	const band = getComputedStyle( layer, '::before' );
	const box = layer.getBoundingClientRect();
	return {
		layer: true,
		name: anim ? anim.animationName : null,
		direction: anim ? anim.effect.getComputedTiming().direction : null,
		clipPath: band.clipPath,
		width: box.width,
		height: box.height,
		colour: band.backgroundColor,
		display: getComputedStyle( layer ).display,
		ariaHidden: layer.getAttribute( 'aria-hidden' ),
	};
};

const readStyled = ( sels ) => sels.flatMap( ( sel ) => {
	const el = document.querySelector( sel );
	return el ? [ el, ...el.querySelectorAll( '*' ) ].filter( ( n ) => n.hasAttribute( 'style' ) ).map( ( n ) => String( n.className || n.tagName ) ) : [ `missing ${ sel }` ];
} );

const hasSheet = () => [ ...document.styleSheets ].some( ( s ) => ( s.href || '' ).includes( 'fx-curtain' ) );

async function clip( page, sel, ms = null ) {
	return page.evaluate( readClip, [ sel, ms ] );
}
async function bandAt( page, sel, ms = null ) {
	return page.evaluate( readBand, [ sel, ms ] );
}
async function open( page, sels, state = 'open' ) {
	await page.evaluate( setState, [ sels, state ] );
	await page.waitForTimeout( 60 );
}

// ---- Checks -----------------------------------------------------------------------------------------------------

async function clipChecks( page, rep ) {
	const rest = await clip( page, WIPE );
	if ( ! rest.found ) {
		rep.check( 'wipe', { selector: WIPE, pass: null, why: `no ${ WIPE } element` } );
		return;
	}
	rep.control( 'wipe', { selector: WIPE, property: 'a clip animation before the panel opens', measured: rest.playing, expected: false, red: rest.playing === false } );
	await page.addStyleTag( { content: ROW_RULE } );
	await open( page, [ WIPE, BAR ] );
	for ( const ms of SAMPLES ) {
		const w = await clip( page, WIPE, ms );
		const b = await clip( page, BAR, ms );
		for ( const [ id, r, want, sel ] of [ [ 'wipe', w, expectedWipe( ms, w.height ), WIPE ], [ 'bar', b, expectedBar( ms, b.height ), BAR ] ] ) {
			if ( ! r.playing ) {
				rep.check( `${ id }:${ ms }ms`, { selector: sel, pass: false, why: 'no sgs-me-clip-path animation runs once the open state is set' } );
				continue;
			}
			rep.check( `${ id }:${ ms }ms`, { selector: sel, property: `visible extent from the top at ${ ms }ms (px); side edges open`, measured: { extent: r.extent, edgesOpen: r.edgesOpen, clipT: r.clipT, clipB: r.clipB }, expected: Math.round( want * 10 ) / 10, pass: near( r.extent, want, TOLERANCE_PX ) && r.edgesOpen !== false } );
		}
		if ( 300 === ms ) {
			rep.control( 'wipe:300ms', { selector: WIPE, property: 'the wipe reading against the bar expectation', measured: w.extent, expected: expectedBar( ms, w.height ), red: ! near( w.extent, expectedBar( ms, w.height ), TOLERANCE_PX ) } );
		}
		if ( 0 === ms ) {
			rep.control( 'bar:0ms', { selector: BAR, property: 'the bar reading against the un-anchored wipe expectation', measured: b.extent, expected: 0, red: ! near( b.extent, 0, TOLERANCE_PX ) } );
		}
	}
	await page.evaluate( ( sels ) => sels.forEach( ( s ) => document.querySelector( s ).getAnimations().forEach( ( a ) => a.finish() ) ), [ WIPE, BAR ] );
	for ( const sel of [ WIPE, BAR ] ) {
		const h = await clip( page, sel );
		rep.check( 'held', { selector: sel, property: 'visible extent once open (the whole panel)', measured: h.extent, expected: h.height, pass: near( h.extent, h.height, TOLERANCE_PX ) } );
	}
}

async function fallbackCheck( openPage, rep ) {
	const fresh = await openPage();
	await open( fresh.page, [ BAR ] );
	const b = await clip( fresh.page, BAR, 0 );
	rep.check( 'bar-fallback', { selector: BAR, property: 'extent at 0ms with no opener row declared (the stored 100% clip)', measured: b.extent, expected: 0, pass: b.playing && near( b.extent, 0, TOLERANCE_PX ) } );
	rep.control( 'bar-fallback', { selector: BAR, property: 'the same reading against the anchored start', measured: b.extent, expected: ROW, red: ! near( b.extent, ROW, TOLERANCE_PX ) } );
	await fresh.close();
}

async function curtainChecks( page, rep, local ) {
	const rest = await bandAt( page, CURTAIN );
	if ( ! rest.layer ) {
		rep.check( 'curtain', { selector: CURTAIN, pass: null, why: `no curtain layer inside ${ CURTAIN }` } );
		return;
	}
	if ( ! local && ! ( await page.evaluate( hasSheet ) ) ) {
		rep.check( 'curtain', { selector: CURTAIN, pass: null, why: 'assets/css/fx-curtain.css is not enqueued: the curtain fx_effects row (and the regenerated includes/generated-fx-effects.php) is not in place yet' } );
		return;
	}
	rep.control( 'curtain', { selector: CURTAIN, property: 'a sweep before the panel opens', measured: rest.name, expected: null, red: rest.name === null } );
	rep.check( 'curtain-aria-hidden', { selector: CURTAIN, measured: rest.ariaHidden, expected: 'true', pass: rest.ariaHidden === 'true' } );
	await open( page, [ CURTAIN ] );
	for ( const ms of SAMPLES ) {
		const r = await bandAt( page, CURTAIN, ms );
		const inset = r.name ? parseInset( r.clipPath, r.width, r.height ) : null;
		if ( ! inset ) {
			rep.check( `curtain:${ ms }ms`, { selector: CURTAIN, pass: false, why: `no running sweep or an unreadable band clip-path (${ r.clipPath })`, measured: r } );
			continue;
		}
		const got = { left: inset.left / r.width, right: inset.right / r.width };
		const want = expectedBand( ms, 'right' );
		rep.check( `curtain:${ ms }ms`, { selector: CURTAIN, property: `band left and right insets (share of the width) at ${ ms }ms, colour`, measured: { left: +got.left.toFixed( 3 ), right: +got.right.toFixed( 3 ), colour: r.colour, name: r.name }, expected: { ...want, colour: BAND_RGB }, pass: near( got.left, want.left, TOLERANCE_SHARE ) && near( got.right, want.right, TOLERANCE_SHARE ) && r.colour === BAND_RGB } );
		if ( 150 === ms ) {
			const wrong = expectedBand( ms, 'left' );
			rep.control( 'curtain:150ms', { selector: CURTAIN, property: 'the reading against the opposite direction', measured: got, expected: wrong, red: ! ( near( got.left, wrong.left, TOLERANCE_SHARE ) && near( got.right, wrong.right, TOLERANCE_SHARE ) ) } );
		}
	}
	await open( page, [ CURTAIN ], 'close' );
	const closing = await bandAt( page, CURTAIN );
	rep.check( 'curtain-close', { selector: CURTAIN, property: 'the sweep plays back as the panel closes', measured: { name: closing.name, direction: closing.direction }, expected: { name: 'sgs-curtain-right', direction: 'reverse' }, pass: closing.name === 'sgs-curtain-right' && closing.direction === 'reverse' } );
	rep.control( 'curtain-close', { selector: CURTAIN, property: 'the closing reading against a forward sweep', measured: closing.direction, expected: 'normal', red: closing.direction !== 'normal' } );
}

async function hygieneChecks( page, rep ) {
	const styled = await page.evaluate( readStyled, [ WIPE, BAR, CURTAIN, CONTROL ] );
	rep.check( 'no-style', { property: 'panels, layers and descendants carrying a style attribute', measured: styled, expected: [], pass: styled.length === 0 } );
	const planted = await page.evaluate( () => {
		const probe = document.createElement( 'div' );
		probe.setAttribute( 'style', 'color: red' );
		return [ probe ].filter( ( n ) => n.hasAttribute( 'style' ) ).length;
	} );
	rep.control( 'no-style', { property: 'the style-attribute filter run over a planted styled element', measured: planted, expected: 0, red: planted === 1 } );
	await open( page, [ CONTROL ] );
	const c = await page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		return el ? { animations: el.getAnimations( { subtree: true } ).length, layers: el.querySelectorAll( '.sgs-motion-layer' ).length } : null;
	}, CONTROL );
	rep.check( 'control', { selector: CONTROL, property: 'animations and layers with the open state set', measured: c, expected: { animations: 0, layers: 0 }, pass: !! c && c.animations === 0 && c.layers === 0 } );
	const w = await clip( page, WIPE );
	rep.control( 'control', { selector: WIPE, property: 'the open wipe panel read as a control', measured: w.animations, expected: 0, red: w.animations !== 0 } );
}

async function reducedChecks( openPage, rep, local ) {
	const calm = await openPage( { reducedMotion: 'reduce' } );
	await calm.page.addStyleTag( { content: ROW_RULE } );
	await open( calm.page, [ WIPE, BAR, CURTAIN ] );
	const w = await clip( calm.page, WIPE );
	const b = await clip( calm.page, BAR );
	const band = await bandAt( calm.page, CURTAIN );
	const curtainKnown = local || ( await calm.page.evaluate( hasSheet ) );
	rep.check( 'reduced-motion', { property: 'clip animations, visible extents and the band under prefers-reduced-motion: reduce', measured: { wipe: [ w.playing, w.extent ], bar: [ b.playing, b.extent ], band: curtainKnown ? [ band.name, band.display ] : 'fx-curtain.css not enqueued' }, expected: { wipe: [ false, w.height ], bar: [ false, b.height ], band: [ null, 'none' ] }, pass: ! w.playing && ! b.playing && near( w.extent, w.height, TOLERANCE_PX ) && near( b.extent, b.height, TOLERANCE_PX ) && ( ! curtainKnown || ( band.name === null && band.display === 'none' ) ) } );
	await calm.close();
	const live = await openPage( { reducedMotion: 'no-preference' } );
	await open( live.page, [ WIPE ] );
	const moving = await clip( live.page, WIPE, 300 );
	rep.control( 'reduced-motion', { selector: WIPE, property: 'the same open with no preference, at 300ms', measured: moving.extent, expected: moving.height, red: ! near( moving.extent, moving.height, TOLERANCE_PX ) } );
	await live.close();
}

// ---- Self-test --------------------------------------------------------------------------------------------------

function selfTest() {
	const rep = new Reporter( { mode: 'self-test' } );
	const eq = ( id, measured, expected, tol = 1e-6 ) => rep.check( id, { measured, expected, pass: near( measured, expected, tol ) } );
	eq( 'wipe-0', expectedWipe( 0, 320 ), 0 );
	eq( 'wipe-300', expectedWipe( 300, 320 ), 160 );
	eq( 'wipe-600', expectedWipe( 600, 320 ), 320 );
	eq( 'bar-0', expectedBar( 0, 320 ), 64 );
	eq( 'bar-300', expectedBar( 300, 320 ), 192 );
	eq( 'band-150-right', expectedBand( 150 ).right, 0.5 );
	eq( 'band-450-left', expectedBand( 450 ).left, 0.5 );
	eq( 'band-300-covers', expectedBand( 300 ).left + expectedBand( 300 ).right, 0 );
	const a = parseInset( 'inset(0px 50% 0px 0px)', 200, 100 );
	rep.check( 'parse-plain', { measured: a, expected: { top: 0, right: 100, bottom: 0, left: 0 }, pass: !! a && a.right === 100 && a.left === 0 } );
	const b = parseInset( 'inset(0px calc(25% + 10px) 0px)', 200, 100 );
	rep.check( 'parse-calc-three-values', { measured: b, expected: { right: 60, left: 60 }, pass: !! b && b.right === 60 && b.left === 60 && b.bottom === 0 } );
	const c = parseInset( 'inset(0 0 calc(100% - 64px) 0)', 200, 320 );
	rep.check( 'parse-bar-start', { measured: c && c.bottom, expected: 256, pass: !! c && c.bottom === 256 } );
	rep.control( 'parse-garbage', { measured: parseInset( 'circle(10px)', 1, 1 ), expected: 'an inset', red: null === parseInset( 'circle(10px)', 1, 1 ) } );
	rep.control( 'bar-vs-wipe', { measured: expectedBar( 0, 320 ), expected: expectedWipe( 0, 320 ), red: ! near( expectedBar( 0, 320 ), expectedWipe( 0, 320 ), TOLERANCE_PX ) } );
	rep.control( 'band-direction', { measured: expectedBand( 150, 'right' ), expected: expectedBand( 150, 'left' ), red: expectedBand( 150, 'right' ).left !== expectedBand( 150, 'left' ).left } );
	return rep.summary();
}

// ---- Main -------------------------------------------------------------------------------------------------------

async function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const local = argv.includes( '--local' );
	const args = parseArgs( [ 'node', 'probe', ...argv.filter( ( a ) => a !== '--local' ) ] );
	if ( ! local && ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/drawer-entrances.json), --local or --self-test.' );
		process.exit( 1 );
	}
	const url = local ? null : `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m5d`;
	const html = local ? harnessHtml() : null;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: local ? 'local' : 'live' } );
			const openPage = async ( opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				let page;
				if ( local ) {
					page = await openHarness( context, html );
				} else {
					page = await context.newPage();
					await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
				}
				await page.waitForTimeout( 300 );
				return { page, close: () => context.close() };
			};
			const first = await openPage();
			try {
				await clipChecks( first.page, rep );
				await curtainChecks( first.page, rep, local );
				await hygieneChecks( first.page, rep );
				await fallbackCheck( openPage, rep );
				await reducedChecks( openPage, rep, local );
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
