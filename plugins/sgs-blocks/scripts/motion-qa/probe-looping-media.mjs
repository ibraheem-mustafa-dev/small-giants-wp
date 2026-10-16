/**
 * Spec 38A FR-38A-52: live acceptance of the looping media effects on a deployed site.
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red; a control that does not fails the run):
 *   kb-samples     the Ken Burns zoom-out-once image's painted `scale`, sampled at three times, is the stored zoom start
 *                  easing to the stored zoom end over the stored duration (0.003)
 *   kb-hold        at the end of the run the image holds the end zoom
 *   svg-samples    the SVG pulse's painted opacity, sampled at three times, is the stored pulse (1 to 1 - 0.5 x amplitude
 *                  and back over the stored duration, `ease` between the keyframes) within 0.01
 *   loop-pause     each loop over five seconds (the 20s Ken Burns and the 6s pulse) has a pause button; pressing it holds
 *                  the animation's time, pressing again lets it run
 *   lottie-scroll  the Lottie's frame follows the scroll position: at three positions its rotation is 360deg times the
 *                  element's view progress (6deg), and it does not move while the page is still
 *   draw-load      the logo's strokes draw on load from 0 to 100% over the stored duration (power2.inOut: 10% to
 *                  90% drawn takes 0.415 x the duration, within 8%)
 *   media-reduced  under prefers-reduced-motion: reduce nothing animates: no Ken Burns or pulse animation, no Lottie
 *                  player, and the logo is fully drawn and still
 *   media-assets   a page without these effects (the no-motion page) requests none of their scripts
 *
 * NEGATIVE CONTROLS
 *   - kb / svg samples: the readings are judged against other stored values (zoom start 120%, amplitude 2), and a
 *     forced `scale` / `opacity` (author !important) must fail the check.
 *   - kb-hold: the hold judge on the start of the run must fail.
 *   - pause: the held-time judge before the press must fail.
 *   - lottie: the readings are judged against progress + 0.2; two different positions must not read as still.
 *   - draw: the span is judged against 1000ms and 3000ms durations.
 *   - reduced: the same judge on the no-preference page must fail.
 *   - assets: the same listener on the fixture page must see the effects' scripts.
 *
 * FIXTURE: tests/fixtures/motion/pages/looping-media.json, built with scripts/wp-build-page.js; markers `.m513-*`. The
 * stored values are read from the fixture tree.
 *
 * Usage:
 *   node scripts/motion-qa/probe-looping-media.mjs [--page <id>] [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-looping-media.mjs --self-test   (offline: the judges)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, FIXTURE_DIR } from './probe-motion-model-lib.mjs';
import { cubicBezier, loopProgress, storedLayers, launchOptions, passChallenge, judgeRunning } from './probe-loop-lib.mjs';

/** The canary page built from looping-media.json. */
export const LOOPING_MEDIA_PAGE = 5303;
/** The canary page with no motion (the asset-guard reference, shared with probe-motion-model.mjs). */
export const NO_MOTION_PAGE = 5229;

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const KB_ONCE = cubicBezier( 0.16, 1, 0.3, 1 );
const CSS_EASE = cubicBezier( 0.25, 0.1, 0.25, 1 );
const KB = '.m513-kb .sgs-container__image-bg';
const SVG = '.m513-svg .sgs-container__svg-bg';
const LOTTIE = '.m513-lottie';
const LOGO = '.m513-logo';
const ASSETS = [ 'fx-ken-burns', 'fx-svg-loop', 'fx-lottie', 'fx-draw' ];

// ---- Pure judges -----------------------------------------------------------------------------------------------

/** The Ken Burns scale at a time in a zoom-out-once run. */
export const kbScale = ( spec, t ) => ( spec.zoomStart + ( spec.zoomEnd - spec.zoomStart ) * KB_ONCE( Math.min( 1, Math.max( 0, t / spec.duration ) ) ) ) / 100;

/** True when every sample's painted scale is the stored run's value at its animation time. */
export const judgeKb = ( spec, samples ) => samples.length >= 3 && samples.every( ( s ) => Number.isFinite( s.t ) && near( parseFloat( s.scale ), kbScale( spec, s.t ), 0.003 ) );

