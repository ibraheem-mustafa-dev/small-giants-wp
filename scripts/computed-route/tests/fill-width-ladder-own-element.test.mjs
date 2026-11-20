// The width ladder's rung 2 (lib/fill-width-ladder.mjs) breaks a tie between tier-shaped settings as the resolver does
// (lib/resolve.mjs::ownElementSetting): a setting the DB ties to a named part of the block (a canonical_slot and no
// css_element: a layer's centre position, which holds a number and adds a centring translate) never takes the element's
// own offset from the setting the DB ties to the element (an edge offset, css_element wrapper).
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites } from '../lib/fill-width-ladder.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const tier = { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' };
const dbFile = fixtureDb( {
	blocks: [ { slug: 'sgs/layer', title: 'Layer', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/pair', title: 'Pair', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/loose', title: 'Loose', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		// Listed first, so a rung that takes the first candidate takes the part.
		{ block_slug: 'sgs/layer', attr_name: 'centreX', css_property: 'left', css_element: null, canonical_slot: 'centreX', ...tier },
		{ block_slug: 'sgs/layer', attr_name: 'edgeLeft', css_property: 'left', css_element: 'wrapper', ...tier },
		// Negative control: two element settings tie, and the first still takes it.
		{ block_slug: 'sgs/pair', attr_name: 'leftA', css_property: 'left', css_element: 'wrapper', ...tier },
		{ block_slug: 'sgs/pair', attr_name: 'leftB', css_property: 'left', css_element: 'wrapper', ...tier },
		// Negative control: a setting with no element that the DB names no part of is no part, so the tie stays.
		{ block_slug: 'sgs/loose', attr_name: 'looseLeft', css_property: 'left', css_element: null, ...tier },
		{ block_slug: 'sgs/loose', attr_name: 'edgeLeft', css_property: 'left', css_element: 'wrapper', ...tier },
	],
} );
const db = openDb( dbFile );

// The resolver refuses a percentage (formatValue has no px for it), as it does for a real layer's offset.
const resolver = ( { draft } ) => ( { status: 'gap', gap: 'shape', detail: `${ Object.values( draft )[ 0 ] } cannot be held` } );

function world( block ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: block, parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 200, h: 300 }, layoutDisplay: 'block', styles: { display: 'block', left: '2%' } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
// Calibration: every candidate paints the element, whose default left is 0px at every width.
const calOf = ( attrs ) => ( { settings: Object.fromEntries( attrs.map( ( a ) => [ a, { slot: '' } ] ) ), elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { left: '0px' } ] ) ) } } );
const row = ( block ) => ( { node: 'n0', block, slot: '', property: 'left', value: '{"375":"2%","768":"2%","1440":"2%"}', reason: 'shape: 2% cannot be held' } );
const run = ( w, block, attrs ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ row( block ) ], calFor: () => calOf( attrs ), scope: 'home', resolver, date: '2026-11-20' } );

test( 'MUST FAIL: a percentage offset the resolver refuses goes to the element\'s own edge setting, never the part\'s centre setting listed first', () => {
	const w = world( 'sgs/layer' );
	const r = run( w, 'sgs/layer', [ 'centreX', 'edgeLeft' ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.edgeLeft, { desktop: '2%', tablet: '2%', mobile: '2%' } );
	assert.equal( w.flat[ 0 ].attributes.centreX, undefined );
} );

test( 'negative control: a tie between two element settings is left as it was, the first takes the value', () => {
	const w = world( 'sgs/pair' );
	const r = run( w, 'sgs/pair', [ 'leftA', 'leftB' ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.leftA, { desktop: '2%', tablet: '2%', mobile: '2%' } );
	assert.equal( w.flat[ 0 ].attributes.leftB, undefined );
} );

test( 'negative control: a part setting alone still takes the value (nothing else paints the element)', () => {
	const w = world( 'sgs/layer' );
	run( w, 'sgs/layer', [ 'centreX' ] );
	assert.deepEqual( w.flat[ 0 ].attributes.centreX, { desktop: '2%', tablet: '2%', mobile: '2%' } );
} );

test( 'negative control: a setting with no element and no named part is no part, so the tie is left and the first takes the value', () => {
	const w = world( 'sgs/loose' );
	run( w, 'sgs/loose', [ 'looseLeft', 'edgeLeft' ] );
	assert.deepEqual( w.flat[ 0 ].attributes.looseLeft, { desktop: '2%', tablet: '2%', mobile: '2%' } );
	assert.equal( w.flat[ 0 ].attributes.edgeLeft, undefined );
} );
