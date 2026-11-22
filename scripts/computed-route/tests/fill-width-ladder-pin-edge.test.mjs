// The width ladder's rung 2 (lib/fill-width-ladder.mjs) writes a pin setting (a tier object whose list names the edges top and
// bottom, never sticky) the edge the draft's offset names at each width (lib/resolve-enum.mjs::pinEdges), not the keyword
// "sticky": the block's pin CSS ignores any other value, so a written sticky pinned nothing. A sticky element naming no edge is
// left as a row. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites } from '../lib/fill-width-ladder.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/pinner', title: 'Pinner', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/pinner', attr_name: 'pinEdge', attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1, role: 'layout', css_property: 'position', css_element: 'wrapper', enum_values: '["","none","top","bottom"]' },
	],
} ) );
const resolver = ( { draft } ) => ( { status: 'gap', gap: 'shape', detail: `${ Object.values( draft )[ 0 ] } cannot be held` } );
const W = [ 375, 768, 1440 ];
const world = ( position, offsets ) => {
	const flat = [ { name: 'sgs/pinner', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/pinner', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 200, h: 300 }, layoutDisplay: 'block', styles: { display: 'block', position: position[ w ], top: 'auto', bottom: 'auto', ...( offsets[ w ] || {} ) } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
};
const cal = { settings: { pinEdge: { slot: '' } }, elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { position: 'static' } ] ) ) } };
const row = ( position ) => ( { node: 'n0', block: 'sgs/pinner', slot: '', property: 'position', value: JSON.stringify( position ), reason: 'shape: sticky cannot be held' } );
const run = ( w, position ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ row( position ) ], calFor: () => cal, scope: 'shop', resolver, date: '2026-11-22' } );

test( 'MUST FAIL: a sticky element is written the edge its offset names at each width, never the keyword', () => {
	const position = { 375: 'static', 768: 'sticky', 1440: 'sticky' };
	const w = world( position, { 768: { top: '16px' }, 1440: { top: '24px' } } );
	run( w, position );
	assert.deepEqual( w.flat[ 0 ].attributes.pinEdge, { mobile: 'none', tablet: 'top', desktop: 'top' } );
} );

test( 'MUST FAIL: a sticky element naming no edge writes nothing and keeps the row', () => {
	const position = { 375: 'sticky', 768: 'sticky', 1440: 'sticky' };
	const w = world( position, {} );
	const r = run( w, position );
	assert.equal( w.flat[ 0 ].attributes.pinEdge, undefined );
	assert.equal( r.unmapped.length, 1 );
} );

test( 'negative control: an element the draft leaves static at every width is written none per tier or nothing, never sticky', () => {
	const position = { 375: 'static', 768: 'static', 1440: 'static' };
	const w = world( position, {} );
	run( w, position );
	assert.ok( ! JSON.stringify( w.flat[ 0 ].attributes.pinEdge ?? {} ).includes( 'sticky' ) );
} );
