/**
 * Spec 38A FR-38A-37: live acceptance of the ambient-float effect on a deployed site.
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red; a control that does not fails the run):
 *   float-timing      each float's running animation has its stored period, phase (a negative delay), direction and easing
 *   float-samples     the painted `translate` of every float, sampled at three times, equals the value its stored travel,
 *                     period, phase, ease-in-out curve and alternate direction give at that animation time (0.6px)
 *   float-phases      the stored phases differ, and the three 'y' floats sit at different heights in the same frame
 *   float-pause       the pause button exists only where the layer turns it on; pressing it holds the float still and
 *                     pressing it again lets it move
 *   float-focus       keyboard focus inside the block pauses its float; moving focus out lets it run
 *   float-reduced     under prefers-reduced-motion: reduce no float runs an animation or moves
 *
 * NEGATIVE CONTROLS
 *   - timing / samples: float B's readings are judged against float A's stored values: the judge must reject them.
 *   - samples: `translate: none !important` is forced on the floats with an injected rule: the check must fail.
 *   - phases: the judge is run on two readings at one height: it must reject them.
 *   - pause: the same "held still" judge on an unpaused float must fail; float B must have no button.
 *   - focus: before focus the same judge must find the float running.
 *   - reduced: the same judge on the no-preference page must fail (the floats do move there).
 *
 * FIXTURE: tests/fixtures/motion/pages/ambient-float.json, built with scripts/wp-build-page.js. Elements are found by
 * marker class (`.m512-*`); the stored values are read from the fixture tree itself, so the probe and the page share
 * one source.
 *
 * Usage:
 *   node scripts/motion-qa/probe-ambient-float.mjs [--page <id>] [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-ambient-float.mjs --self-test   (offline: the judges)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, parseTranslate, FIXTURE_DIR } from './probe-motion-model-lib.mjs';
import { cubicBezier, loopProgress, storedLayers, launchOptions, passChallenge, judgeRunning } from './probe-loop-lib.mjs';

/** The canary page built from ambient-float.json. */
export const AMBIENT_FLOAT_PAGE = 5297;

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TOLERANCE_PX = 0.6;
const SAMPLE_GAP_MS = 700;
const EASE_IN_OUT = cubicBezier( 0.42, 0, 0.58, 1 );
const FLOATS = [ '.m512-a', '.m512-b', '.m512-c', '.m512-ring', '.m512-focus' ];
const BUTTON = '.sgs-motion-pause';

// ---- Pure judges -----------------------------------------------------------------------------------------------

/** A stored float layer's values with the effect's defaults filled in. */
export function floatSpec( values ) {
	const travel = Number( values.travel ?? 12 );
	return {
		axis: values.axis || 'y',
		travel,
		travelY: Number( values.travelY ?? travel ),
		period: Number( values.period ?? 4200 ),
		phase: Number( values.phase ?? 0 ),
		direction: values.direction || 'alternate',
		easing: values.easing || 'ease-in-out',
		pauseControl: true === values.pauseControl,
	};
}

/** The x and y offset a float paints at an animation's current time. */
export function expectedOffset( spec, currentTime ) {
	const p = EASE_IN_OUT( loopProgress( currentTime, spec.period, spec.phase, spec.direction ) );
	if ( 'x' === spec.axis ) return { x: spec.travel * p, y: 0 };
	if ( 'both' === spec.axis ) return { x: spec.travel * p, y: spec.travelY * p };
	return { x: 0, y: spec.travel * p };
}

/** True when a running animation's timing is the stored timing. */
export function judgeTiming( spec, timing ) {
	return Boolean( timing ) &&
		near( timing.duration, spec.period, 1 ) &&
		near( timing.delay, -spec.phase, 1 ) &&
		timing.direction === spec.direction &&
		timing.easing === spec.easing &&
		timing.iterations === 'Infinity';
}

/** True when every sample's painted offset is the stored formula's value at the sample's animation time. */
export function judgeSamples( spec, samples ) {
	return samples.length >= 3 && samples.every( ( s ) => {
		if ( ! Number.isFinite( s.currentTime ) ) return false;
		const want = expectedOffset( spec, s.currentTime );
		const got = parseTranslate( s.translate );
		return near( got.x, want.x, TOLERANCE_PX ) && near( got.y, want.y, TOLERANCE_PX );
	} );
}

/** True when the 'y' floats sit at different heights in one frame (phases and periods differ, so they never move in step). */
export const judgePhases = ( ys ) => ys.length >= 2 && ys.every( ( y, i ) => ys.every( ( z, j ) => i === j || Math.abs( y - z ) > 0.05 ) );

