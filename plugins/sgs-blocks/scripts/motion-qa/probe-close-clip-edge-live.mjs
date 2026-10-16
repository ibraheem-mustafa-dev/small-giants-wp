/**
 * Probe: on a live page, a one-edge clip wipe with a stored close value closes only its own edge (Spec 38A §10 clip-path
 * row, FR-38A-8's per-edge close). The offline twin is `probe-close-clip-edges.mjs` (the real stylesheets, planted
 * holders); this one reads what the shipped emitter printed and what the engine plays.
 *
 * FIXTURE: tests/fixtures/motion/pages/close-clip-edge.json. `.mce-edge` opens from clip 100 on the bottom edge and stores
 * a close clip of 40; `.mce-all` is the control, the same values on clipEdge all. Both use a linear 600ms close.
 * Every expectation (edge, close amount, close duration) is read from that tree, not from the CSS.
 *
 * OPENING AND CLOSING: the panels are generic containers with no script of their own, so the probe plays the owning
 * block's part, as `probe-drawer-entrances.mjs` does: it imports `@sgs/motion-state` through the page's import map (the
 * `open` trigger enqueues it) and calls `setMotionState( el, 'open', true )`, then `( el, 'open', false )`, which turns
 * the host's `open` into `close`. If the module cannot load it writes the same attribute values itself; each row's
 * `driver` says which ran.
 *
 * WHAT IT READS: after the open animation is finished, the close animation `sgs-me-close-clip-path` is paused and seeked
 * to half of its active duration, then finished (fill both holds the end). At each point it reads the computed
 * `clip-path` (an `inset()` parsed to shares of the element's border box) and the four edge owners `--sgs-me-clip-t/r/b/l`.
 * Before opening it reads the emitted close holders `--sgs-me-close-to-clip` and `--sgs-me-close-to-clip-t/r/b/l`.
 * A second context under `prefers-reduced-motion: reduce` repeats the open and close and reads the held end state.
 *
 * CHECKS (per engine and width)
 *   markup:<id>        the element carries data-sgs-me with `open` and `clip-path`
 *   holders:<id>       edge: -t/-r/-l 0%, -b the close amount, no uniform holder; all: the uniform holder only
 *   held-open:<id>     once open, every edge reads 0
 *   close-duration:<id> the close animation runs for the stored closeDuration
 *   close-mid:<id>     at half the close: edge reads [0, 0, amount/2, 0]; all reads amount/2 on four edges
 *   close-moving:<id>  the edges that moved at half the close: ["bottom"] for edge, all four for the control
 *   close-end:<id>     the held close: edge [0, 0, amount, 0]; all amount on four edges
 *   reduced-close:<id> under reduced motion: no close animation and the end state at once
 * NEGATIVE CONTROLS (must come out red)
 *   holders:edge/control      the edge holders judged as the uniform shape
 *   close-mid:edge/control    the one-edge reading judged against the four-edge expectation (the pre-fix collapse)
 *   close-mid:all/control     the control's four-edge reading judged against the one-edge expectation
 *   close-moving:all/control  the control's moving edges judged as one edge
 *   close-end:edge/control    the edge end state judged against the from-value fallback (bottom 100%), so the stored
 *                             close value, not the fallback, is what closed it
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-close-clip-edge-live.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown]
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-close-clip-edge-live.mjs --self-test   (offline: the judges on fabricated readings and the fixture's shape and schema)
 *   SGS_HEADED=1 runs real Chrome headed for Chromium (the host's bot check).
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain (a challenged page, a missing element, or no browser).
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, siteBase, Reporter, near, gotoThroughCheck, settleInView, launchOptions, FIXTURE_DIR } from './probe-motion-model-lib.mjs';
import { parseInset } from './probe-drawer-entrances-lib.mjs';

export const FIXTURE_FILE = path.join( FIXTURE_DIR, 'close-clip-edge.json' );
export const EDGE_SEL = '.mce-edge';
export const ALL_SEL = '.mce-all';
export const EDGES = [ 'top', 'right', 'bottom', 'left' ];
const SUFFIX = { top: 't', right: 'r', bottom: 'b', left: 'l' };
/** Share of the box an edge may differ by (1.5% of a 320px panel is under 5px). */
export const TOLERANCE = 0.015;
/** An edge has moved when its inset is over this share of the box. */
export const MOVED = 0.02;
const DURATION_TOLERANCE_MS = 2;
const HEIGHT = 900;