/** The pulse's opacity at a loop time: 1 to the low point at half the period and back, `ease` on each half. */
export function pulseOpacity( spec, t ) {
	const low = Math.max( 0, 1 - 0.5 * spec.amplitude );
	const p = loopProgress( t, spec.duration, 0, 'normal' );
	return p < 0.5 ? 1 + ( low - 1 ) * CSS_EASE( p * 2 ) : low + ( 1 - low ) * CSS_EASE( ( p - 0.5 ) * 2 );
}

/** True when every sample's painted opacity is the stored pulse at its animation time. */
export const judgePulse = ( spec, samples ) => samples.length >= 3 && samples.every( ( s ) => Number.isFinite( s.t ) && near( parseFloat( s.opacity ), pulseOpacity( spec, s.t ), 0.01 ) );

/** The rotation in degrees (0 to 360) of an SVG `matrix(a,b,c,d,e,f)` transform. */
export function matrixAngle( transform ) {
	const m = /matrix\(\s*([-\d.e]+)[ ,]+([-\d.e]+)/.exec( transform || '' );
	if ( ! m ) return NaN;
	const deg = ( Math.atan2( parseFloat( m[ 2 ] ), parseFloat( m[ 1 ] ) ) * 180 ) / Math.PI;
	return ( deg + 360 ) % 360;
}

/** The smallest difference between two angles in degrees. */
const angleGap = ( a, b ) => Math.abs( ( ( a - b + 540 ) % 360 ) - 180 );

/** True when each reading's rotation is 360deg times its view progress. */
export const judgeLottie = ( rows, shift = 0 ) => rows.length >= 3 && rows.every( ( r ) => Number.isFinite( r.angle ) && angleGap( r.angle, ( ( r.progress + shift ) * 360 ) % 360 ) <= 6 );

/**
 * The drawn span (ms) from 10% to 90% drawn, from timed fractions. The logo paints fully drawn until the script hides
 * its strokes (so a page without the script still shows it), so the span is timed after that reset; fractions are
 * normalised to the fully drawn value, since the length the draw uses can differ slightly from `getTotalLength()`.
 */
export function drawSpan( samples ) {
	const reset = samples.findIndex( ( s ) => s.f <= 0.005 );
	if ( reset < 0 ) return NaN;
	const after = samples.slice( reset );
	const full = Math.max( ...after.map( ( s ) => s.f ) );
	if ( ! ( full > 0 ) ) return NaN;
	const at = ( level ) => {
		const i = after.findIndex( ( s ) => s.f / full >= level );
		if ( i < 1 ) return NaN;
		const a = after[ i - 1 ];
		const b = after[ i ];
		const fa = a.f / full;
		const fb = b.f / full;
		return a.t + ( ( level - fa ) / ( fb - fa || 1 ) ) * ( b.t - a.t );
	};
	return at( 0.9 ) - at( 0.1 );
}

/** The 10% to 90% share of a power2.inOut draw (GSAP's power2 is cubic: 4t^3 to the midpoint): 1 - 2 x cbrt(0.025). */
const DRAW_SHARE = 1 - 2 * Math.cbrt( 0.025 );

/** True when a drawn span fits a power2.inOut draw of the given duration (within 8% of the duration). */
export const judgeDraw = ( span, duration ) => Number.isFinite( span ) && Math.abs( span - DRAW_SHARE * duration ) <= 0.08 * duration;

/** True when an animation held its time across two reads. */
export const judgeHeld = ( a, b ) => Number.isFinite( a ) && Number.isFinite( b ) && Math.abs( a - b ) < 1;

// ---- Page helpers ----------------------------------------------------------------------------------------------

/** Records the logo's drawn fraction every frame from the first paint, so the draw is caught from its start. */
const RECORD_DRAW = () => {
	window.__sgsDraw = [];
	const tick = ( now ) => {
		const shapes = document.querySelectorAll( '.m513-logo svg path, .m513-logo svg circle, .m513-logo svg line' );
		if ( shapes.length ) {
			const el = shapes[ 0 ];
			const total = el.getTotalLength();
			const dash = getComputedStyle( el ).strokeDasharray;
			const first = 'none' === dash ? total : parseFloat( dash );
			window.__sgsDraw.push( { t: now, f: total > 0 ? Math.min( 1, first / total ) : 0 } );
		}
		if ( now < 30000 ) requestAnimationFrame( tick );
	};
	requestAnimationFrame( tick );
};

async function open( ctx, opts = {}, url = ctx.url ) {
	const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	await page.addInitScript( RECORD_DRAW );
	await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
	await passChallenge( page );
	await page.waitForTimeout( 600 );
	return { page, close: () => context.close() };
}

/** The first animation of an element, its current time, and its painted scale and opacity. */
const READ = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return { missing: true };
	const anim = el.getAnimations()[ 0 ];
	const cs = getComputedStyle( el );
	return { t: anim ? Number( anim.currentTime ) : NaN, state: anim ? anim.playState : 'none', duration: anim ? Number( anim.effect.getTiming().duration ) : NaN, scale: cs.scale, opacity: cs.opacity };
};

