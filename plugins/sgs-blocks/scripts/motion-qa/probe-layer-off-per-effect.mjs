/**
 * Spec 38A FR-38A-23 (per-effect `off`): live proof that a motion layer's per-device `off` switches off only its own
 * Tier G effect, never a sibling effect on the same element.
 *
 * FIXTURE: tests/fixtures/motion/pages/layer-off-per-effect.json, built with scripts/wp-build-page.js. Two sgs/container
 * rows with "Scroll sideways" on at every tier, so each row's `inner` part (`.sgs-container__inner`) is a native
 * horizontal scroller. Each `inner` carries two Tier G effect layers, `scrub` and `draggable` (the only kind of Tier G
 * pair the renderer keeps on one element: every other pair is dropped by the `tier-g-shared-scroll-settings` refusal):
 *   .mlo-a  scrub has off:["mobile"], draggable has no off. Rendered: data-sgs-fx="scrub draggable",
 *           data-sgs-fx-off-mobile="scrub".
 *   .mlo-b  the control: the same two layers, no off.
 *
 * BOOT MARKERS, read from the element's own inline style declarations (what each effect's boot writes, never a computed
 * style):
 *   draggable  fx-draggable.js::bindDrag sets `el.style.cursor = 'grab'` when initDraggable boots (it needs a fine
 *              pointer and a genuinely overflowing native scroller, both read as preconditions).
 *   scrub      fx-scrub.js::initScrub builds `gsap.fromTo( el, rows.from, ... )` with immediateRender, so GSAP writes the
 *              default rows (`opacity`, `y` as `transform`) inline on the element the moment it boots. SGS blocks render
 *              no inline style (Spec 32), so a non-empty `el.style.opacity` or `el.style.transform` is the scrub's write.
 *
 * WHAT IT CHECKS (each engine, at 375 and 1440 wide):
 *   emitted                 the server wrote both effects in data-sgs-fx on both rows, data-sgs-fx-off-mobile="scrub" on
 *                           .mlo-a and no off list on .mlo-b (a mismatch means the fixture or emitter, so UNANSWERED).
 *   off-effect-skipped      375: .mlo-a's scrub did NOT boot. 1440: it did.
 *   sibling-boots           .mlo-a's draggable booted at both widths (the old element-wide gate stopped it at 375).
 *   control-boots-both      .mlo-b booted scrub and draggable at both widths.
 *   Live negative control:  the off-effect-skipped judge, fed .mlo-b's 375 reading, must go red, so a scrub that boots
 *                           at 375 is visible to the marker and the pass on .mlo-a is not vacuous.
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-layer-off-per-effect.mjs --page <id> [--site sandybrown]
 *        [--engine chromium|firefox|webkit ...]      (SGS_HEADED=1 runs real Chrome headed for Chromium)
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-layer-off-per-effect.mjs --self-test
 *        (the judges on fabricated readings with red negative controls, plus the fixture's schema and refusal check;
 *        no browser, no network)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchOptions, gotoThroughCheck, settleInView, siteBase, collectMotion, Reporter, FIXTURE_DIR } from './probe-motion-model-lib.mjs';

const FIXTURE = path.join( FIXTURE_DIR, 'layer-off-per-effect.json' );
const ROW_A = '.mlo-a';
const ROW_B = '.mlo-b';
const FX_ELEMENT = ( row ) => `${ row } [data-sgs-fx~="draggable"]`;
const WIDTHS = [ 375, 1440 ];
const HEIGHT = 900;
const ENGINES = [ 'chromium', 'firefox', 'webkit' ];
const BOOT_TIMEOUT = 10000;

// ---- Pure judges -----------------------------------------------------------------------------------------------

const tokens = ( value ) => ( value || '' ).split( /\s+/ ).filter( Boolean );

/** Which effects booted, from one element's reading (its own inline style declarations). */
export function booted( reading ) {
	return {
		draggable: 'grab' === reading.cursor || 'grabbing' === reading.cursor,
		scrub: '' !== ( reading.opacity || '' ) || '' !== ( reading.transform || '' ),
	};
}