// ---- The fixture's values ---------------------------------------------------------------------------------------

/** The `open` entrance base layer of the block with `className` in a tree, or null. */
function findBase( blocks, className ) {
	for ( const b of blocks ) {
		const attrs = b.attributes || {};
		if ( ( attrs.className || '' ).split( /\s+/ ).includes( className ) ) {
			return attrs.sgsMotion?.elements?.root?.entrance?.base || null;
		}
		const inner = findBase( b.innerBlocks || [], className );
		if ( inner ) return inner;
	}
	return null;
}

/** Each panel's edge, close amount (a share, 0 to 1) and close duration, read from the fixture tree. */
export function fixtureSpec( tree ) {
	const out = {};
	for ( const [ id, sel ] of [ [ 'edge', EDGE_SEL ], [ 'all', ALL_SEL ] ] ) {
		const base = findBase( tree, sel.slice( 1 ) );
		if ( ! base ) return null;
		const from = base.values?.from || {};
		out[ id ] = {
			selector: sel,
			trigger: base.trigger,
			edge: from.clipEdge || 'all',
			fromAmount: Number( from.clip ) / 100,
			amount: Number( base.close?.to?.clip ) / 100,
			closeDuration: Number( base.close?.closeDuration ),
			closeEasing: base.close?.closeEasing,
		};
	}
	return out;
}

// ---- Pure judges ------------------------------------------------------------------------------------------------

/** The four edges as shares of the box, from a computed `clip-path`, or null when it is not a readable inset(). */
export function insetShares( clipPath, width, height ) {
	const px = parseInset( clipPath, width, height );
	if ( ! px || ! width || ! height ) return null;
	return { top: px.top / height, right: px.right / width, bottom: px.bottom / height, left: px.left / width };
}

/** The expected shares at `progress` (0 to 1) of a linear close from inset(0) to `amount` on `edge` (or all four). */
export function expectedClose( edge, amount, progress ) {
	const out = {};
	for ( const e of EDGES ) out[ e ] = 'all' === edge || e === edge ? amount * progress : 0;
	return out;
}

/** Every edge within the tolerance of the wanted share. */
export function judgeShares( shares, want, tol = TOLERANCE ) {
	return !! shares && !! want && EDGES.every( ( e ) => near( shares[ e ], want[ e ], tol ) );
}

/** The edges whose inset is over the moved threshold, in inset() order. */
export function movingEdges( shares, threshold = MOVED ) {
	return shares ? EDGES.filter( ( e ) => shares[ e ] > threshold ) : null;
}

/** The edges a close on `edge` must move. */
export const wantMoving = ( edge ) => ( 'all' === edge ? [ ...EDGES ] : [ edge ] );

/** Two edge lists are the same set in the same order. */
export const sameEdges = ( a, b ) => Array.isArray( a ) && Array.isArray( b ) && a.length === b.length && a.every( ( e, i ) => e === b[ i ] );

/** The emitted close holders: a single edge writes four per-edge holders and no uniform one; `all` writes the uniform one only. */
export function judgeHolders( holders, edge, amount ) {
	if ( ! holders ) return false;
	const pct = `${ Math.round( amount * 100 ) }%`;
	if ( 'all' === edge ) {
		return holders.uniform === pct && EDGES.every( ( e ) => '' === holders[ e ] );
	}
	return '' === holders.uniform && EDGES.every( ( e ) => holders[ e ] === ( e === edge ? pct : '0%' ) );
}