async function samples( page, sel, gap = 700 ) {
	const rows = [];
	for ( let i = 0; i < 3; i++ ) {
		if ( i ) await page.waitForTimeout( gap );
		rows.push( await page.evaluate( READ, sel ) );
	}
	return rows;
}

/** Scroll so the Lottie's top sits at a fraction of the viewport, and read its rotation and view progress. */
async function lottieAt( page, fraction ) {
	await page.evaluate( ( [ s, f ] ) => {
		const el = document.querySelector( s );
		window.scrollTo( { top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * ( 1 - f ), behavior: 'instant' } );
	}, [ LOTTIE, fraction ] );
	await page.waitForTimeout( 400 );
	// A one-pixel nudge fires a scroll event once the player has settled at this position, so the frame read is the one
	// the scroll listener sets for the final geometry.
	await page.evaluate( () => window.scrollBy( 0, 1 ) );
	await page.waitForTimeout( 400 );
	return page.evaluate( ( s ) => {
		const el = document.querySelector( s );
		const rect = el.getBoundingClientRect();
		const g = el.querySelector( 'svg g g' );
		return { svg: Boolean( el.querySelector( 'svg' ) ), transform: g ? g.getAttribute( 'transform' ) : null, progress: Math.min( 1, Math.max( 0, ( window.innerHeight - rect.top ) / ( window.innerHeight + rect.height ) ) ) };
	}, LOTTIE );
}

// ---- Live checks -----------------------------------------------------------------------------------------------

async function kbChecks( ctx ) {
	const { rep, specs } = ctx;
	const spec = specs.kb;
	const live = await open( ctx );
	const rows = await samples( live.page, KB );
	const kbRunning = judgeRunning( rows, 700, ( r ) => r.scale );
	rep.check( 'kb-samples', { selector: KB, property: 'computed scale at three animation times vs the stored zoom-out-once, with the time advancing', measured: { running: kbRunning, rows: rows.map( ( r ) => ( { t: r.t, scale: r.scale, want: kbScale( spec, r.t ), duration: r.duration } ) ) }, expected: `running, ${ spec.zoomStart }% to ${ spec.zoomEnd }% over ${ spec.duration }ms`, pass: kbRunning && judgeKb( spec, rows ) && near( rows[ 0 ].duration, spec.duration, 1 ) } );
	rep.control( 'kb-samples', { selector: KB, property: 'the readings judged against a 120% zoom start', measured: rows.map( ( r ) => r.scale ), expected: 'rejected', red: ! judgeKb( { ...spec, zoomStart: 120 }, rows ) } );

	const start = await live.page.evaluate( READ, KB );
	await live.page.evaluate( ( [ s, d ] ) => {
		const a = document.querySelector( s ).getAnimations()[ 0 ];
		if ( a ) a.currentTime = d;
	}, [ KB, spec.duration ] );
	await live.page.waitForTimeout( 600 );
	const end = await live.page.evaluate( READ, KB );
	await live.close();
	// The end zoom of 100% is also the channel's initial value, so the scale alone cannot tell a held last frame from an
	// animation that ended and dropped away; a held run is still attached and finished.
	const holds = ( r ) => near( parseFloat( r.scale ), spec.zoomEnd / 100, 0.001 ) && 'finished' === r.state;
	rep.check( 'kb-hold', { selector: KB, property: 'scale and play state after the run ends', measured: { scale: end.scale, state: end.state }, expected: { scale: spec.zoomEnd / 100, state: 'finished' }, pass: holds( end ) } );
	rep.control( 'kb-hold', { selector: KB, property: 'the hold judge early in the run', measured: start.scale, expected: 'rejected', red: ! holds( start ) } );

	const forced = await open( ctx );
	await forced.page.addStyleTag( { content: '.m513-kb .sgs-container__image-bg{scale:1.08 !important}' } );
	const forcedRows = await samples( forced.page, KB );
	await forced.close();
	rep.control( 'kb-samples', { selector: KB, property: 'scale forced to 1.08 (author !important)', measured: forcedRows.map( ( r ) => r.scale ), expected: 'the check fails', red: ! judgeKb( spec, forcedRows ) } );
}

