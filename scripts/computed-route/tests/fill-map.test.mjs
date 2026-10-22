// Spec 48 FR-48-39 (the map embed), lib/fill-map.mjs: a draft map iframe writes the sgs/business-info map settings (height
// per device, zoom, the draft's whole filter as a custom value), reading the iframe the draft paints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDecisions, zoomOf } from '../lib/fill-map.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const SCHEMA = { mapHeight: { type: 'object' }, mapZoom: { type: 'number' }, mapFilter: { type: 'string' }, mapFilterPreset: { type: 'string' } };
const SRC = 'https://www.google.com/maps?q=1+High+Street&z=14&output=embed';
const embeds = ( over = {} ) => ( {
	1440: { src: SRC, filter: 'grayscale(0.35) contrast(1.05)', h: 210 },
	768: { src: SRC, filter: 'grayscale(0.35) contrast(1.05)', h: 210 },
	375: { src: SRC, filter: 'grayscale(0.35) contrast(1.05)', h: 320 },
	...over,
} );
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'the map settings the writer names are the block\'s own (read from the framework block schema)', () => {
	const schema = blockSchema( 'sgs/business-info' );
	for ( const a of [ 'mapHeight', 'mapZoom', 'mapFilter', 'mapFilterPreset', 'mapSource' ] ) {
		assert.ok( schema && a in schema, `sgs/business-info declares ${ a }` );
	}
} );

test( 'MUST FAIL: the height is written per device, only where a tier differs from the wider one', () => {
	assert.deepEqual( val( mapDecisions( { schema: SCHEMA, embeds: embeds() } ), 'mapHeight' ), { desktop: '210px', mobile: '320px' } );
	assert.deepEqual( val( mapDecisions( { schema: SCHEMA, embeds: embeds( { 768: { src: SRC, filter: 'none', h: 460 }, 375: { src: SRC, filter: 'none', h: 460 } } ) } ), 'mapHeight' ), { desktop: '210px', tablet: '460px' } );
	assert.equal( mapDecisions( { schema: SCHEMA, embeds: embeds() } ).writes.find( ( w ) => 'mapHeight' === w.attr ).merge, 'deep' );
} );

test( 'MUST FAIL: the zoom is the embed address\'s own, a whole number from 1 to 20', () => {
	assert.equal( val( mapDecisions( { schema: SCHEMA, embeds: embeds() } ), 'mapZoom' ), 14 );
	assert.equal( zoomOf( 'https://www.google.com/maps?q=x&zoom=9' ), 9 );
	assert.equal( zoomOf( 'https://www.google.com/maps?q=x&z=40' ), null );
	assert.equal( zoomOf( 'https://www.google.com/maps?q=x' ), null );
	assert.match( mapDecisions( { schema: SCHEMA, embeds: embeds( { 1440: { src: 'https://www.google.com/maps?q=x', filter: 'none', h: 210 } } ) } ).notes.join( '\n' ), /names no zoom/ );
} );

test( 'MUST FAIL: the draft\'s whole filter string is the custom value, every function kept', () => {
	assert.equal( val( mapDecisions( { schema: SCHEMA, embeds: embeds() } ), 'mapFilter' ), 'grayscale(0.35) contrast(1.05)' );
} );

test( 'a filter the block would drop, or one that differs by width, is a named gap with no write', () => {
	const drop = mapDecisions( { schema: SCHEMA, embeds: embeds( { 1440: { src: SRC, filter: 'drop-shadow(0 0 4px red)', h: 210 }, 768: { src: SRC, filter: 'drop-shadow(0 0 4px red)', h: 210 }, 375: { src: SRC, filter: 'drop-shadow(0 0 4px red)', h: 320 } } ) } );
	assert.equal( val( drop, 'mapFilter' ), undefined );
	assert.match( drop.unmapped[ 0 ].reason, /keeps only/ );
	const split = mapDecisions( { schema: SCHEMA, embeds: embeds( { 375: { src: SRC, filter: 'none', h: 320 } } ) } );
	assert.match( split.unmapped[ 0 ].reason, /different filter at different widths/ );
} );

test( 'MUST FAIL: a block without the map settings raises a named gap for each, and an iframe-free node writes nothing', () => {
	const r = mapDecisions( { schema: {}, embeds: embeds() } );
	assert.deepEqual( r.writes, [] );
	assert.deepEqual( r.unmapped.map( ( u ) => u.property ), [ 'height', 'zoom', 'filter' ] );
	assert.deepEqual( mapDecisions( { schema: SCHEMA, embeds: {} } ), { writes: [], unmapped: [], notes: [] } );
} );

test( 'a draft that paints no filter clears one the node holds, and leaves an unfiltered node alone', () => {
	const none = embeds( { 1440: { src: SRC, filter: 'none', h: 210 }, 768: { src: SRC, filter: 'none', h: 210 }, 375: { src: SRC, filter: 'none', h: 320 } } );
	assert.equal( val( mapDecisions( { schema: SCHEMA, attributes: { mapFilter: 'sepia(1)' }, embeds: none } ), 'mapFilter' ), '' );
	assert.equal( mapDecisions( { schema: SCHEMA, attributes: {}, embeds: none } ).writes.some( ( w ) => 'mapFilter' === w.attr ), false );
} );
