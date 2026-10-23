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
	assert.equal( sameTransitions( '0.3s ease', 'color 0.3s ease 0s, opacity 0.3s ease 0s' ), true, 'a draft all covers each live entry' );
	assert.equal( sameTransitions( '0.3s ease', 'color 0.3s ease 0s, opacity 0.2s ease 0s' ), false );
	assert.equal( sameTransitions( DRAFT, `transform 0.35s ${ EASE } 0.1s, background-color 0.25s ease 0s`, 'transition-delay' ), false );
} );