/**
 * The server-side attributes: both effects named on both rows, `scrub` alone in .mlo-a's mobile off list, no off list
 * on .mlo-b. Returns true, false, or null when an element is missing.
 */
export function judgeEmitted( a, b ) {
	if ( ! a || ! b ) return null;
	const both = ( r ) => tokens( r.fx ).includes( 'scrub' ) && tokens( r.fx ).includes( 'draggable' );
	return both( a ) && both( b ) && 'scrub' === tokens( a.offMobile ).join( ' ' ) && null === b.offMobile && null === b.offTablet;
}

/** The effect with off:["mobile"] has not booted at the mobile tier and has booted at desktop. */
export function judgeOffSkipped( reading, tier ) {
	const scrub = booted( reading ).scrub;
	return 'mobile' === tier ? ! scrub : scrub;
}

/** The sibling with no off list booted at every tier. */
export function judgeSiblingBoots( reading ) {
	return booted( reading ).draggable;
}

/** The control row booted both effects. */
export function judgeControlBootsBoth( reading ) {
	const b = booted( reading );
	return b.draggable && b.scrub;
}

// ---- Self-test -------------------------------------------------------------------------------------------------

const read = ( over = {} ) => ( {
	fx: 'scrub draggable', offMobile: null, offTablet: null, cursor: 'grab', opacity: '0', transform: 'translate(0px, 40px)', ...over,
} );

async function fixtureCheck( rep ) {
	let checkMotion;
	try {
		checkMotion = ( await import( '../../../../scripts/computed-route/lib/motion-schema.mjs' ) ).checkMotion;
	} catch ( e ) {
		rep.check( 'fixture-schema', { selector: FIXTURE, pass: null, why: `the schema checker did not load (run npm ci in scripts/computed-route): ${ e.message }` } );
		return;
	}
	const items = collectMotion( JSON.parse( fs.readFileSync( FIXTURE, 'utf8' ) ) );
	const verdicts = items.map( ( item ) => ( { className: item.className, ...checkMotion( item.motion ) } ) );
	rep.check( 'fixture-schema', {
		selector: FIXTURE, property: 'checkMotion (motion.schema.json plus the §10 and §5.2 refusals) on every sgsMotion',
		measured: verdicts.map( ( v ) => ( { className: v.className, valid: v.valid, errors: v.errors, refusals: v.refusals } ) ),
		expected: 'two motion docs (.mlo-a, .mlo-b), each valid with no refusal',
		pass: 2 === verdicts.length && verdicts.every( ( v ) => v.valid ),
	} );
	// Negative control: a pair the renderer refuses (scrub with split-reveal on one element) must fail the same check.
	const refused = checkMotion( { v: 1, elements: { root: { entrance: { text: [ { id: 't1', effect: 'split-reveal' } ] }, effects: [ { id: 'e1', effect: 'scrub', off: [ 'mobile' ] } ] } } } );
	rep.control( 'fixture-schema', {
		property: 'checkMotion on scrub plus split-reveal on one element', measured: refused.refusals.map( ( r ) => r.id ),
		expected: 'refused (tier-g-shared-scroll-settings), so the check above can fail', red: ! refused.valid,
	} );
}