/** True when two readings taken apart show the element held still. */
export const judgeStill = ( a, b ) => Boolean( a && b ) && a.translate === b.translate && near( a.currentTime, b.currentTime, 1 );

// ---- Page helpers ----------------------------------------------------------------------------------------------

/** The running infinite animation's timing and the painted translate of each selector, read in one frame. */
const READ = ( selectors ) => selectors.map( ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return { sel, missing: true };
	const anim = el.getAnimations().find( ( a ) => a.effect && a.effect.getTiming().iterations === Infinity );
	const t = anim ? anim.effect.getTiming() : null;
	return {
		sel,
		translate: getComputedStyle( el ).translate,
		currentTime: anim ? Number( anim.currentTime ) : null,
		playState: anim ? anim.playState : 'none',
		timing: t ? { duration: Number( t.duration ), delay: t.delay, direction: t.direction, easing: t.easing, iterations: String( t.iterations ) } : null,
		paused: el.hasAttribute( 'data-sgs-loop-paused' ),
	};
} );

/** The element a float's selector names, or its first focusable descendant (a button block's link). */
const focusTarget = ( sel ) => `${ sel } a, ${ sel } button, a${ sel }`;

async function open( ctx, opts = {} ) {
	const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	await page.goto( ctx.url, { waitUntil: 'load' } ).catch( () => page.goto( ctx.url, { waitUntil: 'load' } ) );
	await passChallenge( page );
	await page.waitForTimeout( 800 );
	return { page, close: () => context.close() };
}

const read = ( page, selectors = FLOATS ) => page.evaluate( READ, selectors );

async function sample( page, selectors = FLOATS ) {
	const rows = [];
	for ( let i = 0; i < 3; i++ ) {
		if ( i ) await page.waitForTimeout( SAMPLE_GAP_MS );
		rows.push( await read( page, selectors ) );
	}
	return selectors.map( ( sel, k ) => ( { sel, samples: rows.map( ( r ) => r[ k ] ) } ) );
}

// ---- Live checks -----------------------------------------------------------------------------------------------

async function motionChecks( ctx ) {
	const { rep, specs } = ctx;
	const live = await open( ctx );
	const series = await sample( live.page );
	for ( const { sel, samples } of series ) {
		const spec = specs[ sel ];
		rep.check( 'float-timing', { selector: sel, property: 'Animation.effect.getTiming()', measured: samples[ 0 ].timing, expected: { duration: spec.period, delay: -spec.phase, direction: spec.direction, easing: spec.easing }, pass: judgeTiming( spec, samples[ 0 ].timing ) } );
		const running = judgeRunning( samples.map( ( s ) => ( { ...s, t: s.currentTime } ) ), SAMPLE_GAP_MS, ( s ) => s.translate );
		rep.check( 'float-samples', { selector: sel, property: 'computed translate at three animation times vs the stored formula, with the time advancing', measured: { running, rows: samples.map( ( s ) => ( { t: s.currentTime, translate: s.translate, want: expectedOffset( spec, s.currentTime ) } ) ) }, expected: `running, within ${ TOLERANCE_PX }px`, pass: running && judgeSamples( spec, samples ) } );
	}
	const b = series.find( ( s ) => s.sel === '.m512-b' );
	rep.control( 'float-timing', { selector: '.m512-b', property: "float B's timing judged against float A's stored values", measured: b.samples[ 0 ].timing, expected: 'rejected', red: ! judgeTiming( specs[ '.m512-a' ], b.samples[ 0 ].timing ) } );
	rep.control( 'float-samples', { selector: '.m512-b', property: "float B's samples judged against float A's stored values", measured: b.samples.map( ( s ) => s.translate ), expected: 'rejected', red: ! judgeSamples( specs[ '.m512-a' ], b.samples ) } );

	const ys = [ '.m512-a', '.m512-b', '.m512-c' ].map( ( sel ) => parseTranslate( series.find( ( s ) => s.sel === sel ).samples[ 1 ].translate ).y );
	const phases = [ '.m512-a', '.m512-b', '.m512-c' ].map( ( sel ) => specs[ sel ].phase );
	rep.check( 'float-phases', { selector: '.m512-a, .m512-b, .m512-c', property: 'stored phases, and translate y in one frame', measured: { phases, ys }, expected: 'distinct phases and distinct heights', pass: new Set( phases ).size === phases.length && judgePhases( ys ) } );
	rep.control( 'float-phases', { selector: '.m512-a', property: 'the judge on two readings at one height', measured: [ ys[ 0 ], ys[ 0 ] ], expected: 'rejected', red: ! judgePhases( [ ys[ 0 ], ys[ 0 ] ] ) } );
	await live.close();

	const forced = await open( ctx );
	await forced.page.addStyleTag( { content: '[data-sgs-fx~="ambient-float"]{translate:none !important}' } );
	const forcedSeries = await sample( forced.page, [ '.m512-c' ] );
	await forced.close();
	rep.control( 'float-samples', { selector: '.m512-c', property: 'translate forced to none (author !important)', measured: forcedSeries[ 0 ].samples.map( ( s ) => s.translate ), expected: 'the check fails', red: ! judgeSamples( specs[ '.m512-c' ], forcedSeries[ 0 ].samples ) } );
}