// ---- In-page readers --------------------------------------------------------------------------------------------

/** Set the open state on (true) or turn it to close (false), through `@sgs/motion-state` when it loads. */
export const drive = async ( [ sel, on ] ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	let mod = null;
	try {
		mod = await import( '@sgs/motion-state' );
	} catch ( e ) {
		mod = null;
	}
	if ( mod && 'function' === typeof mod.setMotionState ) {
		mod.setMotionState( el, 'open', on );
		return 'module';
	}
	const now = ( el.getAttribute( 'data-sgs-motion-state' ) || '' ).split( /\s+/ ).filter( Boolean );
	el.setAttribute( 'data-sgs-motion-state', on ? 'open' : ( now.includes( 'open' ) ? 'close' : '' ) );
	return 'attribute';
};

/** The element's markup tokens and emitted close holders. */
export const readHolders = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const cs = getComputedStyle( el );
	const get = ( p ) => cs.getPropertyValue( p ).trim();
	return {
		me: el.getAttribute( 'data-sgs-me' ) || '',
		holders: {
			uniform: get( '--sgs-me-close-to-clip' ),
			top: get( '--sgs-me-close-to-clip-t' ),
			right: get( '--sgs-me-close-to-clip-r' ),
			bottom: get( '--sgs-me-close-to-clip-b' ),
			left: get( '--sgs-me-close-to-clip-l' ),
		},
	};
};

/**
 * The clip reading. `mode`: 'finish' finishes every animation on the element first; a number seeks the close animation
 * to that share of its active duration and pauses it; 'end' finishes the close animation; null reads as it is.
 */
export const readClip = ( [ sel, mode ] ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const close = el.getAnimations().find( ( a ) => 'sgs-me-close-clip-path' === a.animationName ) || null;
	let timing = null;
	if ( 'finish' === mode ) {
		el.getAnimations().forEach( ( a ) => a.finish() );
	} else if ( close && 'number' === typeof mode ) {
		const t = close.effect.getComputedTiming();
		timing = { delay: t.delay, activeDuration: t.activeDuration };
		close.pause();
		close.currentTime = t.delay + mode * t.activeDuration;
	} else if ( close && 'end' === mode ) {
		close.finish();
	}
	const cs = getComputedStyle( el );
	return {
		state: el.getAttribute( 'data-sgs-motion-state' ),
		clipPath: cs.clipPath,
		width: el.offsetWidth,
		height: el.offsetHeight,
		owners: [ 't', 'r', 'b', 'l' ].map( ( e ) => cs.getPropertyValue( `--sgs-me-clip-${ e }` ).trim() ),
		closePlaying: !! close,
		timing,
		animations: el.getAnimations().map( ( a ) => a.animationName ),
	};
};

// ---- Live checks ------------------------------------------------------------------------------------------------

const shares = ( r ) => ( r ? insetShares( r.clipPath, r.width, r.height ) : null );
const round = ( s ) => ( s ? Object.fromEntries( EDGES.map( ( e ) => [ e, +s[ e ].toFixed( 3 ) ] ) ) : null );

