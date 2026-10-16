/**
 * Spec 38A FR-38A-23 (per-effect `off`): live proof that a motion layer's per-device `off` list reaches the Tier G boot
 * gate (`gsap/provider.js::isDisabledAtThisTier( el, effect )`) as that effect's own slug, so the effect skips boot on
 * exactly the listed tiers and boots everywhere else.
 *
 * FIXTURE: tests/fixtures/motion/pages/layer-off-per-effect.json, built with scripts/wp-build-page.js. Three horizontal
 * `sgs/timeline` blocks (mobile layout carousel, the block's own reveal off), each with one split-reveal layer on
 * `elements.root` (`entrance.text`; schema x-target-level part with text kinds, which the root takes; sgs/timeline
 * qualifies for it in generated-fx-qualifying-blocks.json):
 *   .mlo-a  off ["mobile"]. Rendered data-sgs-fx-off-mobile="split-reveal".
 *   .mlo-b  the control: no off.
 *   .mlo-c  off ["tablet"]. Rendered data-sgs-fx-off-tablet="split-reveal".
 *
 * WHY ONE EFFECT, NOT A SIBLING PAIR: the sibling clause (one layer's off leaves a second Tier G effect on the same
 * element running) has no live surface. The Tier G effects are the eleven that boot through `bootEffect`; the
 * `tier-g-shared-scroll-settings` refusal drops every pair among them except a pair with draggable, split-reveal with
 * scramble is refused by `text-rewrite-entrance`, and draggable qualifies only for sgs/before-after, which qualifies for
 * neither text effect and whose root is `overflow: hidden`, so initDraggable would decline it anyway. The sibling clause
 * stays covered by tests/js/provider-tier-gate.test.js and tests/php/run-fx-layer-off-per-effect-standalone.php.
 *
 * BOOT MARKER, read from what the boot writes into the DOM (never a computed style): fx-split-reveal.js::initSplitReveal
 * runs SplitText.create( el, { aria: 'auto' } ), whose word wrappers are `<div aria-hidden="true">` with inline
 * `position: relative; display: inline-block` (gsap SplitText.js `_getWrapper`). SGS blocks render no inline style
 * (Spec 32), so a descendant with those inline declarations is a SplitText fragment. SplitText also writes `aria-label`
 * on the element (reported, not judged).
 *
 * WHAT IT CHECKS (each engine, at 375, 768 and 1440 wide). A check on .mlo-a or .mlo-c is answered only when the
 * control .mlo-b booted split-reveal at the same width:
 *   emitted              data-sgs-fx is "split-reveal" on all three; off-mobile only on .mlo-a, off-tablet only on .mlo-c,
 *                        and no element-wide data-sgs-fx-disable-* (a mismatch means the fixture or emitter: UNANSWERED).
 *   off-effect-skipped   a row whose off list names this tier has not booted split-reveal.
 *   boots-off-tier       a row whose off list does not name this tier has booted it (.mlo-c at 375 proves a tablet-only
 *                        off leaves mobile running; .mlo-a at 768 the reverse).
 *   control-boots        .mlo-b booted split-reveal.
 *   Live negative control: the off-effect-skipped judge fed .mlo-b's reading as if it listed this tier must go red, so
 *                        a pass on .mlo-a or .mlo-c is not read off a marker that never appears.
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-layer-off-per-effect.mjs --page <id> [--site sandybrown]
 *        [--engine chromium|firefox|webkit ...]      (SGS_HEADED=1 runs real Chrome headed for Chromium)
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-layer-off-per-effect.mjs --self-test
 *        (the judges on fabricated readings with red negative controls, the fixture's schema and refusal check, and
 *        each layer's target level, part kinds and block qualification; no browser, no network)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchOptions, gotoThroughCheck, settleInView, siteBase, collectMotion, Reporter, FIXTURE_DIR, REPO } from './probe-motion-model-lib.mjs';

const FIXTURE = path.join( FIXTURE_DIR, 'layer-off-per-effect.json' );
const BLOCKS_DIR = path.join( REPO, 'plugins', 'sgs-blocks', 'src', 'blocks' );
const SCHEMA_FILE = path.join( REPO, 'plugins', 'sgs-blocks', 'schemas', 'motion.schema.json' );
const QUALIFYING_FILE = path.join( BLOCKS_DIR, 'extensions', 'generated-fx-qualifying-blocks.json' );
const EFFECT = 'split-reveal';
const ROWS = { a: '.mlo-a', b: '.mlo-b', c: '.mlo-c' };
const EXPECTED_OFF = { a: { mobile: EFFECT, tablet: null }, b: { mobile: null, tablet: null }, c: { mobile: null, tablet: EFFECT } };
const WIDTHS = [ 375, 768, 1440 ];
const HEIGHT = 900;
const ENGINES = [ 'chromium', 'firefox', 'webkit' ];
const BOOT_TIMEOUT = 10000;

// ---- Pure judges -----------------------------------------------------------------------------------------------

const tokens = ( value ) => ( value || '' ).split( /\s+/ ).filter( Boolean );

/** Whether split-reveal booted, from one element's reading. */
export const booted = ( reading ) => reading.splitFragments > 0;