async function svgChecks( ctx ) {
	const { rep, specs } = ctx;
	const spec = specs.svg;
	const live = await open( ctx );
	const rows = await samples( live.page, SVG, 900 );
	await live.close();
	const svgRunning = judgeRunning( rows, 900, ( r ) => r.opacity );
	rep.check( 'svg-samples', { selector: SVG, property: 'computed opacity at three animation times vs the stored pulse, with the time advancing', measured: { running: svgRunning, rows: rows.map( ( r ) => ( { t: r.t, opacity: r.opacity, want: pulseOpacity( spec, r.t ), duration: r.duration } ) ) }, expected: `running, amplitude ${ spec.amplitude } over ${ spec.duration }ms within 0.01`, pass: svgRunning && judgePulse( spec, rows ) && near( rows[ 0 ].duration, spec.duration, 1 ) } );
	rep.control( 'svg-samples', { selector: SVG, property: 'the readings judged against amplitude 2', measured: rows.map( ( r ) => r.opacity ), expected: 'rejected', red: ! judgePulse( { ...spec, amplitude: 2 }, rows ) } );
	const forced = await open( ctx );
	await forced.page.addStyleTag( { content: '.m513-svg .sgs-container__svg-bg{opacity:1 !important}' } );
	const forcedRows = await samples( forced.page, SVG, 900 );
	await forced.close();
	rep.control( 'svg-samples', { selector: SVG, property: 'opacity forced to 1 (author !important)', measured: forcedRows.map( ( r ) => r.opacity ), expected: 'the check fails', red: ! judgePulse( spec, forcedRows ) } );
}

async function pauseChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const { page } = live;
	for ( const [ block, target ] of [ [ '.m513-kb', KB ], [ '.m513-svg', SVG ] ] ) {
		await page.evaluate( ( s ) => document.querySelector( s ).scrollIntoView( { block: 'center' } ), block );
		await page.waitForTimeout( 600 );
		const button = page.locator( `${ block } .sgs-motion-pause, ${ block } + .sgs-motion-pause` ).first();
		const present = ( await button.count() ) > 0;
		const a = await page.evaluate( READ, target );
		await page.waitForTimeout( 500 );
		const b = await page.evaluate( READ, target );
		rep.control( 'loop-pause', { selector: target, property: 'the held-time judge before the press', measured: [ a.t, b.t ], expected: 'rejected (time runs)', red: ! judgeHeld( a.t, b.t ) } );
		let held = null;
		let resumed = null;
		if ( present ) {
			await button.click();
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.waitForTimeout( 200 );
			const p0 = await page.evaluate( READ, target );
			await page.waitForTimeout( 600 );
			const p1 = await page.evaluate( READ, target );
			await button.click();
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.waitForTimeout( 600 );
			const q = await page.evaluate( READ, target );
			held = [ p0.t, p1.t, p0.state ];
			resumed = [ q.t, q.state ];
		}
		rep.check( 'loop-pause', { selector: target, property: 'the pause button: press holds the time, press again runs it', measured: { present, held, resumed }, expected: 'present, held, then running', pass: present && judgeHeld( held[ 0 ], held[ 1 ] ) && 'paused' === held[ 2 ] && 'running' === resumed[ 1 ] && resumed[ 0 ] > held[ 1 ] } );
	}
	await live.close();
}