export async function selfTest() {
	const rep = new Reporter( { mode: 'self-test' } );
	const aMobile = read( { offMobile: 'scrub', opacity: '', transform: '' } );
	const aDesktop = read( { offMobile: 'scrub' } );
	const bMobile = read();

	rep.check( 'emitted', { pass: true === judgeEmitted( aDesktop, bMobile ) } );
	rep.control( 'emitted', { why: 'the old element-wide switch: no off list on .mlo-a', red: false === judgeEmitted( read(), bMobile ) } );
	rep.control( 'emitted', { why: 'an off list that also names the sibling', red: false === judgeEmitted( read( { offMobile: 'scrub draggable' } ), bMobile ) } );
	rep.check( 'emitted:missing-element', { pass: null === judgeEmitted( null, bMobile ) } );

	rep.check( 'off-effect-skipped@mobile', { pass: judgeOffSkipped( aMobile, 'mobile' ) } );
	rep.check( 'off-effect-skipped@desktop', { pass: judgeOffSkipped( aDesktop, 'desktop' ) } );
	rep.control( 'off-effect-skipped@mobile', { why: 'the gate ignored: scrub booted at mobile', red: ! judgeOffSkipped( aDesktop, 'mobile' ) } );
	rep.control( 'off-effect-skipped@desktop', { why: 'scrub never booted at desktop either', red: ! judgeOffSkipped( aMobile, 'desktop' ) } );

	rep.check( 'sibling-boots@mobile', { pass: judgeSiblingBoots( aMobile ) } );
	rep.control( 'sibling-boots@mobile', {
		why: 'the old element-wide gate: neither effect booted on .mlo-a at mobile',
		red: ! judgeSiblingBoots( read( { offMobile: 'scrub', cursor: '', opacity: '', transform: '' } ) ),
	} );

	rep.check( 'control-boots-both@mobile', { pass: judgeControlBootsBoth( bMobile ) } );
	rep.control( 'control-boots-both@mobile', { why: 'the control lost its scrub', red: ! judgeControlBootsBoth( read( { opacity: '', transform: '' } ) ) } );
	rep.control( 'control-boots-both@mobile', { why: 'the control lost its draggable', red: ! judgeControlBootsBoth( read( { cursor: '' } ) ) } );

	await fixtureCheck( rep );
	return rep.summary();
}

// ---- Live ------------------------------------------------------------------------------------------------------

function parseArgs( argv ) {
	const args = { pages: [], engines: [], site: 'sandybrown', selfTest: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--page' ) args.pages.push( argv[ ++i ] );
		else if ( a === '--engine' ) args.engines.push( argv[ ++i ] );
		else if ( a === '--site' ) args.site = argv[ ++i ];
		else if ( a === '--self-test' ) args.selfTest = true;
		else throw new Error( `Unknown argument ${ a }` );
	}
	if ( ! args.engines.length ) args.engines = [ 'chromium' ];
	for ( const e of args.engines ) if ( ! ENGINES.includes( e ) ) throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	return args;
}

/** One fx element's attributes, inline style declarations and the boot preconditions, read in the page. */
async function reading( page, selector ) {
	return page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		return {
			fx: el.getAttribute( 'data-sgs-fx' ),
			offMobile: el.getAttribute( 'data-sgs-fx-off-mobile' ),
			offTablet: el.getAttribute( 'data-sgs-fx-off-tablet' ),
			disableMobile: el.hasAttribute( 'data-sgs-fx-disable-mobile' ),
			cursor: el.style.cursor,
			opacity: el.style.opacity,
			transform: el.style.transform,
			scroller: [ 'auto', 'scroll' ].includes( getComputedStyle( el ).overflowX ) && el.scrollWidth > el.clientWidth,
		};
	}, selector );
}