/** The rendered attributes match the fixture on every row. Null when a row is missing. */
export function judgeEmitted( readings ) {
	if ( Object.keys( ROWS ).some( ( k ) => ! readings[ k ] ) ) return null;
	return Object.entries( EXPECTED_OFF ).every( ( [ k, off ] ) => {
		const r = readings[ k ];
		const list = ( v ) => ( v ? tokens( v ).join( ' ' ) : null );
		return EFFECT === tokens( r.fx ).join( ' ' ) && off.mobile === list( r.offMobile ) && off.tablet === list( r.offTablet ) &&
			! r.disableMobile && ! r.disableTablet;
	} );
}

/** The off list a reading carries for a tier ('desktop' has none). */
const offAt = ( reading, tier ) => tokens( 'mobile' === tier ? reading.offMobile : 'tablet' === tier ? reading.offTablet : '' );

/**
 * One row at one tier: { check, pass }. pass is null when the control did not boot the effect here (nothing to
 * compare against), else whether the row booted exactly when its off list does not name this tier.
 */
export function judgeRow( row, control, tier ) {
	const off = offAt( row, tier ).includes( EFFECT );
	const check = off ? 'off-effect-skipped' : 'boots-off-tier';
	if ( ! booted( control ) ) return { check, pass: null };
	return { check, pass: off ? ! booted( row ) : booted( row ) };
}

// ---- Static placement check (target level, part kinds, block qualification) ------------------------------------

const ROOT_LEVELS = [ 'block', 'surface', 'part' ];

/**
 * Every layer of one sgsMotion doc on one block, judged against the schema's `x-target-level` and `x-part-kinds`
 * (the rules of src/blocks/extensions/motion/layers/refusal-match.js::effectsForTarget) and the block's qualifying
 * list. Returns one row per layer: { target, effect, ok, why }.
 */
export function placementProblems( blockName, motion, schema, qualifying, blockElements ) {
	const rows = [];
	const fx = schema[ 'x-sgs-effects' ];
	for ( const [ target, element ] of Object.entries( motion.elements || {} ) ) {
		const layers = [ ...( element.entrance?.text || [] ), ...( element.effects || [] ), ...( element.hover?.effects || [] ) ];
		const part = blockElements?.[ target ] || null;
		const levels = 'root' === target ? ROOT_LEVELS : part?.surface === true ? [ 'surface', 'part' ] : [ 'part' ];
		for ( const layer of layers ) {
			const entry = fx[ layer.effect ];
			const why = [];
			if ( ! entry ) why.push( `${ layer.effect } is not a schema effect` );
			else {
				const allowed = entry[ 'x-target-level' ] || [];
				if ( ! allowed.some( ( l ) => levels.includes( l ) ) ) why.push( `x-target-level ${ JSON.stringify( allowed ) } does not include a level target "${ target }" offers (${ levels.join( ', ' ) })` );
				const kinds = entry[ 'x-part-kinds' ];
				if ( Array.isArray( kinds ) && 'root' !== target && ! target.startsWith( 'custom:' ) && ! kinds.some( ( k ) => part?.[ k ] === true ) ) {
					why.push( `x-part-kinds ${ JSON.stringify( kinds ) } do not fit part "${ target }"` );
				}
			}
			if ( ! ( qualifying[ blockName ] || [] ).includes( layer.effect ) ) why.push( `${ blockName } does not qualify for ${ layer.effect } (generated-fx-qualifying-blocks.json)` );
			if ( 'root' !== target && ! target.startsWith( 'custom:' ) && ! part ) why.push( `${ blockName } declares no part "${ target }"` );
			rows.push( { target, effect: layer.effect, ok: 0 === why.length, why } );
		}
	}
	return rows;
}

