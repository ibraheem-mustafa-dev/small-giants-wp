/**
 * Shared helpers for probe-motion-a11y.mjs (Spec 38A unit M3.10, FR-38A-30): the expectations read from the fixture
 * tree and the pure judges. The live checks and `--self-test` run the same judges, so a judge that cannot fail is caught
 * offline, and each live check's negative control feeds its judge a deliberately wrong reading that must come out red.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { FIXTURE_DIR, near, parseTranslate } from './probe-motion-model-lib.mjs';

export const FIXTURE_FILE = path.join( FIXTURE_DIR, 'motion-a11y.json' );

/** The WCAG tag set axe runs: the SGS baseline (2.1 AA) plus 2.2 AA, as scripts/wc-pages-responsive-audit.js does. */
export const AXE_TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa' ];

/** The wrappers the fixture puts around its sections, so an axe node can be reported as inside or outside the fixture. */
export const FIXTURE_WRAPS = [ 'm310-entrance-wrap', 'm310-reveal-wrap', 'm310-card-wrap', 'm310-loop-pause-wrap', 'm310-loop-nopause-wrap' ];

/** The absolute path of the installed axe-core bundle (a dependency of plugins/sgs-blocks), or null when it is missing. */
export function axeSourcePath() {
	try {
		return createRequire( path.join( FIXTURE_DIR, '..', '..', '..', '..', 'package.json' ) ).resolve( 'axe-core/axe.min.js' );
	} catch ( e ) {
		return null;
	}
}

/** Every block in a tree whose className contains the given token. */
function findBlock( blocks, token ) {
	for ( const b of blocks ) {
		const cls = ( b.attributes && b.attributes.className ) || '';
		if ( cls.split( /\s+/ ).includes( token ) ) return b;
		const inner = findBlock( b.innerBlocks || [], token );
		if ( inner ) return inner;
	}
	return null;
}

const num = ( v ) => ( typeof v === 'number' ? v : parseFloat( String( v ) ) );

/**
 * The values the fixture stores, so the probe never restates them: the card's stored hover lift and scale, each loop's
 * period and pause-control flag, the gallery's caption-reveal flag, and whether an entrance is present.
 */
export function loadFacts( file = FIXTURE_FILE ) {
	const tree = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const need = ( token ) => {
		const block = findBlock( tree, token );
		if ( ! block ) throw new Error( `The fixture has no block with the class ${ token }` );
		return block;
	};
	const hover = need( 'm310-card' ).attributes.sgsMotion.elements.root.hover.state.values;
	const loop = ( token ) => {
		const layer = need( token ).attributes.sgsMotion.elements.root.effects[ 0 ];
		return { effect: layer.effect, period: num( layer.values.period ), pauseControl: layer.values.pauseControl === true };
	};
	const reveal = need( 'm310-reveal' ).attributes;
	return {
		card: { y: num( hover.translateY ), scale: num( hover.scale ) },
		pause: loop( 'm310-loop-pause' ),
		nopause: loop( 'm310-loop-nopause' ),
		reveal: { captionReveal: reveal.captionReveal === true, captions: ( reveal.mediaItems || [] ).filter( ( i ) => i.caption ).length },
		entrance: Boolean( need( 'm310-entrance' ).attributes.sgsMotion.elements.root.entrance ),
	};
}

// ---- Pure judges -----------------------------------------------------------------------------------------------

/** True when one revealed part is on screen and legible: displayed, visible, opaque and inside the box that reveals it. */
export function judgeVisible( r ) {
	return Boolean( r ) && r.display !== 'none' && r.visibility === 'visible' && Number.parseFloat( r.opacity ) >= 0.99 && r.width > 0 && r.height > 0 && r.inside === true;
}

/** True when every part in a non-empty list is visible. */
export const judgeAllVisible = ( list ) => Array.isArray( list ) && list.length > 0 && list.every( judgeVisible );

/** The computed `scale` ("none" or "1.04" or "1.04 1.04") as one number. */
export function parseScale( value ) {
	if ( ! value || value === 'none' ) return 1;
	return Number.parseFloat( String( value ).trim().split( /\s+/ )[ 0 ] );
}

