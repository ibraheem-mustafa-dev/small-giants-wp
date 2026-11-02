// A wrapper is shown wherever a block placed in it is shown (lib/fill-width-gate.mjs::placedChildWidening): a node's shown range
// is the union of its own and that of every child node whose draft element is not inside the node's own element (a block the
// skeleton moved into a part's wrapper). Run against the real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthGateWrites, placedChildWidening } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const gate = ( key, width, via ) => [ key, { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via } } ];
const el = ( key, scIf, chain = [] ) => [ key, { template: { tag: 'div', parentChain: chain, membership: { scIf: scIf.map( ( k ) => ( { key: k, value: '{{ x }}' } ) ) } }, logic: { holes: {} } } ];
const factsOf = ( ...pairs ) => ( { elements: Object.fromEntries( pairs ) } );
const compact = { bp: 'c', is: true, when: { w: '<', n: 1024 } };
const tabletOnly = { all: [ { w: '>=', n: 768 }, { w: '<', n: 1024 } ] };

// Skeleton nodes: `n` is the draft element number (null: no draft element); `parent` an index or null.
function skeleton( specs ) {
	const flat = specs.map( ( s, i ) => ( { name: s.name, attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = specs.map( ( s, index ) => ( { index, name: s.name, parent: s.parent ?? null, node: { draftRef: null === s.n ? null : { tpl: `Page/${ s.n }#0` } }, children: [], targets: [] } ) );
	return { flat, nodes };
}
const run = ( specs, facts ) => {
	const { flat, nodes } = skeleton( specs );
	return { flat, nodes, ...widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'header', entries: [], date: '2026-10-23' } ) };
};
// The wrapper (56) sits under the compact-only sc-if (55); its own button (57) under a tablet-only one (58) inside it; the
// navigation (45) is elsewhere in the draft, under no sc-if.
const wrapperFacts = () => factsOf( gate( 'Page/55', compact, 'isCompact' ), gate( 'Page/58', tabletOnly, 'tablet' ), el( 'Page/56', [ 'Page/55' ], [ 'Page/55' ] ), el( 'Page/57', [ 'Page/55', 'Page/58' ], [ 'Page/55', 'Page/56' ] ), el( 'Page/45', [] ) );
const specs = [ { name: 'sgs/container', n: 56 }, { name: 'sgs/nav-bar-menu', n: 45, parent: 0 }, { name: 'sgs/button', n: 57, parent: 0 } ];

test( 'MUST FAIL WITHOUT THE PLACED-CHILD UNION: a gated wrapper holding a placed block shown at other widths is shown there; its own tablet-only child keeps its gate', () => {
	const r = run( specs, wrapperFacts() );
	assert.deepEqual( r.flat[ 0 ].attributes, {}, 'the wrapper is shown at every width the navigation is' );
	assert.deepEqual( r.flat[ 1 ].attributes, {}, 'the navigation carries no hide flag' );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnMobile: true, sgsHideOnDesktop: true }, 'the button keeps its tablet-only gate' );
} );

test( 'MUST FAIL WITHOUT THE PLACED-CHILD UNION: the widening is named in the gate\'s via, and a placed block gated to narrower widths adds only those', () => {
	const facts = wrapperFacts();
	facts.elements[ 'Page/45' ].template.membership.scIf = [ { key: 'Page/58', value: '{{ x }}' } ];
	const { nodes } = skeleton( specs.slice( 0, 2 ) );
	assert.deepEqual( placedChildWidening( nodes, facts ).get( 0 ).shown, [ [ 0, 1024 ] ], 'tablet-only inside 0-1023 is no wider' );
	const wide = wrapperFacts();
	wide.elements[ 'Page/45' ].template.membership.scIf = [ { key: 'Page/59', value: '{{ x }}' } ];
	wide.elements[ 'Page/59' ] = gate( 'Page/59', { w: '>=', n: 1280 }, 'w >= 1280' )[ 1 ];
	const g = placedChildWidening( nodes, wide ).get( 0 );
	assert.deepEqual( g.shown, [ [ 0, 1024 ], [ 1280, Infinity ] ] );
	assert.match( g.via.join( ' ' ), /widened to hold sgs\/nav-bar-menu \(Page\/45\)/ );
} );

test( 'a control: a gated wrapper holding only its own children keeps its hide flags', () => {
	const facts = factsOf( gate( 'Page/55', compact, 'isCompact' ), el( 'Page/56', [ 'Page/55' ], [ 'Page/55' ] ), el( 'Page/57', [ 'Page/55' ], [ 'Page/55', 'Page/56' ] ) );
	const r = run( [ { name: 'sgs/container', n: 56 }, { name: 'sgs/button', n: 57, parent: 0 } ], facts );
	assert.deepEqual( r.flat[ 0 ].attributes, { sgsHideOnDesktop: true } );
	assert.deepEqual( r.flat[ 1 ].attributes, {}, 'the child is hidden by its parent' );
} );

test( 'a placed block whose element key cannot be resolved changes nothing', () => {
	const r = run( [ { name: 'sgs/container', n: 56 }, { name: 'sgs/nav-bar-menu', n: null, parent: 0 } ], wrapperFacts() );
	assert.deepEqual( r.flat[ 0 ].attributes, { sgsHideOnDesktop: true } );
} );

test( 'MUST FAIL WITHOUT THE CONTAINMENT TEST: an ungated block inside the wrapper\'s own element cannot widen it', () => {
	const facts = factsOf( gate( 'Page/55', compact, 'isCompact' ), el( 'Page/56', [ 'Page/55' ], [ 'Page/55' ] ), el( 'Page/57', [], [ 'Page/55', 'Page/56' ] ) );
	const r = run( [ { name: 'sgs/container', n: 56 }, { name: 'sgs/button', n: 57, parent: 0 } ], facts );
	assert.deepEqual( r.flat[ 0 ].attributes, { sgsHideOnDesktop: true } );
} );

test( 'MUST FAIL WITHOUT THE BOTTOM-UP PASS: a block placed in a placed block widens the whole chain, and a wrapper shown at every width holds no gate', () => {
	const facts = wrapperFacts();
	facts.elements[ 'Page/60' ] = el( 'Page/60', [ 'Page/58' ], [ 'Page/58' ] )[ 1 ];
	const { nodes } = skeleton( [ { name: 'sgs/container', n: 56 }, { name: 'sgs/container', n: 60, parent: 0 }, { name: 'sgs/nav-bar-menu', n: 45, parent: 1 } ] );
	const g = placedChildWidening( nodes, facts );
	assert.equal( g.has( 0 ), false, 'the nav is shown everywhere, so the outer wrapper is' );
	assert.equal( g.has( 1 ), false );
	assert.equal( placedChildWidening( skeleton( specs ).nodes, wrapperFacts() ).has( 0 ), false );
} );