export async function panelChecks( page, rep, id, spec ) {
	const sel = spec.selector;
	if ( ! ( await settleInView( page, sel ) ) ) {
		rep.check( `markup:${ id }`, { selector: sel, pass: null, why: `no ${ sel } element on the page (is it built from close-clip-edge.json?)` } );
		return;
	}
	const pre = await page.evaluate( readHolders, sel );
	const tokens = pre.me.split( /\s+/ );
	rep.check( `markup:${ id }`, { selector: sel, property: 'data-sgs-me', measured: pre.me, expected: 'open … clip-path', pass: tokens[ 0 ] === 'open' && tokens.includes( 'clip-path' ) } );
	rep.check( `holders:${ id }`, { selector: sel, property: 'computed close holders', measured: pre.holders, expected: 'all' === spec.edge ? { uniform: `${ spec.amount * 100 }%` } : { [ spec.edge ]: `${ spec.amount * 100 }%`, others: '0%', uniform: '' }, pass: judgeHolders( pre.holders, spec.edge, spec.amount ) } );
	if ( 'all' !== spec.edge ) {
		rep.control( `holders:${ id }`, { selector: sel, property: 'the same holders judged as the uniform shape', measured: pre.holders, expected: 'uniform holder only', red: ! judgeHolders( pre.holders, 'all', spec.amount ) } );
	}

	const driver = await page.evaluate( drive, [ sel, true ] );
	await page.waitForTimeout( 60 );
	const opened = await page.evaluate( readClip, [ sel, 'finish' ] );
	rep.check( `held-open:${ id }`, { selector: sel, property: 'clip-path once open (shares of the box)', measured: { driver, state: opened.state, clipPath: opened.clipPath, shares: round( shares( opened ) ) }, expected: expectedClose( spec.edge, spec.amount, 0 ), pass: judgeShares( shares( opened ), expectedClose( spec.edge, spec.amount, 0 ) ) } );

	await page.evaluate( drive, [ sel, false ] );
	await page.waitForTimeout( 60 );
	const mid = await page.evaluate( readClip, [ sel, 0.5 ] );
	if ( ! mid.closePlaying ) {
		rep.check( `close-mid:${ id }`, { selector: sel, pass: false, measured: { driver, state: mid.state, animations: mid.animations }, why: 'no sgs-me-close-clip-path animation runs once the host closes' } );
		return;
	}
	rep.check( `close-duration:${ id }`, { selector: sel, property: 'close animation active duration (ms)', measured: mid.timing, expected: spec.closeDuration, pass: near( mid.timing.activeDuration, spec.closeDuration, DURATION_TOLERANCE_MS ) } );
	const midShares = shares( mid );
	const wantMid = expectedClose( spec.edge, spec.amount, 0.5 );
	rep.check( `close-mid:${ id }`, { selector: sel, property: 'clip-path at half the close (shares of the box)', measured: { driver, clipPath: mid.clipPath, owners: mid.owners, shares: round( midShares ) }, expected: wantMid, pass: judgeShares( midShares, wantMid ) } );
	const otherEdge = 'all' === spec.edge ? 'bottom' : 'all';
	rep.control( `close-mid:${ id }`, { selector: sel, property: `the reading judged against the ${ otherEdge } expectation`, measured: round( midShares ), expected: expectedClose( otherEdge, spec.amount, 0.5 ), red: ! judgeShares( midShares, expectedClose( otherEdge, spec.amount, 0.5 ) ) } );
	const moving = movingEdges( midShares );
	rep.check( `close-moving:${ id }`, { selector: sel, property: 'edges moving at half the close', measured: moving, expected: wantMoving( spec.edge ), pass: sameEdges( moving, wantMoving( spec.edge ) ) } );
	if ( 'all' === spec.edge ) {
		rep.control( `close-moving:${ id }`, { selector: sel, property: 'the moving edges judged as one bottom edge', measured: moving, expected: [ 'bottom' ], red: ! sameEdges( moving, [ 'bottom' ] ) } );
	}

	const end = await page.evaluate( readClip, [ sel, 'end' ] );
	const endShares = shares( end );
	const wantEnd = expectedClose( spec.edge, spec.amount, 1 );
	rep.check( `close-end:${ id }`, { selector: sel, property: 'clip-path held once closed (shares of the box)', measured: { clipPath: end.clipPath, owners: end.owners, shares: round( endShares ) }, expected: wantEnd, pass: judgeShares( endShares, wantEnd ) } );
	if ( 'all' !== spec.edge ) {
		const fallback = expectedClose( spec.edge, spec.fromAmount, 1 );
		rep.control( `close-end:${ id }`, { selector: sel, property: 'the end state judged against the from-value fallback', measured: round( endShares ), expected: fallback, red: ! judgeShares( endShares, fallback ) } );
	}
}

