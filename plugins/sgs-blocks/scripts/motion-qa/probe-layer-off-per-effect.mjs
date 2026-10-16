/**
 * Spec 38A FR-38A-23 (per-effect `off`): live proof that a motion layer's per-device `off` switches off only its own
 * Tier G effect, never a sibling effect on the same element.
 *
 * FIXTURE: tests/fixtures/motion/pages/layer-off-per-effect.json, built with scripts/wp-build-page.js. Three horizontal
 * `sgs/timeline` blocks (mobile layout carousel, the block's own reveal off), each with two Tier G layers on
 * `elements.root`: an `entrance.text` split-reveal and an `effects` draggable. That is the only kind of Tier G pair the
 * renderer keeps on one element (every other pair is dropped by the `tier-g-shared-scroll-settings` refusal), both
 * effects allow the root (draggable `x-target-level` block, split-reveal part with text kinds, which the root takes), and
 * sgs/timeline qualifies for both in generated-fx-qualifying-blocks.json.
 *   .mlo-a  draggable off on mobile. Rendered data-sgs-fx-off-mobile="draggable". Proves the sibling (split-reveal)
 *           still boots at 375: the old element-wide switch stopped it.
 *   .mlo-b  the control: both layers, no off.
 *   .mlo-c  split-reveal off on mobile. Rendered data-sgs-fx-off-mobile="split-reveal". Proves the listed effect skips
 *           boot at 375 and boots at 1440.
 *
 * BOOT MARKERS, read from what each effect's boot writes into the DOM (never a computed style):
 *   split-reveal  fx-split-reveal.js::initSplitReveal runs SplitText.create( el, { aria: 'auto' } ), whose word
 *                 wrappers are `<div aria-hidden="true">` with inline `position: relative; display: inline-block`
 *                 (gsap SplitText.js `_getWrapper`). SGS blocks render no inline style (Spec 32), so a descendant with
 *                 those inline declarations is a SplitText fragment. SplitText also writes `aria-label` on the element.
 *   draggable     fx-draggable.js::bindDrag sets `el.style.cursor = 'grab'` when initDraggable boots, which needs a fine
 *                 pointer and the element ITSELF to be an overflowing `overflow-x: auto|scroll` scroller.
 *                 ⚠ The timeline root is not one (its scroller is the child `.sgs-timeline__list`), so draggable cannot
 *                 boot on a timeline root at any width. Every draggable check is therefore answered only when the
 *                 control row boots draggable at that width, and is UNANSWERED with that reason otherwise.
 *
 * WHAT IT CHECKS (each engine, at 375 and 1440 wide). A check on .mlo-a or .mlo-c is answered only when the control
 * .mlo-b booted the same effect at the same width, so a pass is never read off an effect that cannot boot here:
 *   emitted              data-sgs-fx names both effects on all three; off-mobile is "draggable" on .mlo-a,
 *                        "split-reveal" on .mlo-c and absent on .mlo-b (a mismatch means the fixture or emitter: UNANSWERED).
 *   off-effect-skipped   an effect in the row's off-mobile list has not booted at 375 and has booted at 1440.
 *   sibling-boots        an effect not in the row's off list has booted at both widths.
 *   control-boots        .mlo-b booted each effect.
 *   Live negative control: the off-effect-skipped judge fed .mlo-b's 375 split-reveal reading must go red.
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
const ROWS = { a: '.mlo-a', b: '.mlo-b', c: '.mlo-c' };
const EFFECTS = [ 'split-reveal', 'draggable' ];
const EXPECTED_OFF = { a: 'draggable', b: null, c: 'split-reveal' };
const WIDTHS = [ 375, 1440 ];
const HEIGHT = 900;
const ENGINES = [ 'chromium', 'firefox', 'webkit' ];
const BOOT_TIMEOUT = 10000;

// ---- Pure judges -----------------------------------------------------------------------------------------------

const tokens = ( value ) => ( value || '' ).split( /\s+/ ).filter( Boolean );

/** Which effects booted, from one element's reading. */
export function booted( reading ) {
	return {
		draggable: 'grab' === reading.cursor || 'grabbing' === reading.cursor,
		'split-reveal': reading.splitFragments > 0,
	};
}

/** The rendered attributes match the fixture on every row. Null when a row is missing. */
export function judgeEmitted( readings ) {
	if ( Object.keys( ROWS ).some( ( k ) => ! readings[ k ] ) ) return null;
	return Object.entries( EXPECTED_OFF ).every( ( [ k, off ] ) => {
		const r = readings[ k ];
		return EFFECTS.every( ( e ) => tokens( r.fx ).includes( e ) ) &&
			( null === off ? null === r.offMobile : off === tokens( r.offMobile ).join( ' ' ) ) &&
			null === r.offTablet && ! r.disableMobile;
	} );
}

