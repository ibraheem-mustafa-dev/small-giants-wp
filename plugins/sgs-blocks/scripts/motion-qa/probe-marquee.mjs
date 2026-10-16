/**
 * Spec 38A FR-38A-44: live acceptance of the shared marquee on a deployed site, against three reference drafts' marquees.
 *
 * WHAT IT MEASURES (each check has a negative control that must come out red; a control that does not fails the run):
 *   marquee-one-runtime  `git grep` finds one marquee runtime under plugins/sgs-blocks/src (offline)
 *   marquee-range        at this width each marquee runs or stays a static row as its stored range says
 *   marquee-rate         the painted speed, measured from the set's on-screen position over time, against the draft:
 *                        a 45px/s strip; a 24s loop; a 64s loop; a 30s ticker (all within 2%).
 *                        The pitch is measured as the distance between the set and its first copy.
 *   marquee-hover        a mouse over the block runs the 45px/s strip at 0.15x (within 5%) and holds the others still
 *   marquee-touch        a touch tap holds the 24s loop still and a second tap lets it run
 *   marquee-fade         the 45px/s strip paints a mask that fades its ends over 5%
 *   marquee-pause        every running marquee has a pause button; pressing it holds the row still, pressing again lets it run
 *   marquee-reduced      under prefers-reduced-motion: reduce nothing is cloned or moves
 *
 * NEGATIVE CONTROLS
 *   - one-runtime: the same search must find the runtime file itself (a search that finds nothing is not proof).
 *   - range: the control trust bar (no marquee) must never run.
 *   - rate: the 45px/s strip's reading is judged against 50px/s, and a row whose copies have `translate: none !important` forced
 *     must fail the rate check.
 *   - hover: the rate before the pointer arrives must not pass as the hover rate.
 *   - touch / pause: the held-still judge on the running row must fail.
 *   - fade: the control trust bar must have no mask, and a fade width planted as 12 before boot must fail the check.
 *   - rate: the row run at 1.05x its playback rate must fail the 2% judge.
 *   - touch: the tap is a synthetic touch PointerEvent (Firefox's touch emulation is not dependable).
 *   - reduced: the same judge on the no-preference page must fail.
 *
 * FIXTURE: tests/fixtures/motion/pages/marquee.json, built with scripts/wp-build-page.js. Blocks are found by marker class.
 *
 * Usage:
 *   node scripts/motion-qa/probe-marquee.mjs [--page <id>] [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node scripts/motion-qa/probe-marquee.mjs --self-test   (offline: the judges)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { execFileSync } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, near, REPO } from './probe-motion-model-lib.mjs';
import { launchOptions, passChallenge } from './probe-loop-lib.mjs';

/** The canary page built from marquee.json. */
export const MARQUEE_PAGE = 5305;

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const TOLERANCE = 0.02;
const HOVER_TOLERANCE = 0.05;
const SAMPLE_MS = 1500;

/** The drafts' marquees: what each fixture block must measure. `below` is the widest viewport it runs at. */
export const DRAFTS = {
	'.m515-speed': { speed: 45, hoverRate: 0.15, fade: 5, below: Infinity },
	'.m515-loop24': { loopSeconds: 24, hoverRate: 0, touch: true, below: 1023 },
	'.m515-loop64': { loopSeconds: 64, hoverRate: 0, below: Infinity },
	'.m515-ticker': { loopSeconds: 30, hoverRate: 0, below: 767 },
};
const CONTROL = '.m515-control';

// ---- Pure judges -----------------------------------------------------------------------------------------------

/**
 * The speed in px/s from timed positions of a leftward row, ignoring the frames where the loop wrapped back.
 *
 * @param {{t: number, x: number}[]} points Timestamps (ms) and the set's left edge (px).
 * @return {number} px/s, 0 when the row did not move.
 */
export function velocity( points ) {
	let dx = 0;
	let dt = 0;
	for ( let i = 1; i < points.length; i++ ) {
		const step = points[ i - 1 ].x - points[ i ].x;
		const time = points[ i ].t - points[ i - 1 ].t;
		if ( step < 0 || time <= 0 ) continue;
		dx += step;
		dt += time;
	}
	return dt > 0 ? ( dx / dt ) * 1000 : 0;
}

/** True when a reading matches its draft within 2%: the speed for a px/s draft, else pitch / speed against the loop time. */
export function judgeRate( draft, reading ) {
	if ( ! reading || ! ( reading.speed > 0 ) ) return false;
	if ( draft.speed ) return Math.abs( reading.speed - draft.speed ) <= draft.speed * TOLERANCE;
	const seconds = reading.pitch / reading.speed;
	return Math.abs( seconds - draft.loopSeconds ) <= draft.loopSeconds * TOLERANCE;
}