export async function reducedChecks( page, rep, id, spec ) {
	const sel = spec.selector;
	if ( ! ( await settleInView( page, sel ) ) ) {
		rep.check( `reduced-close:${ id }`, { selector: sel, pass: null, why: `no ${ sel } element on the page` } );
		return;
	}
	await page.evaluate( drive, [ sel, true ] );
	await page.waitForTimeout( 60 );
	await page.evaluate( drive, [ sel, false ] );
	await page.waitForTimeout( 60 );
	const r = await page.evaluate( readClip, [ sel, null ] );
	const want = expectedClose( spec.edge, spec.amount, 1 );
	rep.check( `reduced-close:${ id }`, { selector: sel, property: 'clip-path at once after close under reduced motion; close animation', measured: { state: r.state, clipPath: r.clipPath, shares: round( shares( r ) ), closePlaying: r.closePlaying }, expected: { shares: want, closePlaying: false }, pass: ! r.closePlaying && judgeShares( shares( r ), want ) } );
}

// ---- Self-test --------------------------------------------------------------------------------------------------

async function selfTest() {
	const rep = new Reporter( { mode: 'self-test' } );
	const tree = JSON.parse( fs.readFileSync( FIXTURE_FILE, 'utf8' ) );
	const spec = fixtureSpec( tree );
	rep.check( 'fixture-shape', {
		property: 'both panels on the open trigger, edge bottom against all, the same close amount and duration, linear',
		measured: spec,
		expected: 'edge: bottom; all: all; same amount and closeDuration; amount differs from the from-value',
		pass: !! spec && spec.edge.trigger === 'open' && spec.all.trigger === 'open' && spec.edge.edge === 'bottom' && spec.all.edge === 'all' &&
			spec.edge.amount === spec.all.amount && spec.edge.amount > 0 && spec.edge.amount !== spec.edge.fromAmount &&
			spec.edge.closeDuration === spec.all.closeDuration && spec.edge.closeDuration > 0 && spec.edge.closeEasing === 'linear',
	} );
	let checkMotion = null;
	try {
		( { checkMotion } = await import( '../../../../scripts/computed-route/lib/motion-schema.mjs' ) );
	} catch ( e ) {
		rep.check( 'fixture-schema', { pass: null, why: `the schema checker could not load (${ e.message })` } );
	}
	if ( checkMotion ) {
		const verdicts = [ EDGE_SEL, ALL_SEL ].map( ( sel ) => {
			const find = ( blocks ) => {
				for ( const b of blocks ) {
					if ( ( b.attributes?.className || '' ).split( /\s+/ ).includes( sel.slice( 1 ) ) ) return b.attributes.sgsMotion;
					const inner = find( b.innerBlocks || [] );
					if ( inner ) return inner;
				}
				return null;
			};
			const v = checkMotion( find( tree ) );
			return { sel, valid: v.valid, errors: [ ...v.errors, ...v.refusals ] };
		} );
		rep.check( 'fixture-schema', { property: 'each sgsMotion value against motion.schema.json and the refusals', measured: verdicts, expected: 'valid', pass: verdicts.every( ( v ) => v.valid ) } );
		const planted = checkMotion( { v: 1, elements: { root: { entrance: { base: { trigger: 'open', values: { from: { clip: 100, clipEdge: 'bottom' } }, close: { to: { clip: 40, clipEdge: 'bottom' } } } } } } } );
		rep.control( 'fixture-schema', { property: 'a planted clipEdge inside close.to (EntranceCloseTo has no edge)', measured: planted.valid, expected: false, red: ! planted.valid } );
	}

	const amount = spec ? spec.edge.amount : 0.4;
	const W = 320;
	const H = 320;
	const pct = ( s ) => `${ +( s * 100 ).toFixed( 4 ) }%`;
	const good = {
		edgeMid: `inset(0px 0px ${ pct( amount / 2 ) } 0px)`,
		edgeEnd: `inset(0px 0px ${ pct( amount ) })`,
		allMid: `inset(${ pct( amount / 2 ) })`,
		allEnd: `inset(${ pct( amount ) } ${ pct( amount ) } ${ pct( amount ) } ${ pct( amount ) })`,
	};
	const bad = {
		collapsedMid: `inset(${ pct( amount / 2 ) })`,
		fallbackEnd: 'inset(0px 0px 100% 0px)',
		openHeld: 'inset(0px)',
	};
	const s = ( v ) => insetShares( v, W, H );

	rep.check( 'judge:edge-mid', { measured: good.edgeMid, expected: expectedClose( 'bottom', amount, 0.5 ), pass: judgeShares( s( good.edgeMid ), expectedClose( 'bottom', amount, 0.5 ) ) } );
	rep.check( 'judge:edge-moving', { measured: movingEdges( s( good.edgeMid ) ), expected: [ 'bottom' ], pass: sameEdges( movingEdges( s( good.edgeMid ) ), wantMoving( 'bottom' ) ) } );
	rep.check( 'judge:edge-end-px', { measured: `inset(0px 0px ${ amount * H }px 0px)`, expected: expectedClose( 'bottom', amount, 1 ), pass: judgeShares( s( `inset(0px 0px ${ amount * H }px 0px)` ), expectedClose( 'bottom', amount, 1 ) ) } );
	rep.check( 'judge:edge-end-three-values', { measured: good.edgeEnd, expected: expectedClose( 'bottom', amount, 1 ), pass: judgeShares( s( good.edgeEnd ), expectedClose( 'bottom', amount, 1 ) ) } );
	rep.check( 'judge:all-mid', { measured: good.allMid, expected: expectedClose( 'all', amount, 0.5 ), pass: judgeShares( s( good.allMid ), expectedClose( 'all', amount, 0.5 ) ) } );
	rep.check( 'judge:all-moving', { measured: movingEdges( s( good.allMid ) ), expected: EDGES, pass: sameEdges( movingEdges( s( good.allMid ) ), wantMoving( 'all' ) ) } );
	rep.check( 'judge:all-end', { measured: good.allEnd, expected: expectedClose( 'all', amount, 1 ), pass: judgeShares( s( good.allEnd ), expectedClose( 'all', amount, 1 ) ) } );
	rep.check( 'judge:held-open', { measured: bad.openHeld, expected: expectedClose( 'bottom', amount, 0 ), pass: judgeShares( s( bad.openHeld ), expectedClose( 'bottom', amount, 0 ) ) } );
	rep.check( 'judge:holders-edge', { measured: 'b 40%, t/r/l 0%, no uniform', expected: true, pass: judgeHolders( { uniform: '', top: '0%', right: '0%', bottom: pct( amount ), left: '0%' }, 'bottom', amount ) } );
	rep.check( 'judge:holders-all', { measured: 'uniform 40%, no edges', expected: true, pass: judgeHolders( { uniform: pct( amount ), top: '', right: '', bottom: '', left: '' }, 'all', amount ) } );
	rep.check( 'judge:unreadable', { measured: [ 'none', 'circle(10px)' ].map( ( v ) => s( v ) ), expected: [ null, null ], pass: null === s( 'none' ) && null === s( 'circle(10px)' ) && ! judgeShares( s( 'none' ), expectedClose( 'bottom', amount, 1 ) ) } );

	// Negative controls: each planted wrong reading must turn its judge red.
	rep.control( 'judge:edge-mid', { property: 'the pre-fix collapse (four edges closing) under the one-edge judge', measured: bad.collapsedMid, expected: expectedClose( 'bottom', amount, 0.5 ), red: ! judgeShares( s( bad.collapsedMid ), expectedClose( 'bottom', amount, 0.5 ) ) } );
	rep.control( 'judge:edge-moving', { property: 'the pre-fix collapse under the one-moving-edge judge', measured: movingEdges( s( bad.collapsedMid ) ), expected: [ 'bottom' ], red: ! sameEdges( movingEdges( s( bad.collapsedMid ) ), wantMoving( 'bottom' ) ) } );
	rep.control( 'judge:edge-end', { property: 'the from-value fallback (no close value applied) under the close-end judge', measured: bad.fallbackEnd, expected: expectedClose( 'bottom', amount, 1 ), red: ! judgeShares( s( bad.fallbackEnd ), expectedClose( 'bottom', amount, 1 ) ) } );
	rep.control( 'judge:all-mid', { property: 'the control reading under the one-edge judge', measured: good.allMid, expected: expectedClose( 'bottom', amount, 0.5 ), red: ! judgeShares( s( good.allMid ), expectedClose( 'bottom', amount, 0.5 ) ) } );
	rep.control( 'judge:holders-edge', { property: 'the pre-fix holders (uniform only) for a bottom wipe', measured: 'uniform 40%', expected: 'edge holders', red: ! judgeHolders( { uniform: pct( amount ), top: '', right: '', bottom: '', left: '' }, 'bottom', amount ) } );
	rep.control( 'judge:held-open', { property: 'a still-closed panel (bottom 100%) under the held-open judge', measured: bad.fallbackEnd, expected: 'inset(0)', red: ! judgeShares( s( bad.fallbackEnd ), expectedClose( 'bottom', amount, 0 ) ) } );
	return rep.summary();
}

