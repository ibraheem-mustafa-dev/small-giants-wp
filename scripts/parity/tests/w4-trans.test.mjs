// Walker Track W wave 4, lane w4-trans. Transition rows compared as the motion they make: an easing keyword is the
// curve it names (`ease` is cubic-bezier(0.25, 0.1, 0.25, 1), lib/transitions.mjs::curve), and an entry only one side
// names, on a property that moves in no state walked at the width on either side (lib/state-changes.mjs::
// everyStateChanges), animates nothing and is not compared. Fixtures are the Indus header walk's real strings
// (gen-header-8, a social icon; gen-header-1, the top row). W4_TRANS_LIB points the tests at another lib folder (the
// red-first proof runs them against the old compare.mjs and transitions.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';

const LIB = process.env.W4_TRANS_LIB ? new URL( `file:///${ process.env.W4_TRANS_LIB.replace( /\\/g, '/' ).replace( /\/?$/, '/' ) }` ) : new URL( '../lib/', import.meta.url );
const { comparePair } = await import( new URL( 'compare.mjs', LIB ).href );
const { sameTransitions } = await import( new URL( 'transitions.mjs', LIB ).href );
const { everyStateChanges, everyStateMap } = await import( new URL( 'state-changes.mjs', LIB ).href );
const TOL = { px: 0.5, box: 2 };