/** True when the hovered speed is the draft's hover rate times the free speed. */
export function judgeHover( draft, free, hovered ) {
	if ( ! ( free > 0 ) ) return false;
	if ( 0 === draft.hoverRate ) return hovered < 0.5;
	return near( hovered / free, draft.hoverRate, draft.hoverRate * HOVER_TOLERANCE );
}

/** True when a row is held still. */
export const judgeStill = ( speed ) => Number.isFinite( speed ) && speed < 0.5;

/**
 * True when a computed mask fades both ends over the given percentage: a gradient whose first and last stops are
 * transparent and whose first opaque stop sits at exactly that percentage.
 */
export function judgeFade( mask, percent ) {
	if ( typeof mask !== 'string' || ! /gradient/.test( mask ) ) return false;
	const transparent = ( mask.match( /transparent|rgba\(0, 0, 0, 0\)/g ) || [] ).length;
	const stop = /(?:#000|rgb\(0, 0, 0\))\s+(-?\d*\.?\d+)%/.exec( mask );
	return transparent >= 2 && Boolean( stop ) && Math.abs( parseFloat( stop[ 1 ] ) - percent ) < 0.01;
}

/** Whether a marquee should run at a viewport width. */
export const shouldRun = ( draft, width ) => width <= draft.below;

// ---- Page helpers ----------------------------------------------------------------------------------------------

async function open( ctx, opts = {}, init = null ) {
	const context = await ctx.browser.newContext( { viewport: { width: ctx.width, height: HEIGHT }, ...opts } );
	const page = await context.newPage();
	if ( init ) await page.addInitScript( init );
	await page.goto( ctx.url, { waitUntil: 'load' } ).catch( () => page.goto( ctx.url, { waitUntil: 'load' } ) );
	await passChallenge( page );
	await page.waitForTimeout( 2000 );
	return { page, close: () => context.close() };
}

/** Bring a block into view (loops pause off screen) and let the scroll settle. */
async function bringIntoView( page, sel ) {
	await page.evaluate( ( s ) => {
		const el = document.querySelector( s );
		const top = el.getBoundingClientRect().top + window.scrollY - 120;
		window.scrollTo( { top: Math.max( 0, top ), behavior: 'instant' } );
	}, sel );
	await page.waitForTimeout( 900 );
	// A late image or a relayout rebuilds the loop; wait until the pitch reads the same twice, 300ms apart.
	const pitch = () => page.evaluate( ( s ) => {
		const root = document.querySelector( s );
		const set = root && root.querySelector( '[data-sgs-marquee-set]' );
		const clone = root && root.querySelector( '[data-sgs-marquee-clone]' );
		return set && clone ? Math.round( clone.getBoundingClientRect().left - set.getBoundingClientRect().left ) : 0;
	}, sel );
	let last = await pitch();
	for ( let i = 0; i < 10; i++ ) {
		await page.waitForTimeout( 300 );
		const now = await pitch();
		if ( now === last ) break;
		last = now;
	}
}

/** The block's run state, its pitch, and the set's left edge sampled every frame for `ms`. */
const MEASURE = ( [ sel, ms ] ) => new Promise( ( resolve ) => {
	const root = document.querySelector( sel );
	const set = root && root.querySelector( '[data-sgs-marquee-set]' );
	const clone = root && root.querySelector( '[data-sgs-marquee-clone]' );
	const base = {
		on: Boolean( root && 'on' === root.getAttribute( 'data-sgs-marquee' ) ),
		clones: root ? root.querySelectorAll( '[data-sgs-marquee-clone]' ).length : 0,
		pitch: set && clone ? clone.getBoundingClientRect().left - set.getBoundingClientRect().left : 0,
		mask: root ? ( getComputedStyle( root ).maskImage || getComputedStyle( root ).webkitMaskImage || '' ) : '',
	};
	if ( ! set ) {
		resolve( { ...base, points: [] } );
		return;
	}
	const points = [];
	const t0 = performance.now();
	let done = false;
	const finish = () => {
		if ( ! done ) {
			done = true;
			resolve( { ...base, points } );
		}
	};
	// A throttled frame loop must not hang the probe: the timer ends the sample whatever the frames did.
	setTimeout( finish, ms + 1000 );
	const step = ( now ) => {
		points.push( { t: now, x: set.getBoundingClientRect().left } );
		if ( now - t0 < ms ) requestAnimationFrame( step );
		else finish();
	};
	requestAnimationFrame( step );
} );

async function measure( page, sel, ms = SAMPLE_MS ) {
	const r = await page.evaluate( MEASURE, [ sel, ms ] );
	return { on: r.on, clones: r.clones, pitch: r.pitch, mask: r.mask, speed: velocity( r.points ), frames: r.points.length };
}

const pauseButton = ( page, sel ) => page.locator( `${ sel } .sgs-motion-pause, ${ sel } + .sgs-motion-pause` ).first();

// ---- Checks ----------------------------------------------------------------------------------------------------

function runtimeCheck( rep ) {
	const grep = ( pattern ) => {
		try {
			return execFileSync( 'git', [ 'grep', '-l', pattern, '--', 'plugins/sgs-blocks/src' ], { cwd: REPO, encoding: 'utf8' } ).split( '\n' ).filter( ( f ) => f && ! /\.test\.js$|__tests__/.test( f ) );
		} catch {
			return [];
		}
	};
	const runtimes = grep( "querySelector( SET )\\|createMarquee\\|marquee.*\\.animate(" ).filter( ( f ) => f.endsWith( '.js' ) );
	rep.check( 'marquee-one-runtime', { selector: 'plugins/sgs-blocks/src', property: 'files that run a marquee', measured: runtimes, expected: [ 'plugins/sgs-blocks/src/shared/effects/fx-marquee.js' ], pass: 1 === runtimes.length && runtimes[ 0 ].endsWith( 'src/shared/effects/fx-marquee.js' ) } );
	rep.control( 'marquee-one-runtime', { selector: 'plugins/sgs-blocks/src', property: 'the same search finds the runtime', measured: runtimes.length, expected: 'at least one', red: runtimes.length > 0 } );
}

async function liveChecks( ctx ) {
	const { rep, width } = ctx;
	const live = await open( ctx );
	const { page } = live;
	for ( const [ sel, draft ] of Object.entries( DRAFTS ) ) {
		await bringIntoView( page, sel );
		const r = await measure( page, sel );
		const run = shouldRun( draft, width );
		rep.check( 'marquee-range', { selector: sel, property: 'data-sgs-marquee="on", copies and movement', measured: { on: r.on, clones: r.clones, speed: r.speed }, expected: run ? 'running' : 'a static row', pass: run ? r.on && r.clones > 0 && r.speed > 0.5 : ! r.on && 0 === r.clones && judgeStill( r.speed ) } );
		if ( ! run ) continue;

		rep.check( 'marquee-rate', { selector: sel, property: draft.speed ? 'px/s' : 'pitch / px/s in seconds', measured: { speed: r.speed, pitch: r.pitch, seconds: r.pitch / r.speed, frames: r.frames }, expected: draft.speed ? `${ draft.speed }px/s within 2%` : `${ draft.loopSeconds }s within 2%`, pass: judgeRate( draft, r ) } );
		if ( draft.speed ) rep.control( 'marquee-rate', { selector: sel, property: 'the same reading judged against 50px/s', measured: r.speed, expected: 'rejected', red: ! judgeRate( { speed: 50 }, r ) } );
		if ( draft.fade ) {
			rep.check( 'marquee-fade', { selector: sel, property: 'computed mask-image', measured: r.mask, expected: `transparent at both ends over ${ draft.fade }%`, pass: judgeFade( r.mask, draft.fade ) } );
		}

		const box = await page.locator( sel ).boundingBox();
		await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
		await page.waitForTimeout( 300 );
		const hovered = await measure( page, sel, 1000 );
		await page.mouse.move( 2, 2 );
		await page.waitForTimeout( 300 );
		rep.check( 'marquee-hover', { selector: sel, property: 'speed with a mouse over the block / free speed', measured: { free: r.speed, hovered: hovered.speed, ratio: hovered.speed / r.speed }, expected: draft.hoverRate ? `${ draft.hoverRate }x` : 'held still', pass: judgeHover( draft, r.speed, hovered.speed ) } );
		rep.control( 'marquee-hover', { selector: sel, property: 'the free speed judged as the hovered speed', measured: r.speed, expected: 'rejected', red: ! judgeHover( draft, r.speed, r.speed ) } );

		if ( draft.touch ) {
			const tap = () => page.evaluate( ( s ) => {
				const el = document.querySelector( s );
				el.dispatchEvent( new PointerEvent( 'pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true } ) );
			}, sel );
			await tap();
			await page.waitForTimeout( 200 );
			const held = await measure( page, sel, 1000 );
			await tap();
			await page.waitForTimeout( 200 );
			const again = await measure( page, sel, 1000 );
			rep.check( 'marquee-touch', { selector: sel, property: 'speed after one touch tap, then after a second', measured: { held: held.speed, again: again.speed }, expected: 'still, then running', pass: judgeStill( held.speed ) && again.speed > 0.5 } );
			rep.control( 'marquee-touch', { selector: sel, property: 'the held-still judge on the running row', measured: again.speed, expected: 'rejected', red: ! judgeStill( again.speed ) } );
		}

		const button = pauseButton( page, sel );
		const present = ( await button.count() ) > 0;
		let pressed = null;
		let resumed = null;
		if ( present ) {
			await button.click();
			await page.mouse.move( 2, 2 );
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.waitForTimeout( 200 );
			pressed = await measure( page, sel, 1000 );
			await button.click();
			await page.evaluate( () => document.activeElement && document.activeElement.blur() );
			await page.mouse.move( 2, 2 );
			await page.waitForTimeout( 200 );
			resumed = await measure( page, sel, 1000 );
		}
		rep.check( 'marquee-pause', { selector: sel, property: 'the pause button: press, then press again', measured: { present, pressed: pressed && pressed.speed, resumed: resumed && resumed.speed }, expected: 'present, still, then running', pass: present && judgeStill( pressed.speed ) && resumed.speed > 0.5 } );
	}

	await bringIntoView( page, CONTROL );
	const c = await measure( page, CONTROL );
	rep.control( 'marquee-range', { selector: CONTROL, property: 'the trust bar with no marquee runs', measured: { on: c.on, clones: c.clones, speed: c.speed }, expected: 'never runs', red: ! c.on && 0 === c.clones } );
	rep.control( 'marquee-fade', { selector: CONTROL, property: 'the fade judge on the control bar', measured: c.mask, expected: 'rejected', red: ! judgeFade( c.mask, 5 ) } );
	await live.close();

	const forced = await open( ctx );
	await forced.page.addStyleTag( { content: '[data-sgs-marquee-lane="on"] > *{translate:none !important}' } );
	await bringIntoView( forced.page, '.m515-speed' );
	const f = await measure( forced.page, '.m515-speed' );
	await forced.close();
	rep.control( 'marquee-rate', { selector: '.m515-speed', property: 'copies forced to translate: none (author !important)', measured: f.speed, expected: 'the check fails', red: ! judgeRate( DRAFTS[ '.m515-speed' ], f ) } );

	// Resolution: the same row run 5% fast must fail the 2% judge, so a pass is not the judge's slack.
	const nudged = await open( ctx );
	await bringIntoView( nudged.page, '.m515-speed' );
	await nudged.page.evaluate( () => document.querySelectorAll( '.m515-speed [data-sgs-marquee-set], .m515-speed [data-sgs-marquee-clone]' ).forEach( ( el ) => el.getAnimations().forEach( ( a ) => a.updatePlaybackRate( 1.05 ) ) ) );
	await nudged.page.waitForTimeout( 300 );
	const n = await measure( nudged.page, '.m515-speed' );
	await nudged.close();
	rep.control( 'marquee-rate', { selector: '.m515-speed', property: 'the row run at 1.05x its playback rate', measured: n.speed, expected: 'the check fails', red: n.speed > 0.5 && ! judgeRate( DRAFTS[ '.m515-speed' ], n ) } );

	// The stored fade width equals the runtime default, so plant another width before boot: the fade check must fail.
	const wider = await open( ctx, {}, () => {
		document.addEventListener( 'DOMContentLoaded', () => {
			const style = document.createElement( 'style' );
			style.textContent = '.m515-speed{--sgs-marquee-edge-fade-width:12}';
			document.head.appendChild( style );
		} );
	} );
	await bringIntoView( wider.page, '.m515-speed' );
	const w = await measure( wider.page, '.m515-speed', 300 );
	await wider.close();
	rep.control( 'marquee-fade', { selector: '.m515-speed', property: 'the fade width planted as 12 before boot', measured: w.mask, expected: 'the check fails', red: /gradient/.test( w.mask ) && ! judgeFade( w.mask, DRAFTS[ '.m515-speed' ].fade ) } );
}

async function reducedChecks( ctx ) {
	const { rep } = ctx;
	const sels = Object.keys( DRAFTS );
	const all = async ( page ) => {
		const out = [];
		for ( const sel of sels ) {
			await bringIntoView( page, sel );
			out.push( await measure( page, sel, 800 ) );
		}
		return out;
	};
	const still = ( rows ) => rows.every( ( r ) => ! r.on && 0 === r.clones && judgeStill( r.speed ) );
	const reduced = await open( ctx, { reducedMotion: 'reduce' } );
	const emulated = await reduced.page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	const rows = await all( reduced.page );
	await reduced.close();
	rep.check( 'marquee-reduced', { selector: sels.join( ', ' ), property: 'run state, copies and movement under reduced motion', measured: { emulated, rows: rows.map( ( r ) => [ r.on, r.clones, r.speed ] ) }, expected: 'emulation on, nothing cloned or moving', pass: emulated && still( rows ) } );
	const normal = await open( ctx );
	const moving = await all( normal.page );
	await normal.close();
	rep.control( 'marquee-reduced', { selector: sels.join( ', ' ), property: 'the same judge with no preference', measured: moving.map( ( r ) => r.on ), expected: 'rejected (at least one row runs)', red: ! still( moving ) } );
}

// ---- Entry -----------------------------------------------------------------------------------------------------

function selfTest() {
	const failures = [];
	const need = ( name, ok ) => { if ( ! ok ) failures.push( name ); };
	const line = ( v ) => Array.from( { length: 31 }, ( _, i ) => ( { t: i * 50, x: 500 - v * i * 0.05 } ) );
	need( 'velocity', near( velocity( line( 45 ) ), 45, 1e-9 ) );
	const wrapped = line( 45 ).map( ( p, i ) => ( i > 15 ? { ...p, x: p.x + 300 } : p ) );
	need( 'velocity skips the wrap', near( velocity( wrapped ), 45, 0.5 ) );
	need( 'still', judgeStill( velocity( line( 0 ) ) ) && ! judgeStill( 45 ) );
	need( 'rate speed', judgeRate( { speed: 45 }, { speed: 45.5, pitch: 1 } ) && ! judgeRate( { speed: 45 }, { speed: 47, pitch: 1 } ) );
	need( 'rate seconds', judgeRate( { loopSeconds: 24 }, { speed: 50, pitch: 1200 } ) && ! judgeRate( { loopSeconds: 24 }, { speed: 40, pitch: 1200 } ) );
	need( 'rate rejects still', ! judgeRate( { loopSeconds: 24 }, { speed: 0, pitch: 0 } ) );
	need( 'hover slow', judgeHover( { hoverRate: 0.15 }, 45, 6.75 ) && ! judgeHover( { hoverRate: 0.15 }, 45, 45 ) );
	need( 'hover stop', judgeHover( { hoverRate: 0 }, 45, 0 ) && ! judgeHover( { hoverRate: 0 }, 45, 40 ) );
	need( 'fade', judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 5%, rgb(0, 0, 0) calc(95%), transparent 100%)', 5 ) && ! judgeFade( 'none', 5 ) );
	need( 'fade is numeric', ! judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 15%, rgb(0, 0, 0) 85%, transparent 100%)', 5 ) && ! judgeFade( 'linear-gradient(to right, transparent 0px, rgb(0, 0, 0) 12%, rgb(0, 0, 0) 88%, transparent 100%)', 5 ) );
	need( 'range', shouldRun( DRAFTS[ '.m515-loop24' ], 768 ) && ! shouldRun( DRAFTS[ '.m515-loop24' ], 1440 ) && ! shouldRun( DRAFTS[ '.m515-ticker' ], 768 ) );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	return failures.length ? 1 : 0;
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) process.exit( selfTest() );
	const args = parseArgs( process.argv );
	const pageId = Number( args.pages[ 0 ] ?? MARQUEE_PAGE );
	const top = new Reporter( {} );
	if ( ! pageId ) {
		top.check( 'marquee-fixture', { pass: null, why: 'fixture page not created: build tests/fixtures/motion/pages/marquee.json, then set MARQUEE_PAGE in this file (or pass --page <id>)' } );
		process.exit( top.summary() );
	}
	runtimeCheck( top );
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ pageId }&cb=m515`;
	const all = [ ...top.rows ];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch( launchOptions( engine ) );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const ctx = { browser, width, url, rep };
			const probe = await open( ctx );
			const missing = await probe.page.evaluate( ( sels ) => sels.filter( ( s ) => ! document.querySelector( s ) ), [ ...Object.keys( DRAFTS ), CONTROL ] );
			await probe.close();
			if ( missing.length ) {
				rep.check( 'marquee-fixture', { selector: url, measured: missing, expected: 'every marker present', pass: null, why: `markers missing from page ${ pageId }: ${ missing.join( ', ' ) }` } );
			} else {
				for ( const run of [ liveChecks, reducedChecks ] ) {
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