// ---- Main -------------------------------------------------------------------------------------------------------

async function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) return selfTest();
	const args = parseArgs( [ 'node', 'probe', ...argv ] );
	if ( ! args.pages.length ) {
		console.error( 'Pass --page <id> (a page built from tests/fixtures/motion/pages/close-clip-edge.json) or --self-test.' );
		return 1;
	}
	const spec = fixtureSpec( JSON.parse( fs.readFileSync( FIXTURE_FILE, 'utf8' ) ) );
	if ( ! spec ) {
		console.error( `${ FIXTURE_FILE } has no .mce-edge and .mce-all panels.` );
		return 1;
	}
	const url = `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=mce`;
	const all = [];
	let pw;
	try {
		pw = await import( 'playwright' );
	} catch ( e ) {
		const rep = new Reporter( { mode: 'live' } );
		rep.check( 'browser', { pass: null, why: `playwright could not load (${ e.message })` } );
		return rep.summary();
	}
	for ( const engine of args.engines ) {
		let browser;
		try {
			browser = await pw[ engine ].launch( launchOptions( engine ) );
		} catch ( e ) {
			const rep = new Reporter( { engine, mode: 'live' } );
			rep.check( 'browser', { pass: null, why: `${ engine } could not start (${ e.message })` } );
			all.push( ...rep.rows );
			continue;
		}
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, mode: 'live', page: args.pages[ 0 ] } );
			for ( const reducedMotion of [ 'no-preference', 'reduce' ] ) {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, reducedMotion } );
				const page = await context.newPage();
				try {
					if ( ! ( await gotoThroughCheck( page, url ) ) ) {
						rep.check( `page:${ reducedMotion }`, { pass: null, why: 'the host bot check did not hand over; rerun with SGS_HEADED=1' } );
						continue;
					}
					await page.waitForTimeout( 300 );
					for ( const [ id, s ] of Object.entries( spec ) ) {
						if ( 'reduce' === reducedMotion ) await reducedChecks( page, rep, id, s );
						else await panelChecks( page, rep, id, s );
					}
				} catch ( e ) {
					rep.check( `error:${ reducedMotion }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
				} finally {
					await context.close();
				}
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	return finish.summary();
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().then( ( code ) => process.exit( code ) ).catch( ( e ) => {
		console.error( e );
		process.exit( 1 );
	} );
}
