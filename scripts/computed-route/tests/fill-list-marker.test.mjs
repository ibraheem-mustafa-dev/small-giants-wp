// List markers in Fill (Spec 48 FR-48-82, the marker part): every form a draft draws a list's markers in (an svg, a glyph
// or emoji, a dot or bar, a typed ordinal, a CSS list style or ::marker, a ::before counter or dot) gives the list block's
// marker type and number style, read through the framework DB's enum values; a CSS-drawn marker pairs with the block's
// ::marker on its item part. Fixture: the icon list's calibration from tests/fixtures/universal-part-pairing/reduced.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import * as M from '../lib/fill-list-marker.mjs';

const { listMarkerDecisions, markerSlots } = M;

const db = openDb();
const F = JSON.parse( fs.readFileSync( new URL( './fixtures/universal-part-pairing/reduced.json', import.meta.url ), 'utf8' ) );
const BLOCK = 'sgs/icon-list';
const cal = F.cal[ BLOCK ];
const ITEM = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k })`;
const MARK = ( k ) => `${ ITEM( k ) } > .sgs-icon-list__icon`;
const items = [ { text: 'One' }, { text: 'Two' }, { text: 'Three' } ];
const run = ( reads ) => listMarkerDecisions( { db, block: BLOCK, cal, attributes: { items: items.map( ( i ) => ( { ...i } ) ) }, reads } );
const write = ( r, attr ) => r.writes.find( ( w ) => attr === w.attr )?.value;
// Each item's own element read: a list item drawing `type` as its list style.
const li = ( type, extra = {} ) => ( { words: 'x', marker: { type, image: 'none', content: 'normal', ...extra } } );
const each = ( f ) => Object.fromEntries( [ 1, 2, 3 ].map( ( k ) => [ ITEM( k ), f( k ) ] ) );
const parts = ( f ) => Object.fromEntries( [ 1, 2, 3 ].map( ( k ) => [ MARK( k ), f( k ) ] ) );
const flex = ( k ) => ( { words: `item ${ k }`, marker: null } );

test( 'MUST FAIL (a CSS-numbered draft list is numbered): a decimal list style at every item writes markerType numbered', () => {
	const r = run( each( () => li( 'decimal' ) ) );
	assert.equal( write( r, 'markerType' ), 'numbered' );
	assert.equal( write( r, 'numberFormat' ), undefined, 'decimal is the default number style, already held' );
} );

test( 'MUST FAIL (the number style follows the draft): a decimal-leading-zero list style writes numberFormat', () => {
	const r = run( each( () => li( 'decimal-leading-zero' ) ) );
	assert.deepEqual( [ write( r, 'markerType' ), write( r, 'numberFormat' ) ], [ 'numbered', 'decimal-leading-zero' ] );
	assert.deepEqual( r.decided, { markerType: 'numbered', numberFormat: 'decimal-leading-zero' } );
} );

test( 'MUST FAIL (typed ordinals): "01", "02", "03" in each marker element are numbered with leading zeros', () => {
	const r = run( parts( ( k ) => ( { words: `0${ k }` } ) ) );
	assert.deepEqual( [ write( r, 'markerType' ), write( r, 'numberFormat' ) ], [ 'numbered', 'decimal-leading-zero' ] );
	const dotted = run( parts( ( k ) => ( { words: `${ k }.` } ) ) );
	assert.equal( write( dotted, 'markerType' ), 'numbered' );
} );

test( 'MUST FAIL (a disc or a dot glyph is a bullet): a disc list style, and a "•" in the marker element, write bullet', () => {
	assert.equal( write( run( each( () => li( 'disc' ) ) ), 'markerType' ), 'bullet' );
	assert.equal( write( run( parts( () => ( { words: '•' } ) ) ), 'markerType' ), 'bullet' );
	assert.equal( write( run( parts( () => ( { words: '–' } ) ) ), 'markerType' ), 'bullet' );
} );

test( 'MUST FAIL (a ::before counter or dot is the marker when the list style is none)', () => {
	const counter = run( each( () => ( { words: 'x', marker: { type: 'none', image: 'none', content: 'normal' }, pseudo: { '::before': { content: 'counter(step, decimal-leading-zero) ". "' } } } ) ) );
	assert.deepEqual( [ write( counter, 'markerType' ), write( counter, 'numberFormat' ) ], [ 'numbered', 'decimal-leading-zero' ] );
	const dot = run( each( () => ( { words: 'x', marker: null, pseudo: { '::before': { content: '""', 'background-color': 'rgb(200, 0, 0)', width: '8px', height: '8px' } } } ) ) );
	assert.equal( write( dot, 'markerType' ), 'bullet' );
} );

test( 'MUST FAIL (an emoji marker reaches its item): a glyph at every marker writes emoji and each item\'s icon name from its role', () => {
	const r = run( parts( ( k ) => ( { words: [ '✅', '⭐', '🚀' ][ k - 1 ] } ) ) );
	assert.equal( write( r, 'markerType' ), 'emoji' );
	assert.deepEqual( write( r, 'items' ).map( ( i ) => [ i.iconSource, i.iconName, i.text ] ), [ [ 'emoji', '✅', 'One' ], [ 'emoji', '⭐', 'Two' ], [ 'emoji', '🚀', 'Three' ] ] );
	const marked = run( each( () => li( '"✓ "' ) ) );
	assert.equal( write( marked, 'markerType' ), 'emoji', 'a string list style is a glyph marker' );
} );

test( 'MUST FAIL (CSS markers pair with the block\'s ::marker): an item drawing a list style pairs its item part\'s ::marker', () => {
	const reads = each( () => li( 'decimal' ) );
	assert.deepEqual( markerSlots( { db, block: BLOCK, cal, slots: Object.keys( reads ), reads } ), { 1: `${ ITEM( 1 ) }::marker`, 2: `${ ITEM( 2 ) }::marker`, 3: `${ ITEM( 3 ) }::marker` } );
	// A copy with a marker part keeps the part; the item's own list style is not read for it.
	const both = { ...reads, [ MARK( 1 ) ]: { words: '' } };
	assert.equal( markerSlots( { db, block: BLOCK, cal, slots: Object.keys( both ), reads: both } )[ 1 ], MARK( 1 ) );
} );

test( 'ordinals: digits, leading zeros, roman numerals and letters', () => {
	assert.deepEqual( M.ordinal( '1' ), { n: 1, formats: [ 'decimal' ] } );
	assert.deepEqual( M.ordinal( '(07)' ), { n: 7, formats: [ 'decimal-leading-zero' ] } );
	assert.deepEqual( M.ordinal( 'iv.' ), { n: [ 4 ], formats: [ 'lower-roman' ] } );
	assert.deepEqual( M.ordinal( 'C)' ), { n: [ 100, 3 ], formats: [ 'upper-roman', 'upper-alpha' ] } );
	assert.equal( M.ordinal( 'Step' ), null );
	assert.equal( M.drawnByCss( { marker: { type: 'none', image: 'none', content: 'normal' } } ), null );
} );

test( 'negative control: no marker at any item is none; flex items draw no marker', () => {
	assert.equal( write( run( each( flex ) ), 'markerType' ), 'none' );
	assert.equal( write( run( each( () => li( 'none' ) ) ), 'markerType' ), 'none' );
	assert.equal( write( run( {} ), 'markerType' ), 'none' );
} );

test( 'negative control: typed numbers that do not count from 1, mixed markers and a large ::before choose nothing', () => {
	const late = run( parts( ( k ) => ( { words: String( k + 2 ) } ) ) );
	assert.equal( write( late, 'markerType' ), undefined );
	assert.match( late.notes.join(), /count up from 1/ );
	const mixed = run( { [ MARK( 1 ) ]: { words: '1' }, [ MARK( 2 ) ]: { words: '•' }, [ MARK( 3 ) ]: { words: '3' } } );
	assert.equal( write( mixed, 'markerType' ), undefined );
	const banner = run( each( () => ( { words: 'x', marker: { type: 'none', image: 'none', content: 'normal' }, pseudo: { '::before': { content: '""', 'background-color': 'rgb(0, 0, 0)', width: '320px', height: '4px' } } } ) ) );
	assert.equal( write( banner, 'markerType' ), 'none', 'a wide painted ::before is a decoration, not a marker' );
} );

test( 'negative control: a number style or marker the DB does not list is a named row, never written', () => {
	const roman = run( each( () => li( 'lower-roman' ) ) );
	assert.equal( write( roman, 'markerType' ), 'numbered' );
	assert.equal( write( roman, 'numberFormat' ), undefined );
	assert.equal( roman.unmapped.find( ( u ) => 'list-style-type' === u.property )?.value, 'lower-roman' );
	const image = run( each( () => li( 'disc', { image: 'url("tick.png")' } ) ) );
	assert.equal( write( image, 'markerType' ), undefined );
	assert.equal( image.unmapped.find( ( u ) => 'marker' === u.property )?.value, 'image' );
	assert.deepEqual( listMarkerDecisions( { db, block: 'sgs/heading', cal, attributes: { items }, reads: each( () => li( 'decimal' ) ) } ), { writes: [], unmapped: [], notes: [] } );
} );
