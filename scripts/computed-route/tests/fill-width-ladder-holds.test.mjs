// The width ladder's rung 2 (lib/fill-width-ladder.mjs) writes a per-device setting's value raw, not through the resolver, so it
// checks the setting can hold it (lib/fill-width-ladder.mjs::holdsValue): a setting whose DB default holds a number (a layer's
// turn in degrees, `{ "desktop": 0 }`) never takes the draft's computed `matrix(...)`, which the block cannot render; the row is
// left for the pass that converts it (lib/fill-layer-rotation.mjs). A setting whose default holds no number is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites, holdsValue } from '../lib/fill-width-ladder.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const tier = { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1, role: 'styling', css_element: 'wrapper' };
const dbFile = fixtureDb( {
	blocks: [ { slug: 'sgs/layer', title: 'Layer', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/layer', attr_name: 'turn', css_property: 'transform', default_value: '{"desktop": 0}', ...tier },
		{ block_slug: 'sgs/layer', attr_name: 'edgeLeft', css_property: 'left', default_value: '{}', ...tier },
		{ block_slug: 'sgs/layer', attr_name: 'count', attr_type: 'number', css_property: 'order', default_value: '0', role: 'layout' },
	],
} );
const db = openDb( dbFile );
const MATRIX = 'matrix(0.990268, -0.139173, 0.139173, 0.990268, 0, 0)';
const resolver = ( { draft } ) => ( { status: 'gap', gap: 'shape', detail: `${ Object.values( draft )[ 0 ] } cannot be held` } );

function world( prop, value ) {
	const flat = [ { name: 'sgs/layer', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/layer', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 200, h: 300 }, layoutDisplay: 'block', styles: { display: 'block', [ prop ]: value } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
// The block paints both settings on its root, which rests unturned at 0px.
const cal = { settings: { turn: { slot: '' }, edgeLeft: { slot: '' } }, elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { transform: 'none', left: '0px' } ] ) ) } };
const row = ( prop, value ) => ( { node: 'n0', block: 'sgs/layer', slot: '', property: prop, value: JSON.stringify( { 375: value, 768: value, 1440: value } ), reason: `shape: ${ value } cannot be held` } );
const run = ( w, r ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ r ], calFor: () => cal, scope: 'home', resolver, date: '2026-11-23' } );

test( 'MUST FAIL: a turned layer\'s matrix is never written into a degrees setting; the row is left for the rotation pass', () => {
	const w = world( 'transform', MATRIX );
	const r = run( w, row( 'transform', MATRIX ) );
	assert.equal( w.flat[ 0 ].attributes.turn, undefined );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.unmapped.length, 1 );
	assert.equal( r.unmapped[ 0 ].property, 'transform' );
} );

test( 'negative control: a setting whose default holds no number still takes the draft\'s value per device', () => {
	const w = world( 'left', '2%' );
	const r = run( w, row( 'left', '2%' ) );
	assert.deepEqual( w.flat[ 0 ].attributes.edgeLeft, { desktop: '2%', tablet: '2%', mobile: '2%' } );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'holdsValue: a numeric setting takes numbers and refuses anything else; a flat numeric default counts; others take anything', () => {
	assert.equal( holdsValue( db, 'sgs/layer', 'turn', { desktop: 12, mobile: '-6' } ), true );
	assert.equal( holdsValue( db, 'sgs/layer', 'turn', { desktop: MATRIX } ), false );
	assert.equal( holdsValue( db, 'sgs/layer', 'turn', { desktop: '' } ), false );
	assert.equal( holdsValue( db, 'sgs/layer', 'count', 'auto' ), false );
	assert.equal( holdsValue( db, 'sgs/layer', 'count', 3 ), true );
	assert.equal( holdsValue( db, 'sgs/layer', 'edgeLeft', { desktop: '2%' } ), true );
} );
