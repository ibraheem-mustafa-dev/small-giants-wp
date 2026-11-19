// A button setting with no enum in the framework DB is open: it holds every snapshot preset name except the reserved styles
// (lib/fill-preset.mjs::presetVariants). A setting with an enum still filters by it. Both shapes are built in memory, so the
// result never depends on which one the shared framework DB holds at the time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { presetVariants, presetBlocks, presetWrites } from '../lib/fill-preset.mjs';

function dbWith( rows ) {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT, default_value TEXT, enum_values TEXT)' );
	const add = db.prepare( 'INSERT INTO block_attributes VALUES (?, ?, ?, ?, ?)' );
	rows.forEach( ( r ) => add.run( ...r ) );
	return db;
}
const BUTTON_OPEN = [ 'sgs/button', 'inheritStyle', 'string', '"primary"', null ];
const BUTTON_ENUM = [ 'sgs/button', 'inheritStyle', 'string', '"primary"', '["primary", "secondary", "outline", "link", "custom"]' ];
const HEADING = [ 'sgs/heading', 'inheritStyle', 'boolean', 'false', null ];
const NAMES = { primary: {}, gold: {}, ghost: {}, default: {}, link: {}, custom: {} };

test( 'MUST FAIL: a button setting with no enum holds every snapshot preset name except the reserved ones', () => {
	const v = presetVariants( dbWith( [ BUTTON_OPEN, HEADING ] ), NAMES );
	assert.deepEqual( v[ 'sgs/button' ], { attr: 'inheritStyle', variants: [ 'primary', 'gold', 'ghost' ] } );
} );

test( 'a boolean inheritStyle (heading) is never a preset block, whatever the DB says about its enum (negative control)', () => {
	const v = presetVariants( dbWith( [ BUTTON_OPEN, HEADING ] ), NAMES );
	assert.equal( v[ 'sgs/heading' ], undefined );
} );

test( 'a button setting with an enum still holds only the names the enum lists (today\'s shape, unchanged)', () => {
	const v = presetVariants( dbWith( [ BUTTON_ENUM ] ), NAMES );
	assert.deepEqual( v[ 'sgs/button' ].variants, [ 'primary', 'link', 'custom' ] );
} );

test( 'presetBlocks finds the button for a fifth name only when its setting is open', () => {
	assert.equal( presetBlocks( dbWith( [ BUTTON_OPEN ] ), [ 'primary', 'gold' ] )[ 'sgs/button' ], 'inheritStyle' );
	assert.equal( presetBlocks( dbWith( [ BUTTON_ENUM ] ), [ 'primary', 'gold' ] )[ 'sgs/button' ], undefined );
} );

test( 'presetWrites matches a look to a fifth named preset when the setting is open', () => {
	const GOLD = { background: '#d8ca50', text: '#000000', 'border-width': '0px', padding: '10px 20px 10px 20px', 'font-size': '16px', 'font-weight': '700' };
	const STYLES = { 'background-color': 'rgb(216, 202, 80)', color: 'rgb(0, 0, 0)', 'border-top-width': '0px', 'padding-top': '10px', 'padding-right': '20px', 'padding-bottom': '10px', 'padding-left': '20px', 'font-size': '16px', 'font-weight': '700' };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles: STYLES } } ] ) ), states: {} };
	const run = ( db ) => {
		const flat = [ { name: 'sgs/button', attributes: {}, ref: 'r0' } ];
		const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
		presetWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: { gold: GOLD } } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes: [], db } );
		return flat[ 0 ].attributes.inheritStyle;
	};
	assert.equal( run( dbWith( [ BUTTON_OPEN ] ) ), 'gold' );
	assert.equal( run( dbWith( [ BUTTON_ENUM ] ) ), undefined, 'an enum that does not list the name keeps it unwritten (negative control)' );
} );
