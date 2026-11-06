// Calibration reaches every routed SGS setting whose css_property is a CSS property (Phase 3 loop 1,
// .claude/reports/2026-10-25-no-setting-diagnosis.md): sgs/container.overflow, sgs/text.fontVariantNumeric,
// sgs/text.textShadow and sgs/decorative-image.shape were absent from the cache because `longhands()` dropped a
// css_property that READ_PROPS does not list (font-variant-numeric, clip-path), never reached a shorthand through its
// read longhands (overflow), and planned no marker for a free-text text-shadow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { READ_PROPS, READ_KEY, longhands, unreadProps } from '../lib/calibrate-props.mjs';
import { slotMapSkip, writeSlotMap } from '../lib/cache.mjs';
import { fullBecause } from '../lib/calibrate-incremental.mjs';
import { blockState } from '../lib/stage0.mjs';
import { paintKeyOf } from '../calibrate.mjs';
import { markersFor, slotFor } from '../lib/calibrate.mjs';
import { preconditionsFor } from '../lib/calibrate-instances.mjs';
import { attrsFor, openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { isCssProperty } from '../lib/css-families.mjs';

const db = openDb();
const SNAPSHOT = { palette: [], spacing: [], fontSizes: [] };
const rowOf = ( block, attr ) => {
	const row = attrsFor( db, block ).find( ( r ) => r.attr_name === attr );
	assert.ok( row, `${ block }.${ attr } is in the framework DB` );
	return row;
};

test( 'MUST FAIL: an overflow setting is reached through the overflow-x and overflow-y that calibration reads', () => {
	assert.deepEqual( longhands( 'overflow' ), [ 'overflow-x', 'overflow-y' ] );
	const row = rowOf( 'sgs/container', 'overflow' );
	const marker = markersFor( row, blockSchema( 'sgs/container' ), SNAPSHOT ).find( ( m ) => 'enum-clip' === m.label );
	assert.ok( marker, 'a clip marker is planned' );
	const rest = { 1440: { '': { 'overflow-x': 'visible', 'overflow-y': 'visible' } } };
	const marked = { 1440: { '': { 'overflow-x': 'clip', 'overflow-y': 'clip' } } };
	const slot = slotFor( row, marker, rest, marked );
	assert.ok( ! slot.dead, 'the reading is reached, not dead' );
	assert.equal( slot.slot, '' );
} );

test( 'MUST FAIL: font-variant-numeric and clip-path are read, so their settings are routed', () => {
	for ( const p of [ 'font-variant-numeric', 'clip-path' ] ) {
		assert.ok( READ_PROPS.includes( p ), `${ p } is read` );
	}
	assert.deepEqual( longhands( 'font-variant-numeric' ), [ 'font-variant-numeric' ] );
	assert.deepEqual( longhands( 'clip-path' ), [ 'clip-path' ] );
	for ( const [ block, attr ] of [ [ 'sgs/text', 'fontVariantNumeric' ], [ 'sgs/decorative-image', 'shape' ] ] ) {
		const row = rowOf( block, attr );
		assert.ok( markersFor( row, blockSchema( block ), SNAPSHOT ).length, `${ block }.${ attr } gets a marker` );
	}
} );

test( 'MUST FAIL: a free-text text-shadow setting and a free-text overflow setting get a marker, and a text shadow colour its shape partner', () => {
	const shadow = rowOf( 'sgs/text', 'textShadow' );
	const ms = markersFor( shadow, blockSchema( 'sgs/text' ), SNAPSHOT );
	assert.ok( ms.length && ms.every( ( m ) => 'string' === typeof m.attrs.textShadow ), 'textShadow gets a marker' );
	assert.match( ms[ 0 ].attrs.textShadow, /^\d+px \d+px \d+px #/, 'a text shadow has no spread: offset, offset, blur' );
	const free = rowOf( 'sgs/decorative-image', 'overflow' );
	assert.ok( markersFor( free, blockSchema( 'sgs/decorative-image' ), SNAPSHOT ).length, 'a free-text overflow gets a marker' );
	const colour = rowOf( 'sgs/text', 'textShadowColour' );
	const pre = preconditionsFor( colour, blockSchema( 'sgs/text' ), {}, {} );
	assert.match( pre.textShadow ?? '', /^\d+px \d+px \d+px$/, 'a colour alone composes no shadow: the shape it colours is its precondition' );
} );

test( 'MUST FAIL: a routed CSS property the global list lacks is read for its own block alone, so the list READ_KEY hashes stays as it was', () => {
	assert.equal( READ_PROPS.includes( 'align-self' ), false, 'the global list does not grow' );
	assert.deepEqual( longhands( 'align-self' ), [ 'align-self' ] );
	assert.deepEqual( longhands( 'mask-image' ), [ 'mask-image' ] );
	assert.deepEqual( longhands( 'not-a-css-property' ), [], 'negative control: a name that is no CSS property reads nothing' );
	assert.deepEqual( longhands( 'overflow' ), [ 'overflow-x', 'overflow-y' ], 'a property reached through read longhands stays there' );
	for ( const [ block, attr, prop ] of [ [ 'sgs/button', 'alignSelf', 'align-self' ], [ 'sgs/post-grid', 'readMorePin', 'align-self' ], [ 'sgs/label', 'markerIcon', 'mask-image' ] ] ) {
		assert.ok( unreadProps( attrsFor( db, block ) ).includes( prop ), `${ block } reads ${ prop }` );
		assert.ok( markersFor( rowOf( block, attr ), blockSchema( block ), SNAPSHOT ).length, `${ block }.${ attr } gets a marker` );
	}
	assert.deepEqual( unreadProps( attrsFor( db, 'sgs/text' ) ), [], 'negative control: a block routing only read properties reads no more' );
	assert.deepEqual( longhands( 'left,rule' ), [ 'left' ], 'a setting already reached through one property adds none of its others' );
	for ( const block of [ 'sgs/collapsible-text', 'sgs/timeline' ] ) {
		assert.deepEqual( unreadProps( attrsFor( db, block ) ), [], `${ block } is reached through its read properties, so its map stays as it is` );
	}
	assert.deepEqual( longhands( 'place-self' ).sort(), [ 'align-self', 'justify-self' ], 'an unread shorthand is read as its longhands' );
	assert.equal( fullBecause( { prev: { fingerprints: {}, extraProps: [ 'align-self' ], readKey: 'k' }, extraProps: [ 'align-self', 'mask-image' ], readKey: 'k' } )?.includes( 'own read list' ), true, 'a changed list measures the block in full and says why' );
	assert.equal( paintKeyOf( 'a', 'b', {}, [] ), paintKeyOf( 'a', 'b', {} ), 'an untouched block keeps its paint key' );
	assert.notEqual( paintKeyOf( 'a', 'b', {}, [ 'align-self' ] ), paintKeyOf( 'a', 'b', {} ), 'a paint read without the property is stale, never taken as its absence' );
} );

test( 'MUST FAIL: a slot map measured without a block property is due on any site, and stage 0 calls it stale; one that has it, or a block with none, stays as it was', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'extra-props-' ) );
	const write = ( map ) => writeSlotMap( dir, 'sgs/x', { block: 'sgs/x', site: 'site-a', slotKey: 'k1', readKey: READ_KEY, settings: {}, ...map } );
	const state = ( extraProps ) => blockState( { cacheDir: dir, block: 'sgs/x', hashes: { deployed: 'k1', local: 'k1' }, fixtures: { 'sgs/x': {} }, extraProps } );
	write( {} );
	assert.equal( slotMapSkip( dir, 'sgs/x', 'site-a', 'k1', false, [ 'align-self' ] ), null, 'the same site measures it' );
	assert.equal( slotMapSkip( dir, 'sgs/x', 'site-b', 'k1', false, [ 'align-self' ] ), null, 'and so does any other site' );
	assert.equal( state( [ 'align-self' ] ).state, 'stale' );
	assert.match( state( [ 'align-self' ] ).why, /align-self/ );
	assert.match( slotMapSkip( dir, 'sgs/x', 'site-a', 'k1' ), /current/, 'negative control: a block with no extra property keeps its current map' );
	assert.notEqual( state( [] ).state, 'stale' );
	write( { extraProps: [ 'align-self' ] } );
	assert.match( slotMapSkip( dir, 'sgs/x', 'site-a', 'k1', false, [ 'align-self' ] ), /current/, 'a map holding the reading is current' );
	assert.notEqual( state( [ 'align-self' ] ).state, 'stale' );
	assert.equal( slotMapSkip( dir, 'sgs/x', 'site-a', 'k1', false, [ 'align-self', 'mask-image' ] ), null, 'a second new property is due again' );
} );

