// A button setting whose block.json declares no enum is open: it holds every snapshot preset name except the reserved styles
// (lib/fill-preset.mjs::presetVariants), whatever list the framework DB holds for it (the reseed fills a list from the values
// the block's source compares the setting with). A setting whose block.json declares an enum still filters by the DB's list.
// The DB rows and the block.json shapes are built in memory, so the result never depends on the shared framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { presetVariants, presetBlocks, presetWrites } from '../lib/fill-preset.mjs';

function dbWith( rows ) {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT, default_value TEXT, enum_values TEXT, role TEXT, css_element TEXT)' );
	const add = db.prepare( 'INSERT INTO block_attributes VALUES (?, ?, ?, ?, ?, ?, ?)' );
	rows.forEach( ( r ) => add.run( ...r ) );
	return db;
}
const BUTTON_OPEN = [ 'sgs/button', 'inheritStyle', 'string', '"primary"', null, 'button-preset', null ];
const BUTTON_ENUM = [ 'sgs/button', 'inheritStyle', 'string', '"primary"', '["primary", "secondary", "outline", "link", "custom"]', 'button-preset', null ];
// A boolean `inheritStyle` that carries the preset role by mistake: the type test still keeps it out.
const HEADING = [ 'sgs/heading', 'inheritStyle', 'boolean', 'false', null, 'button-preset', null ];
const BUTTON_SOURCE_LIST = [ 'sgs/button', 'inheritStyle', 'string', '"primary"', '["link", "custom", "primary"]', 'button-preset', null ];
const NAMES = { primary: {}, gold: {}, ghost: {}, default: {}, link: {}, custom: {} };
// block.json as it stands (no enum on inheritStyle), and a block.json that declares one.
const OPEN_SCHEMA = () => ( { inheritStyle: { type: 'string', default: 'primary' } } );
const ENUM_SCHEMA = () => ( { inheritStyle: { type: 'string', default: 'primary', enum: [ 'primary', 'secondary', 'outline', 'link', 'custom' ] } } );

test( 'MUST FAIL: a button setting with no enum holds every snapshot preset name except the reserved ones', () => {
	const v = presetVariants( dbWith( [ BUTTON_OPEN, HEADING ] ), NAMES, OPEN_SCHEMA );
	assert.deepEqual( v[ 'sgs/button' ], { attr: 'inheritStyle', variants: [ 'primary', 'gold', 'ghost' ] } );
} );

test( 'a boolean inheritStyle (heading) is never a preset block, whatever the DB says about its enum (negative control)', () => {
	const v = presetVariants( dbWith( [ BUTTON_OPEN, HEADING ] ), NAMES, OPEN_SCHEMA );
	assert.equal( v[ 'sgs/heading' ], undefined );
} );

test( 'MUST FAIL: a list the DB took from the source, on a setting block.json leaves open, does not close it', () => {
	const v = presetVariants( dbWith( [ BUTTON_SOURCE_LIST ] ), NAMES, OPEN_SCHEMA );
	assert.deepEqual( v[ 'sgs/button' ].variants, [ 'primary', 'gold', 'ghost' ] );
	assert.equal( presetBlocks( dbWith( [ BUTTON_SOURCE_LIST ] ), [ 'primary', 'secondary', 'outline' ], OPEN_SCHEMA )[ 'sgs/button' ], 'inheritStyle' );
} );

test( 'a button setting whose block.json declares an enum holds only the names the DB list names (negative control)', () => {
	const v = presetVariants( dbWith( [ BUTTON_ENUM ] ), NAMES, ENUM_SCHEMA );
	assert.deepEqual( v[ 'sgs/button' ].variants, [ 'primary', 'link', 'custom' ] );
} );

test( 'presetBlocks finds the button for a fifth name only when its setting is open', () => {
	assert.equal( presetBlocks( dbWith( [ BUTTON_OPEN ] ), [ 'primary', 'gold' ], OPEN_SCHEMA )[ 'sgs/button' ], 'inheritStyle' );
	assert.equal( presetBlocks( dbWith( [ BUTTON_ENUM ] ), [ 'primary', 'gold' ], ENUM_SCHEMA )[ 'sgs/button' ], undefined );
} );

test( 'presetWrites matches a look to a fifth named preset when the setting is open', () => {
	const GOLD = { background: '#d8ca50', text: '#000000', 'border-width': '0px', padding: '10px 20px 10px 20px', 'font-size': '16px', 'font-weight': '700' };
	const STYLES = { 'background-color': 'rgb(216, 202, 80)', color: 'rgb(0, 0, 0)', 'border-top-width': '0px', 'padding-top': '10px', 'padding-right': '20px', 'padding-bottom': '10px', 'padding-left': '20px', 'font-size': '16px', 'font-weight': '700' };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles: STYLES } } ] ) ), states: {} };
	const run = ( db, schemaOf ) => {
		const flat = [ { name: 'sgs/button', attributes: {}, ref: 'r0' } ];
		const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
		presetWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: { gold: GOLD } } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes: [], db, schemaOf } );
		return flat[ 0 ].attributes.inheritStyle;
	};
	assert.equal( run( dbWith( [ BUTTON_OPEN ] ), OPEN_SCHEMA ), 'gold' );
	assert.equal( run( dbWith( [ BUTTON_ENUM ] ), ENUM_SCHEMA ), undefined, 'an enum that does not list the name keeps it unwritten (negative control)' );
} );

test( 'MUST FAIL: block.json\'s own enum is the list, whatever the DB list says', () => {
	const schema = () => ( { inheritStyle: { type: 'string', enum: [ 'primary', 'gold' ] } } );
	const v = presetVariants( dbWith( [ BUTTON_SOURCE_LIST ] ), NAMES, schema );
	assert.deepEqual( v[ 'sgs/button' ].variants, [ 'primary', 'gold' ] );
} );

test( 'MUST FAIL: a setting block.json declares as boolean is never a preset block, whatever list the DB holds', () => {
	const boolDb = dbWith( [ [ 'sgs/heading', 'inheritStyle', 'string', 'false', '["secondary"]', 'button-preset', null ] ] );
	const v = presetVariants( boolDb, NAMES, () => ( { inheritStyle: { type: 'boolean' } } ) );
	assert.equal( v[ 'sgs/heading' ], undefined );
} );

test( 'a block with no block.json here is judged by the DB: its list, else open for a string (negative control)', () => {
	const none = () => null;
	assert.deepEqual( presetVariants( dbWith( [ BUTTON_ENUM ] ), NAMES, none )[ 'sgs/button' ].variants, [ 'primary', 'link', 'custom' ] );
	assert.deepEqual( presetVariants( dbWith( [ BUTTON_OPEN ] ), NAMES, none )[ 'sgs/button' ].variants, [ 'primary', 'gold', 'ghost' ] );
	assert.equal( presetVariants( dbWith( [ HEADING ] ), NAMES, none )[ 'sgs/heading' ], undefined );
} );