/** True when two readings carry the same translate, scale and rotate values (within half a pixel, a hundredth and half a degree). */
export function sameMotion( a, b ) {
	const ta = parseTranslate( a.translate );
	const tb = parseTranslate( b.translate );
	return near( ta.x, tb.x, 0.5 ) && near( ta.y, tb.y, 0.5 ) && near( parseScale( a.scale ), parseScale( b.scale ), 0.01 ) && String( a.rotate ) === String( b.rotate );
}

/** True when a reading is at the stored hover result: translate y and scale as stored. */
export const atHover = ( r, want ) => near( parseTranslate( r.translate ).y, want.y, 0.5 ) && near( parseScale( r.scale ), want.scale, 0.01 );

/**
 * Keyboard parity: the pointer hover reaches the stored values (so the check is not vacuous), the resting card sits at
 * neither, and the keyboard-focused card carries the same computed values as the hovered one. Returns the failing reasons.
 */
export function judgeParity( { rest, hover, focus }, want ) {
	const why = [];
	if ( atHover( rest, want ) ) why.push( 'the card already sits at its hover values at rest' );
	if ( ! atHover( hover, want ) ) why.push( `the pointer hover does not reach translate y ${ want.y }px and scale ${ want.scale }` );
	if ( ! focus ) why.push( 'the keyboard focus reading is missing' );
	else if ( ! sameMotion( hover, focus ) ) why.push( 'the keyboard-focused card differs from the hovered card' );
	return why;
}

/** True when a list of looping animations is non-empty and every one reports the state. */
export const allIn = ( anims, state ) => Array.isArray( anims ) && anims.length > 0 && anims.every( ( a ) => a.playState === state );

/**
 * The pause-control sequence (WCAG 2.2.2) for one loop. `s` holds the readings the page produced:
 *   button   { present, hidden, size, label, pressed, tabReached }  the control, as found at load
 *   running  reading before any input     paused  reading after the first press     held  after focus and the pointer leave
 *   resumed  reading after the second press     afterLeave  after focus and the pointer leave again
 *   focus    reading with focus inside the block and no press     blurred  after focus leaves
 * A reading is { anims: [ { playState } ], attr, pressed }. Returns the failing reasons in two groups: `button` (the
 * control itself and what pressing it does) and `focus` (focus inside the block pauses it, and it resumes on leaving).
 * Both are empty when the control works.
 */
export function judgeLoopControl( s ) {
	const out = { button: [], focus: [] };
	const b = s.button;
	if ( ! b || ! b.present ) {
		out.button.push( 'no pause button exists in the block that holds the loop' );
	} else {
		if ( b.hidden ) out.button.push( 'the pause button is hidden' );
		if ( ! b.tabReached ) out.button.push( 'the keyboard Tab key does not reach the pause button' );
		if ( b.pressed !== 'false' ) out.button.push( `aria-pressed is ${ JSON.stringify( b.pressed ) } before any press, expected "false"` );
		if ( ! b.label ) out.button.push( 'the pause button has no accessible name' );
		if ( ! ( b.size.width >= 44 && b.size.height >= 44 ) ) out.button.push( `the pause button is ${ b.size.width }x${ b.size.height }px, expected at least 44x44` );
		if ( ! allIn( s.running.anims, 'running' ) || s.running.attr ) out.button.push( 'the loop is not running before the press' );
		if ( ! allIn( s.paused.anims, 'paused' ) || ! s.paused.attr || s.paused.pressed !== 'true' ) out.button.push( 'pressing the button does not pause every animation with data-sgs-loop-paused and aria-pressed true' );
		if ( ! allIn( s.held.anims, 'paused' ) || ! s.held.attr ) out.button.push( 'the pause does not hold after focus and the pointer leave' );
		if ( ! allIn( s.resumed.anims, 'running' ) || s.resumed.attr || s.resumed.pressed !== 'false' ) out.button.push( 'pressing again does not resume every animation, clear data-sgs-loop-paused and set aria-pressed false' );
		if ( ! allIn( s.afterLeave.anims, 'running' ) || s.afterLeave.attr ) out.button.push( 'the resumed loop stops again after focus and the pointer leave' );
	}
	if ( s.focus ) {
		if ( ! allIn( s.focus.anims, 'paused' ) || ! s.focus.attr ) out.focus.push( 'focus inside the block does not pause every animation with data-sgs-loop-paused' );
		if ( ! allIn( s.blurred.anims, 'running' ) || s.blurred.attr ) out.focus.push( 'the loop does not resume when focus leaves the block' );
	} else {
		out.focus.push( 'no focus reading was taken' );
	}
	return out;
}