test( 'MUST FAIL: a tier setting is marked with values its emitter holds; a length setting keeps its length markers', () => {
	const values = ( block, attr ) => markersFor( rowOf( block, attr ), blockSchema( block ), SNAPSHOT ).filter( ( m ) => ! m.probe ).map( ( m ) => m.attrs[ attr ]?.desktop );
	assert.deepEqual( values( 'sgs/post-grid', 'readMorePin' ), [ 'pinned', 'inline' ] );
	assert.ok( values( 'sgs/button', 'contentAlign' ).every( ( v ) => [ 'flex-start', 'center', 'flex-end' ].includes( v ) ), 'never a keyword the emitter drops' );
	assert.deepEqual( values( 'sgs/text', 'maxWidthAlign' ), [ 'left', 'centre' ], 'an alignment on margin-inline is marked with its choices, never a length' );
	assert.ok( values( 'sgs/container', 'minHeight' ).every( ( v ) => /^\d+px$/.test( v ) ), 'a preset never replaces a length marker' );
} );

// The detector: a routed SGS setting whose css_property is CSS but which calibration neither reads nor reaches through a
// read longhand is a setting calibration can never see, whatever block it sits on (lib/calibrate.mjs::calibrateBlock
// drops a row with no longhands).
test( 'MUST FAIL: every routed SGS setting that paints a CSS property is read or reached through a read longhand', () => {
	const blocks = db.prepare( "SELECT DISTINCT block_slug FROM block_attributes WHERE css_property IS NOT NULL AND source IN ( 'sgs', 'sgs-ext' )" ).all().map( ( r ) => r.block_slug );
	const unreachable = new Map();
	for ( const block of blocks ) {
		for ( const row of attrsFor( db, block ) ) {
			const listed = row.css_property.split( ',' ).map( ( s ) => s.trim() ).filter( ( s ) => isCssProperty( s ) );
			if ( listed.length && ! longhands( row.css_property ).length ) {
				const key = listed.join( ',' );
				( unreachable.get( key ) ?? unreachable.set( key, [] ).get( key ) ).push( `${ block }.${ row.attr_name }` );
			}
		}
	}
	assert.deepEqual( [ ...unreachable ].map( ( [ p, who ] ) => `${ p }: ${ who.slice( 0, 3 ).join( ', ' ) } (${ who.length })` ), [] );
} );
