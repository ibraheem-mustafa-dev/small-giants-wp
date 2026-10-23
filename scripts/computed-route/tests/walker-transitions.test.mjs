// Walker W3 (GAP-CHECKLIST.md): transition timings match by the property they animate, read from the `transition`
// shorthand, so a clone that lists more entries (the pose longhands, SGS `--sgs-mh-*` motion properties, 0s entries)
// matches a draft that animates the same properties the same way, and swapped timings are still rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePair } from '../../parity/lib/compare.mjs';
import { sameTransitions } from '../../parity/lib/transitions.mjs';

const TOL = { px: 1, box: 2 };
const EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const DRAFT = `transform 0.35s ${ EASE } 0s, background-color 0.25s ease 0s`;
const LIVE = `--sgs-mh-scale 0.35s ${ EASE } 0s, scale 0.35s ${ EASE } 0s, rotate 0.35s ${ EASE } 0s, translate 0.35s ${ EASE } 0s, background-color 0.25s ease 0s, color 0s ease 0s`;
const longhands = ( t ) => ( {
	'transition-duration': t.split( /,(?![^(]*\))/ ).map( ( x ) => x.trim().match( /\s(-?[\d.]+m?s)/ )[ 1 ] ).join( ', ' ),
	'transition-timing-function': 'ease',
	color: 'blue',
} );
const snap = ( t ) => ( { box: { w: 10, h: 10 }, styles: longhands( t ), motion: { transition: t }, hover: { color: 'red' }, rest: {} } );
const rows = ( a, b ) => comparePair( {}, snap( a ), snap( b ), TOL ).filter( ( r ) => /transition/.test( r.key ) );

test( 'MUST FAIL (header 2026-10: icon timings): the same per-property timing spelt with pose longhands, --sgs-mh-* and 0s extras is no row', () => {
	assert.deepEqual( rows( DRAFT, LIVE ), [] );
} );

test( 'negative control: two properties with their durations swapped are rows', () => {
	const swapped = `transform 0.25s ${ EASE } 0s, background-color 0.35s ease 0s`;
	const r = rows( DRAFT, swapped );
	assert.ok( r.some( ( x ) => 'transition-duration' === x.key ), JSON.stringify( r ) );
	assert.ok( r.some( ( x ) => 'transition' === x.key ) );
	assert.equal( sameTransitions( DRAFT, swapped, 'transition-timing-function' ), true, 'the easings still match' );
} );

test( 'a property the draft animates that the clone does not is a row; a draft with no transition matches only none', () => {
	assert.equal( sameTransitions( DRAFT, 'background-color 0.25s ease 0s' ), false );
	assert.equal( sameTransitions( 'opacity 0.3s ease 0s', 'color 0.3s ease 0s' ), false, 'another property with the same timing is not the entry' );
	assert.equal( sameTransitions( 'none', 'color 0.2s ease 0s' ), false );
	assert.equal( sameTransitions( 'none', 'all 0s ease 0s' ), true );
	assert.equal( sameTransitions( '0.3s ease', 'color 0.3s ease 0s, opacity 0.3s ease 0s', null, [ 'color', 'opacity' ] ), true, 'a draft all covers each live entry where those are what moves' );
	assert.equal( sameTransitions( '0.3s ease', 'color 0.3s ease 0s, opacity 0.2s ease 0s' ), false );
	assert.equal( sameTransitions( DRAFT, `transform 0.35s ${ EASE } 0.1s, background-color 0.25s ease 0s`, 'transition-delay' ), false );
} );

test( 'MUST FAIL (header 2026-10: CTA timings): a draft background transition is live background-color; a missing property is a duration row only', () => {
	assert.equal( sameTransitions( 'background 0.2s ease 0s', 'background-color 0.2s ease 0s' ), true );
	const missing = [ 'transform 0.2s ease 0s, color 0.2s ease 0s', 'transform 0.2s ease 0s' ];
	assert.equal( sameTransitions( ...missing, 'transition-duration' ), false );
	assert.equal( sameTransitions( ...missing ), false );
	assert.equal( sameTransitions( ...missing, 'transition-delay' ), true );
	assert.equal( sameTransitions( ...missing, 'transition-timing-function' ), true );
} );

