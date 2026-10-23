// A border colour is compared only where the draft paints a border on that edge, a style where either side has a width
// (compare.mjs::borderColourIrrelevant).
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

test( '(b) the draft 0px: no colour row; the width and style rows say the live border goes', () => {
	const rows = run( edge( '0px', RED, 'none' ), edge( '3px', CREAM ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-style', 'border-bottom-width' ] );
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
	assert.deepEqual( keys( run( edge( '0px', RED, 'none' ), edge( '0px', CREAM, 'solid' ) ) ), [] );
} );

test( 'a snapshot with no width read still compares the colour', () => {
	const rows = run( { 'border-bottom-color': RED }, { 'border-bottom-color': CREAM } );
	assert.deepEqual( keys( rows ), [ 'border-bottom-color' ] );
} );

test( 'pseudo-element: the draft 0px gives no colour row; both painted differ in colour', () => {
	const ps = ( s ) => ( { '::after': { content: '"x"', ...s } } );
	const one = run( {}, {}, { pseudo: ps( edge( '0px', RED, 'none', 'top' ) ) }, { pseudo: ps( edge( '4px', CREAM, 'solid', 'top' ) ) } );
	assert.deepEqual( one.filter( ( r ) => r.pseudo ).map( ( r ) => r.key ).sort(), [ 'border-top-style', 'border-top-width' ] );
	const both = run( {}, {}, { pseudo: ps( edge( '2px', RED, 'solid', 'top' ) ) }, { pseudo: ps( edge( '2px', CREAM, 'solid', 'top' ) ) } );
	assert.deepEqual( both.filter( ( r ) => r.pseudo ).map( ( r ) => r.key ), [ 'border-top-color' ] );
} );

test( 'hover: an edge the draft leaves unpainted in the hover state gives no colour row; both painted does', () => {
	const hov = ( w, c ) => ( { hover: edge( w, c, '0px' === w ? 'none' : 'solid' ) } );
	const one = run( {}, {}, hov( '0px', RED ), hov( '3px', CREAM ) );
	assert.deepEqual( keys( one, 'hover' ), [ 'border-bottom-style', 'border-bottom-width' ] );
	const both = run( {}, {}, hov( '1px', RED ), hov( '1px', CREAM ) );
	assert.deepEqual( keys( both, 'hover' ), [ 'border-bottom-color' ] );
} );

test( 'NEGATIVE (b reversed): the draft paints and live is 0px gives the width, style and colour rows (all three are what live lacks)', () => {
	const rows = run( edge( '3px', CREAM ), edge( '0px', RED, 'none' ) );
	assert.deepEqual( keys( rows ), [ 'border-bottom-color', 'border-bottom-style', 'border-bottom-width' ] );
} );

test( 'focus and press rows: a border colour is no row where one side reads 0px, a row where both paint', async () => {
	const { compareInteractive } = await import( '../lib/auto-compare.mjs' );
	const itm = ( w, c ) => ( { type: 'a', name: 'x', rest: { 'border-bottom-width': w, 'border-bottom-color': c }, focus: { 'border-bottom-color': RED } } );
	const rowsFor = ( dw, lw ) => {
		const out = [];
		compareInteractive( { interactives: [ itm( dw, CREAM ) ] }, { interactives: [ { ...itm( lw, CREAM ), focus: { 'border-bottom-color': 'rgb(15, 15, 15)' } } ] }, { px: 1 }, ( k ) => out.push( k ) );
		return out;
	};
	assert.deepEqual( rowsFor( '0px', '3px' ).filter( ( k ) => /color|style/.test( k ) ), [] );
	assert.equal( rowsFor( '2px', '3px' ).filter( ( k ) => /color/.test( k ) ).length, 1 );
} );