/**
 * One effect on one row at one tier. Returns { check, pass } where pass is null when the control did not boot this
 * effect here (nothing to compare against), else whether the row behaved as its off list says.
 */
export function judgeEffect( row, control, effect, tier ) {
	const off = 'mobile' === tier && tokens( row.offMobile ).includes( effect );
	const check = tokens( row.offMobile ).includes( effect ) ? 'off-effect-skipped' : 'sibling-boots';
	if ( ! booted( control )[ effect ] ) return { check, pass: null };
	return { check, pass: off ? ! booted( row )[ effect ] : booted( row )[ effect ] };
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
	fx: 'split-reveal draggable', offMobile: null, offTablet: null, disableMobile: false, cursor: 'grab', splitFragments: 12, ...over,
} );

async function fixtureChecks( rep ) {
	const tree = JSON.parse( fs.readFileSync( FIXTURE, 'utf8' ) );
	const items = collectMotion( tree );
	const schema = JSON.parse( fs.readFileSync( SCHEMA_FILE, 'utf8' ) );
	const qualifying = JSON.parse( fs.readFileSync( QUALIFYING_FILE, 'utf8' ) );

	const placed = items.flatMap( ( item ) => placementProblems( item.block, item.motion, schema, qualifying, blockElements( item.block ) ).map( ( r ) => ( { className: item.className, ...r } ) ) );
	rep.check( 'fixture-placement', {
		selector: FIXTURE, property: 'each layer: schema x-target-level and x-part-kinds for its target, and the block qualifies for the effect',
		measured: placed, expected: 'six layers (three timelines x split-reveal, draggable), every one allowed where it sits',
		pass: 6 === placed.length && placed.every( ( r ) => r.ok ),
	} );
	// Negative control: the draggable on sgs/container's `inner` part (a part target; container does not qualify).
	const wrong = placementProblems( 'sgs/container', { v: 1, elements: { inner: { effects: [ { id: 'd', effect: 'draggable' } ] } } }, schema, qualifying, blockElements( 'sgs/container' ) );
	rep.control( 'fixture-placement', {
		property: 'draggable on sgs/container part "inner"', measured: wrong, expected: 'refused: block-level effect on a part, and a non-qualifying block',
		red: wrong.length > 0 && wrong.every( ( r ) => ! r.ok ),
	} );

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
	const good = { a: read( { offMobile: 'draggable' } ), b: read(), c: read( { offMobile: 'split-reveal' } ) };

	rep.check( 'emitted', { pass: true === judgeEmitted( good ) } );
	rep.check( 'emitted:missing-row', { pass: null === judgeEmitted( { ...good, c: null } ) } );
	rep.control( 'emitted', { why: 'the old element-wide switch on .mlo-a', red: false === judgeEmitted( { ...good, a: read( { offMobile: null, disableMobile: true } ) } ) } );
	rep.control( 'emitted', { why: 'an off list that also names the sibling', red: false === judgeEmitted( { ...good, a: read( { offMobile: 'draggable split-reveal' } ) } ) } );

	// .mlo-a at mobile: draggable off and absent, split-reveal (the sibling) booted.
	const aMobile = read( { offMobile: 'draggable', cursor: '' } );
	const sib = judgeEffect( aMobile, good.b, 'split-reveal', 'mobile' );
	rep.check( 'sibling-boots@mobile', { measured: sib, pass: 'sibling-boots' === sib.check && true === sib.pass } );
	const oldGate = judgeEffect( read( { offMobile: 'draggable', cursor: '', splitFragments: 0 } ), good.b, 'split-reveal', 'mobile' );
	rep.control( 'sibling-boots@mobile', { why: 'the old element-wide gate: the sibling did not boot on .mlo-a', measured: oldGate, red: false === oldGate.pass } );

	// .mlo-c: split-reveal off at mobile, booted at desktop.
	const cMobile = read( { offMobile: 'split-reveal', splitFragments: 0 } );
	const skip = judgeEffect( cMobile, good.b, 'split-reveal', 'mobile' );
	rep.check( 'off-effect-skipped@mobile', { measured: skip, pass: 'off-effect-skipped' === skip.check && true === skip.pass } );
	const desk = judgeEffect( good.c, good.b, 'split-reveal', 'desktop' );
	rep.check( 'off-effect-skipped@desktop', { measured: desk, pass: true === desk.pass } );
	const ignored = judgeEffect( good.c, good.b, 'split-reveal', 'mobile' );
	rep.control( 'off-effect-skipped@mobile', { why: 'the gate ignored: split-reveal booted at mobile on .mlo-c', measured: ignored, red: false === ignored.pass } );
	const never = judgeEffect( cMobile, good.b, 'split-reveal', 'desktop' );
	rep.control( 'off-effect-skipped@desktop', { why: 'split-reveal never booted at desktop either', measured: never, red: false === never.pass } );

	// A control that cannot boot the effect leaves the row unanswered, never a pass.
	const noControl = judgeEffect( aMobile, read( { cursor: '' } ), 'draggable', 'mobile' );
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

/** One row's fx attributes, the boot markers and the draggable precondition, read in the page. */
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
			cursor: el.style.cursor,
			splitFragments: fragments.length,
			ariaLabel: el.getAttribute( 'aria-label' ),
			rootScroller: [ 'auto', 'scroll' ].includes( getComputedStyle( el ).overflowX ) && el.scrollWidth > el.clientWidth,
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
		const sel = ( k ) => `${ ROWS[ k ] }[data-sgs-fx]`;
		const missing = [];
		for ( const k of Object.keys( ROWS ) ) if ( ! ( await page.$( sel( k ) ) ) ) missing.push( sel( k ) );
		if ( missing.length ) {
			rep.check( 'emitted', { pass: null, measured: missing, why: 'rows missing (build tests/fixtures/motion/pages/layer-off-per-effect.json)' } );
			return;
		}
		if ( ! env.fine || env.reduce ) {
			rep.check( 'boot', { pass: null, measured: env, why: 'draggable needs a fine pointer and split-reveal needs no reduced-motion preference' } );
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
		const show = ( x ) => ( { offMobile: x.offMobile, cursor: x.cursor, splitFragments: x.splitFragments, ariaLabel: !! x.ariaLabel, rootScroller: x.rootScroller, booted: booted( x ) } );

		const emitted = judgeEmitted( r );
		rep.check( 'emitted', {
			selector: Object.values( ROWS ).join( ', ' ), property: 'data-sgs-fx, data-sgs-fx-off-mobile, data-sgs-fx-off-tablet, data-sgs-fx-disable-mobile',
			measured: Object.fromEntries( Object.entries( r ).map( ( [ k, x ] ) => [ k, { fx: x.fx, offMobile: x.offMobile, offTablet: x.offTablet, disableMobile: x.disableMobile } ] ) ),
			expected: 'all name split-reveal and draggable; off-mobile "draggable" on .mlo-a, "split-reveal" on .mlo-c, none on .mlo-b',
			pass: emitted ? true : null, why: emitted ? '' : 'the rendered attributes do not match the fixture, so the boot checks would not test the gate',
		} );
		if ( ! emitted ) return;
		if ( ! ran ) {
			rep.check( 'boot', { ...ctx, selector: sel( 'b' ), measured: show( r.b ), pass: null, why: `the control's split-reveal never booted within ${ BOOT_TIMEOUT }ms (Tier G modules not loaded)` } );
			return;
		}

		for ( const effect of EFFECTS ) {
			const controlBooted = booted( r.b )[ effect ];
			rep.check( 'control-boots', {
				...ctx, effect, selector: sel( 'b' ), measured: show( r.b ), expected: `${ effect } booted`,
				pass: controlBooted ? true : 'draggable' === effect && ! r.b.rootScroller ? null : false,
				why: controlBooted ? '' : 'draggable' === effect && ! r.b.rootScroller
					? 'the timeline root is not an overflowing overflow-x scroller (its scroller is .sgs-timeline__list), so initDraggable declines to boot on it'
					: '',
			} );
			for ( const k of [ 'a', 'c' ] ) {
				const j = judgeEffect( r[ k ], r.b, effect, env.tier );
				rep.check( j.check, {
					...ctx, effect, selector: sel( k ), measured: show( r[ k ] ),
					expected: 'off-effect-skipped' === j.check && 'mobile' === env.tier ? `${ effect } not booted` : `${ effect } booted`,
					pass: j.pass, why: null === j.pass ? `the control did not boot ${ effect } at this width, so this row has nothing to be compared with` : '',
				} );
			}
		}
		if ( 'mobile' === env.tier ) {
			const asControl = judgeEffect( { ...r.b, offMobile: 'split-reveal' }, r.b, 'split-reveal', 'mobile' );
			rep.control( 'off-effect-skipped', {
				...ctx, selector: sel( 'b' ), property: 'the off-effect-skipped judge fed the control row as if it listed split-reveal off', measured: show( r.b ),
				expected: 'red: a split-reveal that boots at mobile shows on the marker, so the pass on .mlo-c is not vacuous',
				red: null === asControl.pass ? null : ! asControl.pass,
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