// Phase 0 review (rater 1, findings 2 to 4): each side's entries are compared in both directions, a delayed 0s entry is
// an entry, the last of a repeated property wins, the pose longhands compare as their set of timings and a shorthand
// carries its longhands.
test( 'MUST FAIL (review 2): a draft `all` against a live list, and a live entry the draft lacks, are rows', () => {
	assert.equal( sameTransitions( 'all 0.3s ease 0s', 'color 0.3s ease 0s' ), false, 'all, while the properties that move are unknown' );
	assert.equal( sameTransitions( 'all 0.3s ease 0s', 'color 0.3s ease 0s', null, [ 'color', 'transform' ] ), false, 'transform moves and only the draft animates it' );
	assert.equal( sameTransitions( 'color 0.3s ease 0s', 'color 0.3s ease 0s, opacity 2s ease 0s' ), false );
	assert.equal( sameTransitions( 'color 0.3s ease 0s', 'all 0.3s ease 0s' ), false );
	assert.equal( sameTransitions( 'all 0.3s ease 0s', 'color 0.3s ease 0s', null, [ 'color' ] ), true, 'only colour moves' );
} );

test( 'MUST FAIL (review 3): a 0s entry with a delay (fade, then hide) is an entry', () => {
	assert.equal( sameTransitions( 'opacity 0.3s ease 0s, visibility 0s ease 0.3s', 'opacity 0.3s ease 0s' ), false );
	assert.equal( sameTransitions( 'opacity 0.3s ease 0s, visibility 0s ease 0.3s', 'visibility 0s ease 0.3s, opacity 0.3s ease 0s' ), true );
} );

test( 'MUST FAIL (review 4): pose longhands with different timings, a repeated property and a background shorthand are compared', () => {
	assert.equal( sameTransitions( 'transform 0.3s ease 0s', 'scale 0.3s ease 0s, translate 2s ease 0s' ), false, 'one pose timing against two' );
	assert.equal( sameTransitions( 'transform 0.3s ease 0s, transform 2s ease 0s', 'transform 0.3s ease 0s' ), false, 'the last entry for a property wins' );
	assert.equal( sameTransitions( 'background 0.3s ease 0s', 'background-color 0.3s ease 0s', null, [ 'background-position' ] ), false, 'the position moves and only the draft animates it' );
	assert.equal( sameTransitions( 'background 0.3s ease 0s', 'background-color 0.3s ease 0s', null, [ 'background-color' ] ), true );
} );

test( 'MUST FAIL (review 2, motion row): a draft `all` against a live colour-only transition is a transition row where transform moves', () => {
	const d = { ...snap( 'all 0.3s ease 0s' ), hover: { transform: 'matrix(1.1, 0, 0, 1.1, 0, 0)' }, styles: { ...longhands( 'all 0.3s ease 0s' ), transform: 'none' } };
	const l = { ...snap( 'color 0.3s ease 0s' ), hover: { transform: 'matrix(1.1, 0, 0, 1.1, 0, 0)' }, styles: { ...longhands( 'color 0.3s ease 0s' ), transform: 'none' } };
	const r = comparePair( {}, d, l, TOL ).filter( ( x ) => 'transition' === x.key );
	assert.equal( r.length, 1, JSON.stringify( r ) );
} );

test( 'positive control: a draft `all` against a live colour-only transition is no row where only the colour moves', () => {
	const d = { ...snap( 'all 0.3s ease 0s' ), styles: longhands( 'all 0.3s ease 0s' ) };
	const l = { ...snap( 'color 0.3s ease 0s' ), styles: longhands( 'color 0.3s ease 0s' ) };
	assert.deepEqual( comparePair( {}, d, l, TOL ).filter( ( x ) => 'transition' === x.key ), [] );
} );
