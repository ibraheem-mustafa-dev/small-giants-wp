// A border colour or style is compared only where both sides paint a border on that edge (compare.mjs::borderColourIrrelevant).
import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePair } from '../lib/compare.mjs';

const TOL = { px: 1, box: 2 };
const PAIR = { draft: 'a', live: 'b', text: false, motion: false, pseudo: true };
const snap = ( styles, extra = {} ) => ( { tag: 'div', text: '', box: { w: 100, h: 40 }, styles, motion: {}, ...extra } );
const edge = ( w, c, s = 'solid', side = 'bottom' ) => ( { [ `border-${ side }-width` ]: w, [ `border-${ side }-color` ]: c, [ `border-${ side }-style` ]: s } );
const keys = ( rows, kind = 'style' ) => rows.filter( ( r ) => r.kind === kind ).map( ( r ) => r.key ).sort();
const run = ( ds, ls, dx, lx ) => comparePair( PAIR, snap( ds, dx ), snap( ls, lx ), TOL );

const RED = 'rgb(20, 20, 20)';
const CREAM = 'rgb(230, 225, 218)';

test( '(b) one side 0px: only the width row, no colour or style row', () => {
	const rows = run( edge( '0px', RED, 'none' ), edge( '3px', CREAM ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-width' ] );
} );

test( '(b) one side 0px with a matching style string: only the width row', () => {
	const rows = run( edge( '0px', RED, 'solid' ), edge( '3px', CREAM, 'solid' ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-width' ] );
} );

test( '(c) the width row carries the real values', () => {
	const rows = run( edge( '0px', RED, 'none' ), edge( '3px', CREAM ) );
	const w = rows.find( ( r ) => 'border-bottom-width' === r.key );
	assert.equal( w.draft, '0px' );
	assert.equal( w.live, '3px' );
} );

test( 'NEGATIVE: none against solid at the same width is a style row, and no colour row', () => {
	const rows = run( edge( '1px', RED, 'none' ), edge( '1px', CREAM, 'solid' ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-style' ] );
} );

test( 'NEGATIVE (a): both sides paint 1px in different colours is a colour row', () => {
	const rows = run( edge( '1px', RED ), edge( '1px', CREAM ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-color' ] );
} );

test( 'NEGATIVE: both sides paint, different styles is a style row', () => {
	const rows = run( edge( '1px', CREAM, 'solid' ), edge( '1px', CREAM, 'dashed' ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-style' ] );
} );

test( 'both sides 0px stays silent', () => {
	assert.deepEqual( keys( run( edge( '0px', RED, 'none' ), edge( '0px', CREAM, 'none' ) ) ), [] );
} );

test( 'a snapshot with no width read still compares the colour', () => {
	const rows = run( { 'border-bottom-color': RED }, { 'border-bottom-color': CREAM } );
	assert.deepEqual( keys( rows ), [ 'border-bottom-color' ] );
} );

test( 'pseudo-element: one side 0px is only the width row; both painted differ in colour', () => {
	const ps = ( s ) => ( { '::after': { content: '"x"', ...s } } );
	const one = run( {}, {}, { pseudo: ps( edge( '0px', RED, 'none', 'top' ) ) }, { pseudo: ps( edge( '4px', CREAM, 'solid', 'top' ) ) } );
	assert.deepEqual( one.filter( ( r ) => r.pseudo ).map( ( r ) => r.key ), [ 'border-top-width' ] );
	const both = run( {}, {}, { pseudo: ps( edge( '2px', RED, 'solid', 'top' ) ) }, { pseudo: ps( edge( '2px', CREAM, 'solid', 'top' ) ) } );
	assert.deepEqual( both.filter( ( r ) => r.pseudo ).map( ( r ) => r.key ), [ 'border-top-color' ] );
} );

test( 'hover: an edge unpainted on one side in the hover state gives no colour row; both painted does', () => {
	const hov = ( w, c ) => ( { hover: edge( w, c, '0px' === w ? 'none' : 'solid' ) } );
	const one = run( {}, {}, hov( '0px', RED ), hov( '3px', CREAM ) );
	assert.deepEqual( keys( one, 'hover' ), [ 'border-bottom-width' ] );
	const both = run( {}, {}, hov( '1px', RED ), hov( '1px', CREAM ) );
	assert.deepEqual( keys( both, 'hover' ), [ 'border-bottom-color' ] );
} );
