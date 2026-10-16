/**
 * Spec 38A FR-38A-23: live proof that a layer's per-device `off` reaches the Tier V runtimes and the effect
 * stylesheets, not only the Tier G boot gate (`probe-layer-off-per-effect.mjs` covers that one).
 *
 * FIXTURE: tests/fixtures/motion/pages/vanilla-off-per-tier.json, built with scripts/wp-build-page.js. Two groups of
 * three, each row a single effect layer on `elements.root`:
 *   .vro-a / .vro-b / .vro-c   sgs/button with a pointerdown ripple (a JS runtime, `fx-ripple.js` through `bootGated`):
 *                              off ["mobile"], the control, off ["tablet"].
 *   .vso-a / .vso-b / .vso-c   sgs/info-box with a hover sheen (a stylesheet-only effect, `fx-sheen.css`): the same three.
 *
 * MARKERS, read from the live page (never a metric):
 *   ripple  a synthetic `pointerdown` (dispatched on the element, so the real mouse stays still) makes `fx-ripple.js`
 *           set `data-sgs-ripple="play"` synchronously when it is bound; an unbound element stays without it.
 *   sheen   the computed `display` of the injected `span.sgs-motion-layer[data-sgs-layer="sheen"]`: `none` when the
 *           stylesheet gate applies, anything else when the sheen is on.
 *
 * WHAT IT CHECKS (each engine): the attributes emitted, then at 375, 768 and 1440 each row is on exactly when its off
 * list does not name the tier (the control is on everywhere), then one page load is resized 1440 > 768 > 375 > 768 >
 * 1440 and every row re-read after each step (the runtime stops and restarts on the tier crossing, including the
 * tablet-to-mobile step where both tier queries flip at once). Live negative control: the judge fed the control row as
 * if it listed the tier must go red. The self-test feeds every judge fabricated pre-fix readings.
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-vanilla-off-per-tier.mjs --page <id> [--site sandybrown]
 *        [--engine chromium|firefox|webkit ...]      (SGS_HEADED=1 runs real Chrome headed for Chromium)
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-vanilla-off-per-tier.mjs --self-test
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchOptions, gotoThroughCheck, settleInView, siteBase, Reporter } from './probe-motion-model-lib.mjs';

const GROUPS = {
	ripple: { a: '.vro-a', b: '.vro-b', c: '.vro-c' },
	sheen: { a: '.vso-a', b: '.vso-b', c: '.vso-c' },
};
const OFF = { a: 'mobile', b: null, c: 'tablet' };
const WIDTHS = [ 375, 768, 1440 ];
const STEPS = [ 1440, 768, 375, 768, 1440 ];
const HEIGHT = 900;
const ENGINES = [ 'chromium', 'firefox', 'webkit' ];

// ---- Pure judges -----------------------------------------------------------------------------------------------

export const tierOf = ( width ) => ( width <= 767 ? 'mobile' : width <= 1023 ? 'tablet' : 'desktop' );

const tokens = ( value ) => ( value || '' ).split( /\s+/ ).filter( Boolean );

/** Whether a reading's off lists name the effect at a tier. */
export const offAt = ( reading, effect, tier ) =>
	tokens( 'mobile' === tier ? reading.offMobile : 'tablet' === tier ? reading.offTablet : '' ).includes( effect );

/** The rendered attributes match the fixture's rows. */
export function judgeEmitted( effect, readings ) {
	return Object.entries( OFF ).every( ( [ k, tier ] ) => {
		const r = readings[ k ];
		return !! r && tokens( r.fx ).includes( effect ) &&
			( 'mobile' === tier ? effect === tokens( r.offMobile ).join( ' ' ) : ! r.offMobile ) &&
			( 'tablet' === tier ? effect === tokens( r.offTablet ).join( ' ' ) : ! r.offTablet ) &&
			! r.disableMobile && ! r.disableTablet;
	} );
}

/**
 * One row at one tier: pass is null when the control is not on here (nothing to compare against), else whether the row
 * is on exactly when its off list does not name the tier.
 */
export function judgeRow( effect, row, control, tier ) {
	const off = offAt( row, effect, tier );
	const check = off ? 'off-effect-skipped' : 'on-off-tier';
	if ( ! control.active ) return { check, pass: null };
	return { check, pass: off ? ! row.active : row.active };
}

// ---- Self-test -------------------------------------------------------------------------------------------------

const read = ( over = {} ) => ( { fx: 'ripple', offMobile: null, offTablet: null, disableMobile: false, disableTablet: false, active: true, ...over } );