function blockElements( blockName ) {
	const file = path.join( BLOCKS_DIR, blockName.replace( /^sgs\//, '' ), 'block.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).supports?.sgs?.elements || {} : {};
}

// ---- Self-test -------------------------------------------------------------------------------------------------

const read = ( over = {} ) => ( {
	fx: EFFECT, offMobile: null, offTablet: null, disableMobile: false, disableTablet: false, splitFragments: 12, ...over,
} );

async function fixtureChecks( rep ) {
	const items = collectMotion( JSON.parse( fs.readFileSync( FIXTURE, 'utf8' ) ) );
	const schema = JSON.parse( fs.readFileSync( SCHEMA_FILE, 'utf8' ) );
	const qualifying = JSON.parse( fs.readFileSync( QUALIFYING_FILE, 'utf8' ) );

	const placed = items.flatMap( ( item ) => placementProblems( item.block, item.motion, schema, qualifying, blockElements( item.block ) ).map( ( r ) => ( { className: item.className, ...r } ) ) );
	rep.check( 'fixture-placement', {
		selector: FIXTURE, property: 'each layer: schema x-target-level and x-part-kinds for its target, and the block qualifies for the effect',
		measured: placed, expected: 'three split-reveal layers on sgs/timeline root, each allowed where it sits',
		pass: 3 === placed.length && placed.every( ( r ) => r.ok ),
	} );
	const misplaced = [
		[ 'sgs/container', { v: 1, elements: { inner: { effects: [ { id: 'd', effect: 'draggable' } ] } } }, 'a block-level effect on a part of a block that does not qualify' ],
		[ 'sgs/timeline', { v: 1, elements: { root: { effects: [ { id: 'd', effect: 'draggable' } ] } } }, 'draggable on sgs/timeline, which no longer qualifies for it' ],
	];
	for ( const [ block, motion, why ] of misplaced ) {
		const rows = placementProblems( block, motion, schema, qualifying, blockElements( block ) );
		rep.control( 'fixture-placement', { property: `${ block } ${ JSON.stringify( motion.elements ) }`, measured: rows, why, red: rows.length > 0 && rows.every( ( r ) => ! r.ok ) } );
	}

	let checkMotion;
	try {
		checkMotion = ( await import( '../../../../scripts/computed-route/lib/motion-schema.mjs' ) ).checkMotion;
	} catch ( e ) {
		rep.check( 'fixture-schema', { selector: FIXTURE, pass: null, why: `the schema checker did not load (run npm ci in scripts/computed-route): ${ e.message }` } );
		return;
	}
	const verdicts = items.map( ( item ) => ( { className: item.className, ...checkMotion( item.motion ) } ) );
	rep.check( 'fixture-schema', {
		selector: FIXTURE, property: 'checkMotion (motion.schema.json plus the §10 and §5.2 refusals) on every sgsMotion',
		measured: verdicts.map( ( v ) => ( { className: v.className, valid: v.valid, errors: v.errors, refusals: v.refusals } ) ),
		expected: 'three motion docs (.mlo-a, .mlo-b, .mlo-c), each valid with no refusal',
		pass: 3 === verdicts.length && verdicts.every( ( v ) => v.valid ),
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
	const good = { a: read( { offMobile: EFFECT } ), b: read(), c: read( { offTablet: EFFECT } ) };

	rep.check( 'emitted', { pass: true === judgeEmitted( good ) } );
	rep.check( 'emitted:missing-row', { pass: null === judgeEmitted( { ...good, c: null } ) } );
	rep.control( 'emitted', { why: 'the old element-wide switch on .mlo-a', red: false === judgeEmitted( { ...good, a: read( { disableMobile: true } ) } ) } );
	rep.control( 'emitted', { why: 'the tablet off written as mobile on .mlo-c', red: false === judgeEmitted( { ...good, c: read( { offMobile: EFFECT } ) } ) } );

	const skipped = judgeRow( read( { offMobile: EFFECT, splitFragments: 0 } ), good.b, 'mobile' );
	rep.check( 'off-effect-skipped@mobile', { measured: skipped, pass: 'off-effect-skipped' === skipped.check && true === skipped.pass } );
	const ignored = judgeRow( good.a, good.b, 'mobile' );
	rep.control( 'off-effect-skipped@mobile', { why: 'the gate ignored: split-reveal booted at mobile on .mlo-a', measured: ignored, red: false === ignored.pass } );

	const cMobile = judgeRow( good.c, good.b, 'mobile' );
	rep.check( 'boots-off-tier@mobile', { measured: cMobile, pass: 'boots-off-tier' === cMobile.check && true === cMobile.pass } );
	const leaked = judgeRow( read( { offTablet: EFFECT, splitFragments: 0 } ), good.b, 'mobile' );
	rep.control( 'boots-off-tier@mobile', { why: 'a tablet-only off that also stopped mobile', measured: leaked, red: false === leaked.pass } );

	const cTablet = judgeRow( read( { offTablet: EFFECT, splitFragments: 0 } ), good.b, 'tablet' );
	rep.check( 'off-effect-skipped@tablet', { measured: cTablet, pass: 'off-effect-skipped' === cTablet.check && true === cTablet.pass } );
	const aDesktop = judgeRow( good.a, good.b, 'desktop' );
	rep.check( 'boots-off-tier@desktop', { measured: aDesktop, pass: true === aDesktop.pass } );
	const never = judgeRow( read( { offMobile: EFFECT, splitFragments: 0 } ), good.b, 'desktop' );
	rep.control( 'boots-off-tier@desktop', { why: 'split-reveal never booted at desktop either', measured: never, red: false === never.pass } );

	const noControl = judgeRow( good.a, read( { splitFragments: 0 } ), 'mobile' );
	rep.check( 'unanswered-without-control', { measured: noControl, pass: null === noControl.pass } );

	await fixtureChecks( rep );
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

/** One row's fx attributes and the split-reveal boot marker, read in the page. */
async function reading( page, selector ) {
	return page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el ) return null;
		const fragments = Array.from( el.querySelectorAll( 'div[aria-hidden="true"]' ) )
			.filter( ( d ) => 'relative' === d.style.position && 'inline-block' === d.style.display );
		return {
			fx: ( el.dataset.sgsFx || '' ).split( /\s+/ ).filter( Boolean ).join( ' ' ),
			offMobile: el.getAttribute( 'data-sgs-fx-off-mobile' ),
			offTablet: el.getAttribute( 'data-sgs-fx-off-tablet' ),
			disableMobile: el.hasAttribute( 'data-sgs-fx-disable-mobile' ),
			disableTablet: el.hasAttribute( 'data-sgs-fx-disable-tablet' ),
			splitFragments: fragments.length,
			ariaLabel: el.getAttribute( 'aria-label' ),
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
			reduce: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
			tier: matchMedia( '(max-width: 767px)' ).matches ? 'mobile' : matchMedia( '(max-width: 1023px)' ).matches ? 'tablet' : 'desktop',
		} ) );
		const sel = ( k ) => `${ ROWS[ k ] }[data-sgs-fx]`;
		const missing = [];
		for ( const k of Object.keys( ROWS ) ) if ( ! ( await page.$( sel( k ) ) ) ) missing.push( sel( k ) );
		if ( missing.length ) {
			rep.check( 'emitted', { pass: null, measured: missing, why: 'rows missing (build tests/fixtures/motion/pages/layer-off-per-effect.json)' } );
			return;
		}
		if ( env.reduce ) {
			rep.check( 'boot', { pass: null, measured: env, why: 'split-reveal does not boot under a reduced-motion preference' } );
			return;
		}
		await settleInView( page, ROWS.b );
		// The control boots split-reveal at every width, so its fragments say the Tier G modules have run.
		const ran = await page.waitForFunction( ( s ) => {
			const el = document.querySelector( s );
			return !! el && Array.from( el.querySelectorAll( 'div[aria-hidden="true"]' ) ).some( ( d ) => 'inline-block' === d.style.display );
		}, sel( 'b' ), { polling: 100, timeout: BOOT_TIMEOUT } ).then( () => true, () => false );
		await page.waitForTimeout( 400 );
		const r = {};
		for ( const k of Object.keys( ROWS ) ) r[ k ] = await reading( page, sel( k ) );
		const ctx = { tier: env.tier };
		const show = ( x ) => ( { offMobile: x.offMobile, offTablet: x.offTablet, splitFragments: x.splitFragments, ariaLabel: !! x.ariaLabel, booted: booted( x ) } );

		const emitted = judgeEmitted( r );
		rep.check( 'emitted', {
			selector: Object.values( ROWS ).join( ', ' ), property: 'data-sgs-fx, data-sgs-fx-off-mobile, data-sgs-fx-off-tablet, data-sgs-fx-disable-*',
			measured: Object.fromEntries( Object.entries( r ).map( ( [ k, x ] ) => [ k, { fx: x.fx, offMobile: x.offMobile, offTablet: x.offTablet, disableMobile: x.disableMobile, disableTablet: x.disableTablet } ] ) ),
			expected: 'all "split-reveal"; off-mobile only on .mlo-a, off-tablet only on .mlo-c; no element-wide switch',
			pass: emitted ? true : null, why: emitted ? '' : 'the rendered attributes do not match the fixture, so the boot checks would not test the gate',
		} );
		if ( ! emitted ) return;
		if ( ! ran ) {
			rep.check( 'boot', { ...ctx, selector: sel( 'b' ), measured: show( r.b ), pass: null, why: `the control's split-reveal never booted within ${ BOOT_TIMEOUT }ms (Tier G modules not loaded)` } );
			return;
		}
		rep.check( 'control-boots', { ...ctx, selector: sel( 'b' ), measured: show( r.b ), expected: 'split-reveal booted (SplitText fragments)', pass: booted( r.b ) } );
		for ( const k of [ 'a', 'c' ] ) {
			const j = judgeRow( r[ k ], r.b, env.tier );
			rep.check( j.check, {
				...ctx, selector: sel( k ), property: 'SplitText fragments (inline position:relative; display:inline-block, aria-hidden)', measured: show( r[ k ] ),
				expected: 'off-effect-skipped' === j.check ? 'split-reveal not booted' : 'split-reveal booted',
				pass: j.pass, why: null === j.pass ? 'the control did not boot split-reveal at this width, so this row has nothing to be compared with' : '',
			} );
		}
		if ( 'desktop' !== env.tier ) {
			const asOff = judgeRow( { ...r.b, [ 'mobile' === env.tier ? 'offMobile' : 'offTablet' ]: EFFECT }, r.b, env.tier );
			rep.control( 'off-effect-skipped', {
				...ctx, selector: sel( 'b' ), property: 'the off-effect-skipped judge fed the control row as if it listed this tier', measured: show( r.b ),
				expected: 'red: a split-reveal that boots here shows on the marker, so the skip on the off row is not vacuous',
				red: null === asOff.pass ? null : ! asOff.pass,
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