async function pauseChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const { page } = live;
	const buttons = await page.evaluate( ( [ sels, btn ] ) => Object.fromEntries( sels.map( ( s ) => {
		const el = document.querySelector( s );
		const next = el && el.nextElementSibling;
		return [ s, Boolean( ( next && next.matches( btn ) ) || ( el && el.querySelector( btn ) ) ) ];
	} ) ), [ FLOATS, BUTTON ] );
	const want = Object.fromEntries( FLOATS.map( ( s ) => [ s, ctx.specs[ s ].pauseControl ] ) );
	rep.check( 'float-pause', { selector: FLOATS.join( ', ' ), property: 'a pause button beside or inside each float', measured: buttons, expected: want, pass: FLOATS.every( ( s ) => buttons[ s ] === want[ s ] ) } );
	rep.control( 'float-pause', { selector: '.m512-b', property: 'float B (pause control off) has a button', measured: buttons[ '.m512-b' ], expected: false, red: ! buttons[ '.m512-b' ] } );

	const button = page.locator( `.m512-a + ${ BUTTON }` );
	const [ r0 ] = await read( page, [ '.m512-a' ] );
	await page.waitForTimeout( 500 );
	const [ r1 ] = await read( page, [ '.m512-a' ] );
	rep.control( 'float-pause', { selector: '.m512-a', property: 'the held-still judge before the button is pressed', measured: [ r0.translate, r1.translate ], expected: 'rejected (it moves)', red: ! judgeStill( r0, r1 ) } );
	await button.click();
	await page.waitForTimeout( 200 );
	const [ p0 ] = await read( page, [ '.m512-a' ] );
	await page.waitForTimeout( 600 );
	const [ p1 ] = await read( page, [ '.m512-a' ] );
	const pressed = await button.getAttribute( 'aria-pressed' );
	await button.click();
	await page.waitForTimeout( 600 );
	const [ q1 ] = await read( page, [ '.m512-a' ] );
	await live.close();
	rep.check( 'float-pause', { selector: `.m512-a + ${ BUTTON }`, property: 'press: held still; press again: moves', measured: { paused: [ p0.translate, p1.translate, p0.playState ], pressed, resumed: [ p1.currentTime, q1.currentTime, q1.playState ] }, expected: 'still, aria-pressed true, then running', pass: judgeStill( p0, p1 ) && 'paused' === p0.playState && 'true' === pressed && 'running' === q1.playState && q1.currentTime > p1.currentTime } );
}

async function focusChecks( ctx ) {
	const { rep } = ctx;
	const live = await open( ctx );
	const { page } = live;
	const [ before ] = await read( page, [ '.m512-focus' ] );
	await page.focus( focusTarget( '.m512-focus' ) );
	await page.waitForTimeout( 200 );
	const [ f0 ] = await read( page, [ '.m512-focus' ] );
	await page.waitForTimeout( 600 );
	const [ f1 ] = await read( page, [ '.m512-focus' ] );
	await page.evaluate( () => document.activeElement && document.activeElement.blur() );
	await page.waitForTimeout( 600 );
	const [ after ] = await read( page, [ '.m512-focus' ] );
	await live.close();
	rep.check( 'float-focus', { selector: '.m512-focus', property: 'focus inside: held still; focus out: running', measured: { focused: [ f0.translate, f1.translate, f0.playState ], after: after.playState }, expected: 'still while focused, then running', pass: judgeStill( f0, f1 ) && 'paused' === f0.playState && 'running' === after.playState } );
	rep.control( 'float-focus', { selector: '.m512-focus', property: 'the state before focus', measured: before.playState, expected: 'running', red: 'running' === before.playState } );
}