// A side's read: the transition shorthand, its longhands as Chrome lists them, resting styles, a box and state reads.
const longhands = ( t ) => {
	if ( 'none' === t ) {
		return { 'transition-duration': '0s', 'transition-delay': '0s', 'transition-timing-function': 'ease' };
	}
	const parts = t.split( /,(?![^(]*\))/ ).map( ( p ) => p.trim() );
	const time = ( p ) => p.match( /(^|\s)([\d.]+m?s)/ )?.[ 2 ] ?? '0s';
	const ease = ( p ) => p.match( /(cubic-bezier\([^)]*\)|steps\([^)]*\)|ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end)/ )?.[ 1 ] ?? 'ease';
	return { 'transition-duration': parts.map( time ).join( ', ' ), 'transition-delay': parts.map( () => '0s' ).join( ', ' ), 'transition-timing-function': parts.map( ease ).join( ', ' ) };
};
const side = ( transition, { styles = {}, box = { x: 0, y: 0, w: 34, h: 34 }, hover = {}, noHover = false } = {} ) => {
	const rest = { color: 'rgb(255, 255, 255)', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-color': 'rgb(255, 255, 255)', 'box-shadow': 'none', 'padding-top': '0px', 'padding-bottom': '0px', ...longhands( transition ), ...styles };
	return { box, styles: rest, motion: { animation: 'none', transition }, keyframes: 'none', ...( noHover ? { noHover: true } : { hover: { ...rest, ...hover } } ), active: {} };
};
const rows = ( d, l, every ) => comparePair( { name: 'p', text: false, pseudo: false }, d, l, TOL, every ).filter( ( r ) => /transition/.test( r.key ) ).map( ( r ) => `${ r.kind } ${ r.key }` );

// gen-header-8 at 1440, desktop-nav and auto-scrolled: the draft's icon eases its pose and shadow; the clone runs the
// same pose through the SGS motion properties and also lists colour transitions for colours no state changes.
const DRAFT8 = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s';
const LIVE8 = '--sgs-mh-s 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), --sgs-mh-ty 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), --sgs-mh-rot 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), border-color 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)';
const SHADOW = 'rgba(0, 0, 0, 0.45) 0px 10px 20px -6px';
const d8 = () => side( DRAFT8, { styles: { transform: 'none' }, hover: { 'box-shadow': SHADOW, transform: 'matrix(1.13881, -0.160049, 0.160049, 1.13881, 0, -3.45)' } } );
const l8 = ( hover = {} ) => side( LIVE8, { styles: { scale: '1', translate: '0px', rotate: '0deg' }, hover: { 'box-shadow': SHADOW, scale: '1.15', translate: '0px -3.45px', rotate: '-8deg', ...hover } } );
const two = ( d, l, d2 = d, l2 = l ) => everyStateChanges( [ { d, l }, { d: d2, l: l2 } ] );

test( 'MUST FAIL: `ease` and cubic-bezier(0.25, 0.1, 0.25, 1) are one curve, as are the linear and step spellings', () => {
	assert.equal( sameTransitions( 'box-shadow 0.25s ease', 'box-shadow 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)' ), true );
	assert.equal( sameTransitions( 'opacity 0.2s linear', 'opacity 0.2s cubic-bezier(0, 0, 1, 1)' ), true );
	assert.equal( sameTransitions( 'visibility 0.2s step-end', 'visibility 0.2s steps(1)' ), true );
	assert.equal( sameTransitions( 'visibility 0.2s step-end', 'visibility 0.2s steps(1, jump-end)' ), true );
	assert.equal( sameTransitions( 'visibility 0.2s step-start', 'visibility 0.2s steps(1, jump-start)' ), true );
	assert.equal( sameTransitions( 'visibility 0.2s step-end', 'visibility 0.2s steps(1, end)' ), true );
	assert.equal( sameTransitions( 'visibility 0.2s step-start', 'visibility 0.2s steps(1, start)' ), true );
	assert.equal( sameTransitions( 'opacity 0.2s ease-out', 'opacity 0.2s cubic-bezier(0, 0, 0.58, 1)', 'transition-timing-function' ), true );
} );

test( 'MUST FAIL: the social icon (gen-header-8) matches once its easing is a curve and its never-changing colour entries are dropped', () => {
	const [ d, l ] = [ d8(), l8() ];
	const every = two( d, l );
	assert.deepEqual( [ ...every ].sort(), [ 'box-shadow', 'rotate', 'scale', 'transform', 'translate' ] );
	assert.deepEqual( rows( d, l, every ), [] );
} );

test( 'MUST FAIL: a longhand timing row stays where only the scrolled state moves the property (no hover change)', () => {
	const d = side( 'padding-top 0.3s', { noHover: true } );
	const l = side( 'padding-top 0.2s', { noHover: true } );
	const every = two( d, l, d, side( 'padding-top 0.2s', { noHover: true, styles: { 'padding-top': '8px' } } ) );
	assert.deepEqual( every, [ 'padding-top' ] );
	assert.deepEqual( rows( d, l, every ), [ 'style transition-duration', 'motion transition' ] );
} );

test( 'negative control: the top row (gen-header-1) - draft `none`, live scroll-collapse transitions that change its block-size and padding when scrolled - keeps its row', () => {
	const LIVE1 = 'background-color 0.2s, transform 0.2s, block-size 0.2s, padding-top 0.2s, padding-bottom 0.2s';
	const d = side( 'none', { box: { x: 0, y: 0, w: 1440, h: 46 }, noHover: true } );
	const l = side( LIVE1, { box: { x: 0, y: 0, w: 1440, h: 46 }, styles: { 'padding-top': '8px', 'padding-bottom': '8px' }, noHover: true } );
	const scrolled = side( LIVE1, { box: { x: 0, y: 1350, w: 1440, h: 30 }, styles: { 'padding-top': '0px', 'padding-bottom': '0px' }, noHover: true } );
	const every = two( d, l, d, scrolled );
	assert.deepEqual( [ ...every ].sort(), [ 'box:h', 'padding-bottom', 'padding-top' ] );
	// The collapse moves something, so the duration longhand is a row too (compare.mjs::timingIrrelevant over `every`).
	assert.deepEqual( rows( d, l, every ), [ 'style transition-duration', 'motion transition' ] );
	// The walk's own reads: the row did not collapse in any walked state, and still the draft's `none` against the
	// live transitions is a row (a side that transitions nothing is never matched by dropping the other's entries).
	assert.deepEqual( rows( d, l, two( d, l ) ), [ 'motion transition' ] );
	const plain = side( 'background-color 0.2s, block-size 0.2s', { noHover: true } );
	assert.deepEqual( rows( d, plain, two( d, plain ) ), [ 'motion transition' ] );
} );

test( 'negative control: both sides transition, the hover moves nothing and the scrolled state collapses the live box - the live block-size entry is compared', () => {
	const d = side( 'transform 0.2s', { noHover: true } );
	const l = side( 'transform 0.2s, block-size 0.2s', { noHover: true } );
	const scrolled = side( 'transform 0.2s, block-size 0.2s', { noHover: true, box: { x: 0, y: 0, w: 34, h: 20 } } );
	const every = two( d, l, d, scrolled );
	assert.deepEqual( every, [ 'box:h' ] );
	assert.deepEqual( rows( d, l, every ), [ 'style transition-duration', 'motion transition' ] );
} );

test( 'control: a one-sided `color` entry is compared because the live hover changes the colour', () => {
	const [ d, l ] = [ d8(), l8( { color: 'rgb(10, 126, 168)' } ) ];
	const every = two( d, l );
	assert.ok( every.includes( 'color' ) );
	assert.deepEqual( rows( d, l, every ), [ 'style transition-duration', 'motion transition' ] );
} );

test( 'control: `ease` and `ease-in` are two curves, and stay a timing row', () => {
	assert.equal( sameTransitions( 'box-shadow 0.25s ease', 'box-shadow 0.25s ease-in' ), false );
	assert.equal( sameTransitions( 'box-shadow 0.25s ease', 'box-shadow 0.25s cubic-bezier(0.25, 0.1, 0.25, 0.9)' ), false );
	assert.equal( sameTransitions( 'visibility 0.2s step-start', 'visibility 0.2s steps(1)' ), false );
	const d = side( 'box-shadow 0.25s ease', { hover: { 'box-shadow': SHADOW } } );
	const l = side( 'box-shadow 0.25s ease-in', { hover: { 'box-shadow': SHADOW } } );
	assert.deepEqual( rows( d, l, two( d, l ) ), [ 'style transition-timing-function', 'motion transition' ] );
} );

test( 'control: where the change set cannot be known the one-sided entries are compared as before', () => {
	const [ d, l ] = [ d8(), l8() ];
	// No change set passed (a caller with one state), a single phone state with no hover read, and a state missing the element.
	assert.deepEqual( rows( d, l, null ), [ 'style transition-duration', 'motion transition' ] );
	const [ pd, pl ] = [ side( DRAFT8, { noHover: true } ), side( LIVE8, { noHover: true } ) ];
	assert.equal( everyStateChanges( [ { d: pd, l: pl } ] ), null );
	assert.equal( everyStateChanges( [ { d, l }, { d, l: { ...l, missing: true } } ] ), null );
	assert.equal( everyStateChanges( [ { d, l }, { d, l: { ...l, hover: undefined } } ] ), null );
	assert.deepEqual( rows( pd, pl, everyStateChanges( [ { d: pd, l: pl } ] ) ), [ 'motion transition' ] );
} );

test( 'control: the walk builds each pair set from the states that walk it, so a pair a state leaves out gets nothing from that state', () => {
	const d = side( 'transform 0.2s', { noHover: true } );
	const moved = side( 'transform 0.2s', { noHover: true, styles: { 'padding-top': '8px' } } );
	const [ p, q ] = [ { name: 'p' }, { name: 'q', states: [ 'rest' ] } ];
	const states = [ { name: 'rest' }, { name: 'scrolled' } ];
	const pairsFor = ( st ) => [ p, q ].filter( ( x ) => ! x.states || x.states.includes( st.name ) );
	const snap = ( x ) => ( { snap: { p: x, q: x } } );
	const map = everyStateMap( states, { rest: snap( d ), scrolled: snap( d ) }, { rest: snap( d ), scrolled: snap( moved ) }, pairsFor );
	assert.deepEqual( map, { p: [ 'padding-top' ], q: null } );
} );

test( 'control: a live `padding` transition is compared where the scrolled state changes padding-top (a shorthand matched by its longhand)', () => {
	const d = side( 'transform 0.2s', { noHover: true } );
	const l = side( 'transform 0.2s, padding 0.2s', { noHover: true } );
	const every = two( d, l, d, side( 'transform 0.2s, padding 0.2s', { noHover: true, styles: { 'padding-top': '8px' } } ) );
	assert.deepEqual( every, [ 'padding-top' ] );
	assert.deepEqual( rows( d, l, every ), [ 'style transition-duration', 'motion transition' ] );
} );
