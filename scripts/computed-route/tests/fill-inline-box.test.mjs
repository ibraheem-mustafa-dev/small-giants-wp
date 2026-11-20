// A draft's inline-level box against a block that paints block-level (lib/fill-inline-box.mjs, called from
// lib/fill-dimensions.mjs::dimensionWrites). Indus Home's "Our Brands" heading is an inline-block h2 with a 2px bottom border,
// centred by a wrapper's text-align: the clone's heading was block-level, so its underline ran the page's width where the
// draft's runs the text's width (298px). The resolver is stood in for by a fixture that records what it is asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensionWrites } from '../lib/fill-dimensions.mjs';

const calls = [];
const ATTR = { width: 'customWidth', 'margin-left': 'marginLeft', 'margin-right': 'marginRight' };
const resolver = ( { prop, draft, block } ) => {
	calls.push( { prop, draft: { ...draft } } );
	if ( 'sgs/nomargin' === block && prop.startsWith( 'margin' ) || 'sgs/nowidth' === block && 'width' === prop ) {
		return { status: 'gap', gap: 'no-setting', detail: `no ${ prop } setting` };
	}
	return { status: 'written', writes: [ { attr: ATTR[ prop ], value: { desktop: draft[ 1440 ] }, merge: 'deep' } ], included: draft };
};
// node 0: the parent section (x 0, 1440 wide); node 1: the heading, `box` its rect at each width.
function world( { block = 'sgs/heading', box = { x: 571, w: 298 }, declared = {}, rect = null } = {} ) {
	const flat = [ { name: 'sgs/container', attributes: {}, ref: 'p' }, { name: block, attributes: {}, ref: 'h' } ];
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, parent: index ? 0 : null, node: n, children: index ? [] : [ 1 ], targets: [ { id: `${ index }:`, index, slot: '', finder: 'x' } ] } ) );
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, {
		'0:': { rect: { x: 0, y: 0, w, h: 200 }, tag: 'section', styles: {} },
		'1:': { rect: rect ? rect( w ) : { x: 571 === box.x ? Math.round( ( w - box.w ) / 2 ) : box.x, y: 20, w: box.w, h: 60 }, tag: 'h2', styles: {} },
	} ] ) );
	return { flat, nodes, reads: { widths, declared: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': {}, '1:': declared } ] ) ) }, refOf: ( n ) => n.ref };
}
const paint = ( display ) => ( { elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { display } ] ) ) } } );
const rowOf = ( o = {} ) => ( { node: 'h', block: 'sgs/heading', slot: '', property: 'display', value: 'inline-block', reason: 'no-setting: no layout setting holds display:inline-block on sgs/heading "" (candidates: sgsHideOnDesktop)', ...o } );
const run = ( w, rows, o = {} ) => dimensionWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db: null, unmapped: rows, calFor: () => paint( 'block' ), scope: 'home', resolver, date: '2026-11-20', ...o } );
const attrs = ( w ) => w.flat[ 1 ].attributes;

test( 'MUST FAIL: an inline-block box centred in its parent is written width fit-content with automatic side margins, and the row settles', () => {
	calls.length = 0;
	const w = world();
	const r = run( w, [ rowOf() ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).customWidth, { desktop: 'fit-content' } );
	assert.deepEqual( [ attrs( w ).marginLeft, attrs( w ).marginRight ], [ { desktop: 'auto' }, { desktop: 'auto' } ] );
	assert.ok( r.writes.every( ( x ) => 'dimension' === x.how ) );
	assert.deepEqual( r.answered[ 0 ].widths, [ 375, 768, 1440 ] );
	assert.match( r.notes[ 0 ], /width fit-content and automatic side margins at 375, 768, 1440/ );
} );

test( 'a box at its parent\'s left edge is shrunk and not centred', () => {
	calls.length = 0;
	const w = world( { box: { x: 0, w: 298 } } );
	const r = run( w, [ rowOf() ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).customWidth, { desktop: 'fit-content' } );
	assert.equal( attrs( w ).marginLeft, undefined );
	assert.deepEqual( calls.map( ( c ) => c.prop ), [ 'width' ], 'negative control: no margin is asked for' );
} );

test( 'a box off the parent centre is shrunk and not centred, and a box as wide as its parent needs no margins', () => {
	calls.length = 0;
	const off = world( { box: { x: 200, w: 298 } } );
	run( off, [ rowOf() ] );
	assert.deepEqual( calls.map( ( c ) => c.prop ), [ 'width' ], 'a box that is neither centred nor at the edge' );
	calls.length = 0;
	const full = world( { rect: ( w ) => ( { x: 0, y: 20, w, h: 60 } ) } );
	run( full, [ rowOf() ] );
	assert.deepEqual( calls.map( ( c ) => c.prop ), [ 'width' ], 'a box exactly as wide as its parent is centred by nothing' );
} );

test( 'MUST FAIL: a block that cannot centre the box keeps its full width: nothing is written and the row names the missing setting', () => {
	const w = world( { block: 'sgs/nomargin' } );
	const r = run( w, [ rowOf( { block: 'sgs/nomargin' } ) ] );
	assert.deepEqual( attrs( w ), {} );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /inline-box: .*holds no margin-left auto/ );
} );

test( 'a block with no width setting that prints fit-content leaves the row with the reason', () => {
	const w = world( { block: 'sgs/nowidth' } );
	const r = run( w, [ rowOf( { block: 'sgs/nowidth' } ) ] );
	assert.match( r.unmapped[ 0 ].reason, /no width setting that prints fit-content/ );
	assert.equal( attrs( w ).customWidth, undefined );
} );

test( 'a draft width on the box, a block that paints inline-level already, or another display value is not this rule\'s row', () => {
	const declared = world( { declared: { width: '320px' } } );
	assert.match( run( declared, [ rowOf() ] ).unmapped[ 0 ].reason, /declares a width \(320px/ );
	assert.deepEqual( attrs( declared ), {} );
	const inline = world();
	assert.match( run( inline, [ rowOf() ], { calFor: () => paint( 'inline-block' ) } ).unmapped[ 0 ].reason, /the block's own display is inline-block/ );
	assert.deepEqual( attrs( inline ), {} );
	const flex = world();
	assert.equal( run( flex, [ rowOf( { value: 'flex' } ) ] ).unmapped[ 0 ].reason.startsWith( 'no-setting' ), true );
	assert.deepEqual( attrs( flex ), {} );
	const state = world();
	assert.deepEqual( run( state, [ rowOf( { state: 'hover' } ) ] ).writes, [] );
} );
