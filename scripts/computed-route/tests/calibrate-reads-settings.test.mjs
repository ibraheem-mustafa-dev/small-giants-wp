// Calibration reaches every routed SGS setting whose css_property is a CSS property (Phase 3 loop 1,
// .claude/reports/2026-10-25-no-setting-diagnosis.md): sgs/container.overflow, sgs/text.fontVariantNumeric,
// sgs/text.textShadow and sgs/decorative-image.shape were absent from the cache because `longhands()` dropped a
// css_property that READ_PROPS does not list (font-variant-numeric, clip-path), never reached a shorthand through its
// read longhands (overflow), and planned no marker for a free-text text-shadow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { READ_PROPS, longhands, unreadProps } from '../lib/calibrate-props.mjs';
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
	assert.equal( paintKeyOf( 'a', 'b', {}, [] ), paintKeyOf( 'a', 'b', {} ), 'an untouched block keeps its paint key' );
	assert.notEqual( paintKeyOf( 'a', 'b', {}, [ 'align-self' ] ), paintKeyOf( 'a', 'b', {} ), 'a paint read without the property is stale, never taken as its absence' );
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