export async function selfTest() {
	const rep = new Reporter( { mode: 'self-test' } );
	for ( const effect of [ 'ripple', 'sheen' ] ) {
		const good = {
			a: read( { fx: effect, offMobile: effect } ),
			b: read( { fx: effect } ),
			c: read( { fx: effect, offTablet: effect } ),
		};
		rep.check( `${ effect }:emitted`, { pass: true === judgeEmitted( effect, good ) } );
		rep.control( `${ effect }:emitted`, { why: 'the element-wide switch on .a', red: false === judgeEmitted( effect, { ...good, a: read( { fx: effect, disableMobile: true } ) } ) } );
		rep.control( `${ effect }:emitted`, { why: 'the tablet off written as mobile on .c', red: false === judgeEmitted( effect, { ...good, c: read( { fx: effect, offMobile: effect } ) } ) } );

		const skipped = judgeRow( effect, { ...good.a, active: false }, good.b, 'mobile' );
		rep.check( `${ effect }:off-effect-skipped`, { measured: skipped, pass: 'off-effect-skipped' === skipped.check && true === skipped.pass } );
		const ignored = judgeRow( effect, good.a, good.b, 'mobile' );
		rep.control( `${ effect }:off-effect-skipped`, { why: 'the pre-fix behaviour: the effect still runs on its off tier', measured: ignored, red: false === ignored.pass } );

		const stays = judgeRow( effect, good.c, good.b, 'mobile' );
		rep.check( `${ effect }:on-off-tier`, { measured: stays, pass: 'on-off-tier' === stays.check && true === stays.pass } );
		const leaked = judgeRow( effect, { ...good.c, active: false }, good.b, 'mobile' );
		rep.control( `${ effect }:on-off-tier`, { why: 'a tablet-only off that also stopped mobile', measured: leaked, red: false === leaked.pass } );

		const never = judgeRow( effect, { ...good.a, active: false }, good.b, 'desktop' );
		rep.control( `${ effect }:on-desktop`, { why: 'the effect never runs at desktop either', measured: never, red: false === never.pass } );
		const unanswered = judgeRow( effect, good.a, { ...good.b, active: false }, 'mobile' );
		rep.check( `${ effect }:unanswered-without-control`, { measured: unanswered, pass: null === unanswered.pass } );
	}
	rep.check( 'tier-of', { pass: [ 375, 767, 768, 1023, 1024, 1440 ].map( tierOf ).join() === 'mobile,mobile,tablet,tablet,desktop,desktop' } );
	return rep.summary();
}

// ---- Live ------------------------------------------------------------------------------------------------------

function parseArgs( argv ) {
	const args = { pages: [], engines: [], site: 'sandybrown' };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--page' ) args.pages.push( argv[ ++i ] );
		else if ( a === '--engine' ) args.engines.push( argv[ ++i ] );
		else if ( a === '--site' ) args.site = argv[ ++i ];
		else throw new Error( `Unknown argument ${ a }` );
	}
	if ( ! args.engines.length ) args.engines = [ 'chromium' ];
	for ( const e of args.engines ) if ( ! ENGINES.includes( e ) ) throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	return args;
}

/** One row's fx attributes and whether its effect is running now, read in the page. */
async function reading( page, effect, selector ) {
	return page.evaluate( ( { effectName, sel } ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		let active;
		if ( 'ripple' === effectName ) {
			el.removeAttribute( 'data-sgs-ripple' );
			const rect = el.getBoundingClientRect();
			el.dispatchEvent( new PointerEvent( 'pointerdown', {
				bubbles: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
			} ) );
			active = 'play' === el.getAttribute( 'data-sgs-ripple' );
			el.removeAttribute( 'data-sgs-ripple' );
		} else {
			const layer = el.querySelector( ':scope > .sgs-motion-layer[data-sgs-layer="sheen"]' );
			active = !! layer && 'none' !== getComputedStyle( layer ).display;
		}
		return {
			fx: ( el.dataset.sgsFx || '' ).split( /\s+/ ).filter( Boolean ).join( ' ' ),
			offMobile: el.getAttribute( 'data-sgs-fx-off-mobile' ),
			offTablet: el.getAttribute( 'data-sgs-fx-off-tablet' ),
			disableMobile: el.hasAttribute( 'data-sgs-fx-disable-mobile' ),
			disableTablet: el.hasAttribute( 'data-sgs-fx-disable-tablet' ),
			active,
		};
	}, { effectName: effect, sel: selector } );
}

async function readGroup( page, effect ) {
	const out = {};
	for ( const [ k, sel ] of Object.entries( GROUPS[ effect ] ) ) out[ k ] = await reading( page, effect, `${ sel }[data-sgs-fx]` );
	return out;
}