/** The failing reasons of both groups as one list. */
export const loopWhy = ( r ) => [ ...r.button, ...r.focus ];

/** True under reduced motion when no animation in the loop's block is infinite and the pause button, if any, is hidden. */
export const judgeReducedLoop = ( r ) => Boolean( r ) && r.anims.length === 0 && ( ! r.button || r.button.hidden === true );

/** One entry per axe violation: id, impact, help, and each node's target with whether it sits inside a fixture wrapper. */
export function summariseAxe( violations ) {
	return violations.map( ( v ) => ( {
		id: v.id,
		impact: v.impact,
		help: v.help,
		nodes: v.nodes.map( ( n ) => ( { target: n.target.join( ' ' ), inFixture: n.inFixture === true } ) ),
	} ) );
}

/** True when axe reported nothing. */
export const judgeAxe = ( violations ) => Array.isArray( violations ) && violations.length === 0;

/** The offline self-test: every judge must accept a good measurement and reject a planted bad one. Returns failures. */
export function selfTest() {
	const failures = [];
	const t = ( name, v ) => { if ( v !== true ) failures.push( `${ name }: expected true` ); };
	const f = ( name, v ) => { if ( v !== false ) failures.push( `${ name }: expected false` ); };
	const facts = loadFacts();
	t( 'fixture card lifts and scales', facts.card.y === -6 && facts.card.scale === 1.04 );
	t( 'fixture gallery reveals captions on hover', facts.reveal.captionReveal && facts.reveal.captions >= 1 );
	t( 'fixture loops run over five seconds', facts.pause.period > 5000 && facts.nopause.period > 5000 );
	t( 'fixture twins differ only in the pause control', facts.pause.pauseControl === true && facts.nopause.pauseControl === false && facts.pause.effect === facts.nopause.effect );
	t( 'fixture has an entrance', facts.entrance );
	t( 'axe-core is installed', typeof axeSourcePath() === 'string' && fs.existsSync( axeSourcePath() ) );

	const shown = { display: 'block', visibility: 'visible', opacity: '1', width: 200, height: 24, inside: true };
	t( 'visible', judgeVisible( shown ) );
	f( 'hidden by opacity', judgeVisible( { ...shown, opacity: '0' } ) );
	f( 'hidden by visibility', judgeVisible( { ...shown, visibility: 'hidden' } ) );
	f( 'hidden by display', judgeVisible( { ...shown, display: 'none' } ) );
	f( 'pushed outside its box', judgeVisible( { ...shown, inside: false } ) );
	f( 'zero size', judgeVisible( { ...shown, width: 0 } ) );
	f( 'null reading', judgeVisible( null ) );
	t( 'all visible', judgeAllVisible( [ shown, shown ] ) );
	f( 'one of two hidden', judgeAllVisible( [ shown, { ...shown, opacity: '0' } ] ) );
	f( 'empty list is not visible', judgeAllVisible( [] ) );

	const rest = { translate: 'none', scale: 'none', rotate: 'none' };
	const lifted = { translate: '0px -6px', scale: '1.04', rotate: 'none' };
	t( 'parity good', judgeParity( { rest, hover: lifted, focus: { ...lifted } }, facts.card ).length === 0 );
	t( 'parity: focus at rest is red', judgeParity( { rest, hover: lifted, focus: rest }, facts.card ).length > 0 );
	t( 'parity: focus half way is red', judgeParity( { rest, hover: lifted, focus: { ...lifted, scale: '1.02' } }, facts.card ).length > 0 );
	t( 'parity: hover that never moved is red', judgeParity( { rest, hover: rest, focus: rest }, facts.card ).length > 0 );
	t( 'parity: card already lifted at rest is red', judgeParity( { rest: lifted, hover: lifted, focus: lifted }, facts.card ).length > 0 );
	t( 'parity: missing focus reading is red', judgeParity( { rest, hover: lifted, focus: null }, facts.card ).length > 0 );
	t( 'scale parse', parseScale( 'none' ) === 1 && parseScale( '1.04 1.04' ) === 1.04 );

	const reading = ( state, attr, pressed = 'false' ) => ( { anims: [ { playState: state }, { playState: state } ], attr, pressed } );
	const good = {
		button: { present: true, hidden: false, size: { width: 44, height: 44 }, label: 'Pause animation', pressed: 'false', tabReached: true },
		running: reading( 'running', false ),
		paused: reading( 'paused', true, 'true' ),
		held: reading( 'paused', true, 'true' ),
		resumed: reading( 'running', false ),
		afterLeave: reading( 'running', false ),
		focus: reading( 'paused', true ),
		blurred: reading( 'running', false ),
	};
	const bad = ( patch, group = 'button' ) => judgeLoopControl( { ...good, ...patch } )[ group ].length > 0;
	t( 'loop control good', loopWhy( judgeLoopControl( good ) ).length === 0 );
	t( 'loop control: no button is red', bad( { button: { present: false } } ) );
	t( 'loop control: hidden button is red', bad( { button: { ...good.button, hidden: true } } ) );
	t( 'loop control: no aria-pressed is red', bad( { button: { ...good.button, pressed: null } } ) );
	t( 'loop control: unreachable by Tab is red', bad( { button: { ...good.button, tabReached: false } } ) );
	t( 'loop control: small target is red', bad( { button: { ...good.button, size: { width: 24, height: 24 } } } ) );
	t( 'loop control: no accessible name is red', bad( { button: { ...good.button, label: '' } } ) );
	t( 'loop control: press leaves one animation running is red', bad( { paused: { anims: [ { playState: 'paused' }, { playState: 'running' } ], attr: true, pressed: 'true' } } ) );
	t( 'loop control: pause without the attribute is red', bad( { paused: reading( 'paused', false, 'true' ) } ) );
	t( 'loop control: pause lost on leave is red', bad( { held: reading( 'running', false, 'true' ) } ) );
	t( 'loop control: second press does not resume is red', bad( { resumed: reading( 'paused', true, 'false' ) } ) );
	t( 'loop control: stops again after leave is red', bad( { afterLeave: reading( 'paused', true ) } ) );
	t( 'loop control: a loop that never ran is red', bad( { running: { anims: [], attr: false, pressed: 'false' } } ) );
	t( 'loop control: focus does not pause is red', bad( { focus: reading( 'running', false ) }, 'focus' ) );
	t( 'loop control: never resumes after blur is red', bad( { blurred: reading( 'paused', true ) }, 'focus' ) );
	t( 'loop control: missing focus reading is red', bad( { focus: null }, 'focus' ) );
	t( 'reduced loop good', judgeReducedLoop( { anims: [], button: { hidden: true } } ) && judgeReducedLoop( { anims: [], button: null } ) );
	f( 'reduced loop still animating', judgeReducedLoop( { anims: [ { playState: 'running' } ], button: null } ) );
	f( 'reduced loop with a visible button', judgeReducedLoop( { anims: [], button: { hidden: false } } ) );

	t( 'axe clean', judgeAxe( [] ) );
	f( 'axe violation', judgeAxe( [ { id: 'button-name' } ] ) );
	const summary = summariseAxe( [ { id: 'button-name', impact: 'critical', help: 'x', nodes: [ { target: [ '.a', 'b' ], inFixture: true } ] } ] );
	t( 'axe summary names id, impact and node', summary[ 0 ].id === 'button-name' && summary[ 0 ].impact === 'critical' && summary[ 0 ].nodes[ 0 ].target === '.a b' );
	return failures;
}