async function runWidth( browserType, engine, width, url, rep ) {
	const browser = await browserType.launch( launchOptions( engine ) );
	try {
		const context = await browser.newContext( { viewport: { width, height: HEIGHT }, reducedMotion: 'no-preference' } );
		const page = await context.newPage();
		if ( ! ( await gotoThroughCheck( page, url ) ) ) {
			rep.check( 'page', { pass: null, why: 'the host answered with its browser check every time (rerun with SGS_HEADED=1)' } );
			return;
		}
		const env = await page.evaluate( () => ( {
			fine: matchMedia( '(pointer: fine)' ).matches,
			reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
			tier: matchMedia( '(max-width: 767px)' ).matches ? 'mobile' : matchMedia( '(max-width: 1023px)' ).matches ? 'tablet' : 'desktop',
		} ) );
		if ( ! ( await page.$( FX_ELEMENT( ROW_A ) ) ) || ! ( await page.$( FX_ELEMENT( ROW_B ) ) ) ) {
			rep.check( 'emitted', { pass: null, why: `no ${ FX_ELEMENT( ROW_A ) } or ${ FX_ELEMENT( ROW_B ) } (build tests/fixtures/motion/pages/layer-off-per-effect.json)` } );
			return;
		}
		if ( ! env.fine || env.reduce ) {
			rep.check( 'boot', { pass: null, measured: env, why: 'draggable needs a fine pointer and scrub needs no reduced-motion preference; this browser offers neither' } );
			return;
		}
		await settleInView( page, ROW_A );
		// The control boots draggable at every width, so its marker says the Tier G modules have run.
		const ran = await page.waitForFunction( ( sel ) => {
			const el = document.querySelector( sel );
			return !! el && 'grab' === el.style.cursor;
		}, FX_ELEMENT( ROW_B ), { polling: 100, timeout: BOOT_TIMEOUT } ).then( () => true, () => false );
		await page.waitForTimeout( 400 );
		const a = await reading( page, FX_ELEMENT( ROW_A ) );
		const b = await reading( page, FX_ELEMENT( ROW_B ) );
		const ctx = { tier: env.tier };

		const emitted = judgeEmitted( a, b );
		rep.check( 'emitted', {
			selector: `${ FX_ELEMENT( ROW_A ) } / ${ FX_ELEMENT( ROW_B ) }`, property: 'data-sgs-fx, data-sgs-fx-off-mobile, data-sgs-fx-off-tablet',
			measured: { a: { fx: a.fx, offMobile: a.offMobile, offTablet: a.offTablet, disableMobile: a.disableMobile }, b: { fx: b.fx, offMobile: b.offMobile, offTablet: b.offTablet } },
			expected: 'both rows name scrub and draggable; .mlo-a off-mobile is "scrub"; .mlo-b has no off list',
			pass: emitted ? true : null, why: emitted ? '' : 'the rendered attributes do not match the fixture, so the boot checks below would not test the gate',
		} );
		if ( ! emitted ) return;
		if ( ! ran ) {
			rep.check( 'boot', { ...ctx, selector: FX_ELEMENT( ROW_B ), measured: b, pass: null, why: `the control's draggable never booted within ${ BOOT_TIMEOUT }ms (Tier G modules not loaded, or the row does not overflow)` } );
			return;
		}
		if ( ! a.scroller || ! b.scroller ) {
			rep.check( 'boot', { ...ctx, measured: { aScroller: a.scroller, bScroller: b.scroller }, pass: null, why: 'a row is not an overflowing native scroller, so draggable cannot boot on it' } );
			return;
		}
		const show = ( r ) => ( { cursor: r.cursor, opacity: r.opacity, transform: r.transform, booted: booted( r ) } );
		rep.check( 'off-effect-skipped', {
			...ctx, selector: FX_ELEMENT( ROW_A ), property: 'inline opacity / transform written by the scrub boot', measured: show( a ),
			expected: 'mobile' === env.tier ? 'scrub not booted (no inline opacity or transform)' : 'scrub booted (inline opacity or transform)',
			pass: judgeOffSkipped( a, env.tier ),
		} );
		rep.check( 'sibling-boots', {
			...ctx, selector: FX_ELEMENT( ROW_A ), property: 'inline cursor written by the draggable boot', measured: show( a ),
			expected: 'draggable booted (cursor grab)', pass: judgeSiblingBoots( a ),
		} );
		rep.check( 'control-boots-both', {
			...ctx, selector: FX_ELEMENT( ROW_B ), property: 'inline cursor, opacity and transform', measured: show( b ),
			expected: 'scrub and draggable both booted', pass: judgeControlBootsBoth( b ),
		} );
		if ( 'mobile' === env.tier ) {
			rep.control( 'off-effect-skipped', {
				...ctx, selector: FX_ELEMENT( ROW_B ), property: 'the off-effect-skipped judge fed the control row', measured: show( b ),
				expected: 'red: a scrub that boots at mobile shows on the marker, so the pass on .mlo-a is not vacuous',
				red: ! judgeOffSkipped( b, 'mobile' ),
			} );
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
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/layer-off-per-effect.json) or --self-test.' );
		return 1;
	}
	const playwright = await import( 'playwright' );
	const url = `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=mlo`;
	const all = [];
	for ( const engine of args.engines ) {
		for ( const width of WIDTHS ) {
			const rep = new Reporter( { engine, width, mode: 'live' } );
			await runWidth( playwright[ engine ], engine, width, url, rep );
			all.push( ...rep.rows );
		}
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