async function reducedChecks( ctx ) {
	const { rep } = ctx;
	const still = ( a, b ) => a.every( ( r, i ) => 'none' === r.playState && r.translate === b[ i ].translate );
	const reduced = await open( ctx, { reducedMotion: 'reduce' } );
	const emulated = await reduced.page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	const a = await read( reduced.page );
	await reduced.page.waitForTimeout( 800 );
	const b = await read( reduced.page );
	await reduced.close();
	rep.check( 'float-reduced', { selector: FLOATS.join( ', ' ), property: 'animations and translate under reduced motion, 800ms apart', measured: { emulated, a: a.map( ( r ) => [ r.playState, r.translate ] ), b: b.map( ( r ) => r.translate ) }, expected: 'emulation on, no animation, no movement', pass: emulated && still( a, b ) } );
	const normal = await open( ctx );
	const c = await read( normal.page );
	await normal.page.waitForTimeout( 800 );
	const d = await read( normal.page );
	await normal.close();
	rep.control( 'float-reduced', { selector: FLOATS.join( ', ' ), property: 'the same judge with no preference', measured: c.map( ( r ) => r.playState ), expected: 'rejected (the floats run)', red: ! still( c, d ) } );
}

// ---- Entry -----------------------------------------------------------------------------------------------------

/** The stored float values per marker class, from the fixture tree. */
export function fixtureSpecs( tree ) {
	const out = {};
	for ( const { className, layer } of storedLayers( tree, 'ambient-float' ) ) out[ `.${ className }` ] = floatSpec( layer.values || {} );
	return out;
}

function selfTest() {
	const failures = [];
	const need = ( name, ok ) => { if ( ! ok ) failures.push( name ); };
	const spec = floatSpec( { travel: -12, period: 2800, phase: 0 } );
	need( 'offset at 0 is 0', near( expectedOffset( spec, 0 ).y, 0, 1e-9 ) );
	need( 'offset at one period is the travel', near( expectedOffset( spec, 2800 ).y, -12, 1e-6 ) );
	need( 'alternate returns', near( expectedOffset( spec, 5600 ).y, 0, 1e-6 ) );
	need( 'midpoint is half', near( expectedOffset( spec, 1400 ).y, -6, 1e-6 ) );
	const phased = floatSpec( { travel: -12, period: 4200, phase: 900 } );
	need( 'phase shifts the curve', near( expectedOffset( phased, 0 ).y, expectedOffset( spec, 0 ).y, 1e-9 ) === false );
	const both = floatSpec( { axis: 'both', travel: 14, travelY: -9, period: 9500 } );
	need( 'both axes', near( expectedOffset( both, 9500 ).x, 14, 1e-6 ) && near( expectedOffset( both, 9500 ).y, -9, 1e-6 ) );
	const good = [ 0, 700, 1400 ].map( ( t ) => ( { currentTime: t, translate: `0px ${ expectedOffset( spec, t ).y }px` } ) );
	need( 'samples accept the formula', judgeSamples( spec, good ) );
	need( 'samples reject none', ! judgeSamples( spec, good.map( ( s ) => ( { ...s, translate: 'none' } ) ) ) );
	need( 'samples reject another spec', ! judgeSamples( phased, good ) );
	need( 'timing', judgeTiming( spec, { duration: 2800, delay: -0, direction: 'alternate', easing: 'ease-in-out', iterations: 'Infinity' } ) && ! judgeTiming( spec, { duration: 4200, delay: -900, direction: 'alternate', easing: 'ease-in-out', iterations: 'Infinity' } ) );
	need( 'phases', judgePhases( [ -1, -5, -9 ] ) && ! judgePhases( [ -1, -1 ] ) );
	need( 'still', judgeStill( { translate: 'a', currentTime: 5 }, { translate: 'a', currentTime: 5 } ) && ! judgeStill( { translate: 'a', currentTime: 5 }, { translate: 'b', currentTime: 600 } ) );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const args = parseArgs( process.argv );
	const pageId = Number( args.pages[ 0 ] ?? AMBIENT_FLOAT_PAGE );
	const tree = JSON.parse( fs.readFileSync( path.join( FIXTURE_DIR, 'ambient-float.json' ), 'utf8' ) );
	const specs = fixtureSpecs( tree );
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ pageId }&cb=m512`;
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, width, url, rep, specs };
			const probe = await open( ctx );
			const missing = await probe.page.evaluate( ( sels ) => sels.filter( ( s ) => ! document.querySelector( `${ s }[data-sgs-fx~="ambient-float"]` ) ), FLOATS );
			await probe.close();
			if ( missing.length ) {
				rep.check( 'ambient-float-fixture', { selector: url, measured: missing, expected: 'every marker carries the ambient-float token', pass: null, why: `markers missing or untokened on page ${ pageId }: ${ missing.join( ', ' ) }` } );
			} else {
				for ( const run of [ motionChecks, pauseChecks, focusChecks, reducedChecks ] ) {
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
