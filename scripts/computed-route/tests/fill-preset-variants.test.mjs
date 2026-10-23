// The preset variants Fill matches are the snapshot's buttonPresets names that the block's `inheritStyle` values hold in the
// framework DB (lib/fill-preset.mjs::presetVariants), never a hand-written list (FP-1): a client's `link` variant is matched,
// and a snapshot key no block value names (`default`, a typo) is not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { presetWrites, presetVariants } from '../lib/fill-preset.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const enumOf = ( block ) => JSON.parse( db.prepare( "SELECT enum_values FROM block_attributes WHERE block_slug = ? AND attr_name = 'inheritStyle'" ).get( block ).enum_values );
const LINK = { background: 'transparent', text: '#0a7ea8', 'border-width': '0px', padding: '0px 0px 0px 0px', 'font-size': '15px', 'font-weight': '600' };
const STYLES = { 'background-color': 'transparent', color: 'rgb(10, 126, 168)', 'border-top-width': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'font-size': '15px', 'font-weight': '600' };
const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles: STYLES } } ] ) ), states: {} };
const run = ( presets ) => {
	const flat = [ { name: 'sgs/button', attributes: {}, ref: 'r0' } ];
	const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
	return { flat, ...presetWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: presets } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes: [], db } ) };
};

test( 'MUST FAIL: a client variant the block\'s inheritStyle values hold beyond primary, secondary and outline is matched', () => {
	assert.ok( enumOf( 'sgs/button' ).includes( 'link' ), 'the DB lists link among the button\'s variants' );
	assert.equal( run( { link: LINK } ).flat[ 0 ].attributes.inheritStyle, 'link' );
} );

test( 'presetVariants is the snapshot names intersected with each block\'s DB values', () => {
	const v = presetVariants( db, { primary: {}, link: {}, default: {}, ghosty: {} } );
	assert.deepEqual( v[ 'sgs/button' ], { attr: 'inheritStyle', variants: [ 'primary', 'link' ] } );
	assert.equal( v[ 'sgs/heading' ], undefined, 'a block whose inheritStyle holds no variants is not a preset block' );
	assert.deepEqual( presetVariants( db, { ghosty: {} } )[ 'sgs/button' ], { attr: 'inheritStyle', variants: [] }, 'a button still paints its default variant' );
} );

test( 'a snapshot key no inheritStyle value names is never written, whatever it matches (negative control)', () => {
	assert.equal( run( { ghosty: LINK } ).flat[ 0 ].attributes.inheritStyle, undefined );
	assert.equal( run( { ghosty: LINK, link: LINK } ).flat[ 0 ].attributes.inheritStyle, 'link' );
} );