function reportTier( rep, effect, tier, r, ctx ) {
	rep.check( `${ effect }:control-on`, { ...ctx, selector: GROUPS[ effect ].b, measured: { active: r.b.active }, expected: 'the control runs at every tier', pass: r.b.active } );
	for ( const k of [ 'a', 'c' ] ) {
		const j = judgeRow( effect, r[ k ], r.b, tier );
		rep.check( `${ effect }:${ j.check }`, {
			...ctx, selector: GROUPS[ effect ][ k ], property: 'ripple' === effect ? 'data-sgs-ripple after a pointerdown' : 'computed display of the sheen layer',
			measured: { offMobile: r[ k ].offMobile, offTablet: r[ k ].offTablet, active: r[ k ].active },
			expected: 'off-effect-skipped' === j.check ? 'not running' : 'running', pass: j.pass,
			why: null === j.pass ? 'the control is not running at this width, so this row has nothing to be compared with' : '',
		} );
	}
	if ( 'desktop' !== tier ) {
		const asOff = judgeRow( effect, { ...r.b, [ 'mobile' === tier ? 'offMobile' : 'offTablet' ]: effect }, r.b, tier );
		rep.control( `${ effect }:off-effect-skipped`, {
			...ctx, selector: GROUPS[ effect ].b, property: 'the skip judge fed the control row as if it listed this tier', measured: { active: r.b.active },
			expected: 'red: a running effect reads as not skipped', red: null === asOff.pass ? null : ! asOff.pass,
		} );
	}
}

async function runWidth( browserType, engine, width, url, rep ) {
	const browser = await browserType.launch( launchOptions( engine ) );
	try {
		const context = await browser.newContext( { viewport: { width, height: HEIGHT }, reducedMotion: 'no-preference', hasTouch: false } );
		const page = await context.newPage();
		if ( ! ( await gotoThroughCheck( page, url ) ) ) {
			rep.check( 'page', { pass: null, why: 'the host answered with its browser check every time (rerun with SGS_HEADED=1)' } );
			return;
		}
		const tier = tierOf( width );
		for ( const effect of Object.keys( GROUPS ) ) {
			if ( ! ( await page.$( `${ GROUPS[ effect ].b }[data-sgs-fx]` ) ) ) {
				rep.check( `${ effect }:emitted`, { pass: null, why: 'rows missing (build tests/fixtures/motion/pages/vanilla-off-per-tier.json)' } );
				continue;
			}
			await settleInView( page, GROUPS[ effect ].b );
			await page.waitForTimeout( 600 );
			const r = await readGroup( page, effect );
			const emitted = judgeEmitted( effect, r );
			rep.check( `${ effect }:emitted`, { tier, selector: Object.values( GROUPS[ effect ] ).join( ', ' ), measured: r, expected: `off-mobile on .a, off-tablet on .c, no element-wide switch`, pass: emitted ? true : null, why: emitted ? '' : 'the rendered attributes do not match the fixture' } );
			if ( emitted ) reportTier( rep, effect, tier, r, { tier } );
		}
	} catch ( e ) {
		rep.check( 'error', { pass: false, why: String( e && e.message ? e.message : e ) } );
	} finally {
		await browser.close();
	}
}

/** One page load resized across every tier crossing, every row re-read after each step. */
async function runResize( browserType, engine, url, rep ) {
	const browser = await browserType.launch( launchOptions( engine ) );
	try {
		const context = await browser.newContext( { viewport: { width: STEPS[ 0 ], height: HEIGHT }, reducedMotion: 'no-preference', hasTouch: false } );
		const page = await context.newPage();
		if ( ! ( await gotoThroughCheck( page, url ) ) ) {
			rep.check( 'page', { pass: null, why: 'the host answered with its browser check every time (rerun with SGS_HEADED=1)' } );
			return;
		}
		for ( const effect of Object.keys( GROUPS ) ) {
			await settleInView( page, GROUPS[ effect ].b );
			await page.waitForTimeout( 600 );
			for ( const width of STEPS ) {
				await page.setViewportSize( { width, height: HEIGHT } );
				await page.waitForTimeout( 500 );
				const r = await readGroup( page, effect );
				reportTier( rep, effect, tierOf( width ), r, { tier: tierOf( width ), widths: STEPS.join( ' > ' ), step: width } );
			}
		}
	} catch ( e ) {
		rep.check( 'error', { pass: false, why: String( e && e.message ? e.message : e ) } );
	} finally {
		await browser.close();
	}
}

export async function main( argv ) {
	const args = parseArgs( argv );
	if ( ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/vanilla-off-per-tier.json) or --self-test.' );
		return 1;
	}
	const playwright = await import( 'playwright' );
	const url = `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=vop`;
	const all = [];
	for ( const engine of args.engines ) {
		for ( const width of WIDTHS ) {
			const rep = new Reporter( { engine, width, mode: 'live' } );
			await runWidth( playwright[ engine ], engine, width, url, rep );
			all.push( ...rep.rows );
		}
		const resizeRep = new Reporter( { engine, width: 'resize', mode: 'live' } );
		await runResize( playwright[ engine ], engine, url, resizeRep );
		all.push( ...resizeRep.rows );
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	return finish.summary();
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const run = argv.includes( '--self-test' ) ? selfTest() : main( argv );
	run.then( ( code ) => process.exit( code ), ( e ) => {
		console.error( e );
		process.exit( 1 );
	} );
}