async function lottieChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	// Warm up: the first time the Lottie enters view it fetches its file and the player; wait for the player to mount.
	await lottieAt( live.page, 0.3 );
	await live.page.waitForFunction( ( s ) => Boolean( document.querySelector( s ).querySelector( 'svg g g' ) ), LOTTIE, { timeout: 20000 } ).catch( () => {} );
	const rows = [];
	for ( const f of [ 0.3, 0.5, 0.7 ] ) {
		const r = await lottieAt( live.page, f );
		rows.push( { ...r, angle: matrixAngle( r.transform ) } );
	}
	await live.page.waitForTimeout( 1000 );
	const again = await live.page.evaluate( ( s ) => {
		const g = document.querySelector( s ).querySelector( 'svg g g' );
		return g ? g.getAttribute( 'transform' ) : null;
	}, LOTTIE );
	await live.close();
	rep.check( 'lottie-scroll', { selector: LOTTIE, property: 'rotation at three scroll positions vs 360deg x view progress; unchanged while the page is still', measured: { rows: rows.map( ( r ) => ( { progress: r.progress, angle: r.angle } ) ), still: [ rows[ 2 ].transform, again ] }, expected: 'within 6deg, and still', pass: judgeLottie( rows ) && again === rows[ 2 ].transform } );
	rep.control( 'lottie-scroll', { selector: LOTTIE, property: 'the readings judged against progress + 0.2', measured: rows.map( ( r ) => r.angle ), expected: 'rejected', red: ! judgeLottie( rows, 0.2 ) } );
	rep.control( 'lottie-scroll', { selector: LOTTIE, property: 'two scroll positions compared as still', measured: [ rows[ 0 ].transform, rows[ 2 ].transform ], expected: 'different', red: rows[ 0 ].transform !== rows[ 2 ].transform } );
}

async function drawChecks( ctx ) {
	const { rep, specs } = ctx;
	const live = await open( ctx );
	await live.page.waitForFunction( () => ( window.__sgsDraw || [] ).some( ( s, i, all ) => s.f >= 0.999 && all.slice( 0, i ).some( ( r ) => r.f <= 0.005 ) ), null, { timeout: specs.draw.duration + 15000 } ).catch( () => {} );
	const series = await live.page.evaluate( () => window.__sgsDraw || [] );
	await live.close();
	const span = drawSpan( series );
	const measured = { span, first: series[ 0 ] && series[ 0 ].f, last: series.length && series[ series.length - 1 ].f, frames: series.length };
	if ( ! Number.isFinite( span ) ) {
		rep.check( 'draw-load', { selector: LOGO, property: 'drawn fraction from the first paint', measured, expected: 'hidden by the script, then drawn', pass: false } );
		return;
	}
	rep.check( 'draw-load', { selector: LOGO, property: '10% to 90% drawn (ms)', measured, expected: `${ Math.round( DRAW_SHARE * specs.draw.duration ) }ms within ${ 0.08 * specs.draw.duration }`, pass: judgeDraw( span, specs.draw.duration ) && measured.last >= 0.999 } );
	rep.control( 'draw-load', { selector: LOGO, property: 'the span judged against 1000ms and 3000ms durations', measured: span, expected: 'both rejected', red: ! judgeDraw( span, 1000 ) && ! judgeDraw( span, 3000 ) } );
}

async function reducedChecks( ctx ) {
	const { rep } = ctx;
	const read = async ( opts ) => {
		const v = await open( ctx, opts );
		const emulated = await v.page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
		const kb = await v.page.evaluate( READ, KB );
		const svg = await v.page.evaluate( READ, SVG );
		await v.page.waitForTimeout( 2600 );
		const logo = await v.page.evaluate( ( s ) => [ ...document.querySelectorAll( `${ s } svg path, ${ s } svg circle, ${ s } svg line` ) ].map( ( e ) => {
			const dash = getComputedStyle( e ).strokeDasharray;
			return 'none' === dash || parseFloat( dash ) >= e.getTotalLength() - 0.5;
		} ), LOGO );
		const series = await v.page.evaluate( () => window.__sgsDraw || [] );
		const lottie = await lottieAt( v.page, 0.5 );
		await v.close();
		return { emulated, kb: kb.state, svg: svg.state, logoDrawn: logo.length > 0 && logo.every( Boolean ), drawMoved: series.some( ( s ) => s.f < 0.999 ), lottie: lottie.svg };
	};
	const still = ( r ) => 'none' === r.kb && 'none' === r.svg && r.logoDrawn && ! r.drawMoved && ! r.lottie;
	const reduced = await read( { reducedMotion: 'reduce' } );
	rep.check( 'media-reduced', { selector: `${ KB }, ${ SVG }, ${ LOTTIE }, ${ LOGO }`, property: 'animations, the Lottie player and the logo strokes under reduced motion', measured: reduced, expected: 'emulation on; nothing animates, no player, the logo drawn and still', pass: reduced.emulated && still( reduced ) } );
	const normal = await read( {} );
	rep.control( 'media-reduced', { selector: `${ KB }, ${ SVG }, ${ LOTTIE }, ${ LOGO }`, property: 'the same judge with no preference', measured: normal, expected: 'rejected', red: ! still( normal ) } );
}

async function assetChecks( ctx ) {
	const { rep, base, pageId } = ctx;
	const load = async ( id ) => {
		const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT } } );
		const page = await context.newPage();
		const seen = [];
		page.on( 'request', ( r ) => seen.push( r.url() ) );
		await page.goto( `${ base }/?p=${ id }&cb=m513`, { waitUntil: 'load' } );
		await passChallenge( page );
		await page.evaluate( () => window.scrollTo( { top: document.documentElement.scrollHeight, behavior: 'instant' } ) );
		await page.waitForTimeout( 1500 );
		await context.close();
		return ASSETS.filter( ( a ) => seen.some( ( u ) => u.includes( a ) ) );
	};
	const none = await load( NO_MOTION_PAGE );
	rep.check( 'media-assets', { selector: `page ${ NO_MOTION_PAGE }`, property: `requests naming ${ ASSETS.join( ', ' ) }`, measured: none, expected: [], pass: 0 === none.length } );
	const some = await load( pageId );
	rep.control( 'media-assets', { selector: `page ${ pageId }`, property: 'the same listener on the fixture page', measured: some, expected: ASSETS, red: ASSETS.every( ( a ) => some.includes( a ) ) } );
}

// ---- Entry -----------------------------------------------------------------------------------------------------

/** The stored values the probe judges against, from the fixture tree. */
export function fixtureSpecs( tree ) {
	const one = ( effect ) => ( storedLayers( tree, effect )[ 0 ] || { layer: { values: {} } } ).layer.values || {};
	const kb = one( 'ken-burns' );
	const svg = one( 'svg-loop' );
	const draw = one( 'draw' );
	return {
		kb: { zoomStart: Number( kb.zoomStart ?? 108 ), zoomEnd: Number( kb.zoomEnd ?? 100 ), duration: Number( kb.duration ?? 20000 ) },
		svg: { amplitude: Number( svg.amplitude ?? 1 ), duration: Number( svg.duration ?? 3000 ) },
		draw: { duration: Number( draw.duration ?? 1000 ) },
	};
}

function selfTest() {
	const failures = [];
	const need = ( name, ok ) => { if ( ! ok ) failures.push( name ); };
	const kb = { zoomStart: 108, zoomEnd: 100, duration: 20000 };
	need( 'kb start and end', near( kbScale( kb, 0 ), 1.08, 1e-9 ) && near( kbScale( kb, 20000 ), 1, 1e-9 ) && near( kbScale( kb, 99999 ), 1, 1e-9 ) );
	const kbRows = [ 1000, 1700, 2400 ].map( ( t ) => ( { t, scale: String( kbScale( kb, t ) ) } ) );
	need( 'kb judge', judgeKb( kb, kbRows ) && ! judgeKb( { ...kb, zoomStart: 120 }, kbRows ) && ! judgeKb( kb, kbRows.map( ( r ) => ( { ...r, scale: '1.08' } ) ) ) );
	const svg = { amplitude: 1, duration: 6000 };
	need( 'pulse shape', near( pulseOpacity( svg, 0 ), 1, 1e-9 ) && near( pulseOpacity( svg, 3000 ), 0.5, 1e-9 ) && near( pulseOpacity( svg, 6000 ), 1, 1e-9 ) );
	const svgRows = [ 500, 1400, 2300 ].map( ( t ) => ( { t, opacity: String( pulseOpacity( svg, t ) ) } ) );
	need( 'pulse judge', judgePulse( svg, svgRows ) && ! judgePulse( { ...svg, amplitude: 2 }, svgRows ) );
	need( 'angle', near( matrixAngle( 'matrix(1,0,0,1,100,100)' ), 0, 1e-9 ) && near( matrixAngle( 'matrix(-0.9454,-0.3258,0.3258,-0.9454,100,100)' ), 199, 0.5 ) );
	const lot = [ 0.1, 0.4, 0.55 ].map( ( p ) => ( { progress: p, angle: ( p * 360 ) % 360 } ) );
	need( 'lottie judge', judgeLottie( lot ) && ! judgeLottie( lot, 0.2 ) );
	const ease = ( t ) => ( t < 0.5 ? 4 * t * t * t : 1 - 4 * ( 1 - t ) ** 3 );
	const series = Array.from( { length: 160 }, ( _, i ) => ( { t: i * 16.7, f: i * 16.7 < 200 ? 0 : ease( Math.min( 1, ( i * 16.7 - 200 ) / 2000 ) ) } ) );
	const span = drawSpan( series );
	need( 'draw judge', judgeDraw( span, 2000 ) && ! judgeDraw( span, 1000 ) && ! judgeDraw( span, 3000 ) );
	need( 'draw needs a reset', Number.isNaN( drawSpan( [ { t: 0, f: 1 }, { t: 10, f: 1 } ] ) ) );
	need( 'draw times from the reset', judgeDraw( drawSpan( [ { t: 0, f: 1 }, { t: 5, f: 1 }, ...series ].map( ( r, i ) => ( i < 2 ? r : { ...r, t: r.t + 10 } ) ) ), 2000 ) );
	need( 'held', judgeHeld( 5, 5.2 ) && ! judgeHeld( 5, 600 ) );
	need( 'running', judgeRunning( [ { t: 0, v: 'a' }, { t: 700, v: 'b' } ], 700, ( s ) => s.v ) && ! judgeRunning( [ { t: 5, v: 'a' }, { t: 5, v: 'a' } ], 700, ( s ) => s.v ) );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const args = parseArgs( process.argv );
	const pageId = Number( args.pages[ 0 ] ?? LOOPING_MEDIA_PAGE );
	const specs = fixtureSpecs( JSON.parse( fs.readFileSync( path.join( FIXTURE_DIR, 'looping-media.json' ), 'utf8' ) ) );
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ pageId }&cb=m513`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, width, base, url, rep, specs, pageId };
			const probe = await open( ctx );
			const missing = await probe.page.evaluate( ( sels ) => sels.filter( ( s ) => ! document.querySelector( s ) ), [ KB, SVG, LOTTIE, LOGO ] );
			await probe.close();
			if ( missing.length ) {
				rep.check( 'looping-media-fixture', { selector: url, measured: missing, expected: 'every marker present', pass: null, why: `markers missing from page ${ pageId }: ${ missing.join( ', ' ) }` } );
			} else {
				for ( const run of [ kbChecks, svgChecks, pauseChecks, lottieChecks, drawChecks, reducedChecks, assetChecks ] ) {
					try {
						await run( ctx );
					} catch ( e ) {
						rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
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
