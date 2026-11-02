// A wrapper widened to hold a placed block (lib/fill-width-gate.mjs::placedChildWidening) gives its original gate to every
// child that relied on it: a child inside the wrapper's own element, or with no element key, that has no gate of its own.
// Without it such a child shows at the widths the draft hides it. Run against the real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthGateWrites, placedChildWidening } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const gate = ( key, width, via ) => [ key, { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via } } ];
const el = ( key, scIf, chain = [] ) => [ key, { template: { tag: 'div', parentChain: chain, membership: { scIf: scIf.map( ( k ) => ( { key: k, value: '{{ x }}' } ) ) } }, logic: { holes: {} } } ];
const compact = { bp: 'c', is: true, when: { w: '<', n: 1024 } };
// The wrapper (56) under the compact-only sc-if (55); 57 inside it with no sc-if of its own; 45 elsewhere, under none.
const facts = () => ( { elements: Object.fromEntries( [ gate( 'Page/55', compact, 'isCompact' ), el( 'Page/56', [ 'Page/55' ], [ 'Page/55' ] ), el( 'Page/57', [], [ 'Page/55', 'Page/56' ] ), el( 'Page/45', [] ) ] ) } );
function run( specs, f = facts() ) {
	const flat = specs.map( ( s, i ) => ( { name: s.name, attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = specs.map( ( s, index ) => ( { index, name: s.name, parent: s.parent ?? null, node: { draftRef: null === s.n ? null : { tpl: `Page/${ s.n }#0` } }, children: [], targets: [] } ) );
	return { flat, nodes, gate: placedChildWidening( nodes, f ), ...widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts: f, db, scope: 'header', entries: [], date: '2026-10-23' } ) };
}
const SPECS = [ { name: 'sgs/container', n: 56 }, { name: 'sgs/nav-bar-menu', n: 45, parent: 0 }, { name: 'sgs/button', n: 57, parent: 0 }, { name: 'sgs/text', n: null, parent: 0 } ];

test( 'MUST FAIL: a wrapper widened to every width hands its gate to its own child and its keyless child, not to the placed block', () => {
	const r = run( SPECS );
	assert.deepEqual( r.flat[ 0 ].attributes, {}, 'the wrapper is shown wherever the placed navigation is' );
	assert.deepEqual( r.flat[ 1 ].attributes, {}, 'the placed navigation keeps no gate' );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnDesktop: true }, 'the wrapper\'s own button stays compact-only' );
	assert.deepEqual( r.flat[ 3 ].attributes, { sgsHideOnDesktop: true }, 'a child with no element key stays compact-only' );
	assert.match( r.gate.get( 2 ).via.join( ' ' ), /the gate of sgs\/container, which was widened to hold a placed block/ );
} );

test( 'MUST FAIL: a wrapper widened part-way hands its original range, not the widened one', () => {
	const f = facts();
	f.elements[ 'Page/45' ].template.membership.scIf = [ { key: 'Page/59', value: '{{ x }}' } ];
	f.elements[ 'Page/59' ] = gate( 'Page/59', { w: '>=', n: 1280 }, 'w >= 1280' )[ 1 ];
	const r = run( SPECS, f );
	assert.deepEqual( r.gate.get( 0 ).shown, [ [ 0, 1024 ], [ 1280, Infinity ] ] );
	assert.deepEqual( r.gate.get( 2 ).shown, [ [ 0, 1024 ] ] );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnDesktop: true } );
} );

test( 'a wrapper that is not widened leaves its children to its own gate, and a child with its own gate keeps it (negative control)', () => {
	const own = run( [ SPECS[ 0 ], SPECS[ 2 ], SPECS[ 3 ] ].map( ( s ) => ( { ...s, parent: s.parent ?? null } ) ).map( ( s, i ) => ( i ? { ...s, parent: 0 } : s ) ) );
	assert.deepEqual( own.flat[ 0 ].attributes, { sgsHideOnDesktop: true } );
	assert.deepEqual( [ own.gate.has( 1 ), own.gate.has( 2 ) ], [ false, false ], 'the parent\'s gate hides them' );
	const f = facts();
	f.elements[ 'Page/58' ] = gate( 'Page/58', { all: [ { w: '>=', n: 768 }, { w: '<', n: 1024 } ] }, 'tablet' )[ 1 ];
	f.elements[ 'Page/57' ].template.membership.scIf = [ { key: 'Page/55', value: '{{ x }}' }, { key: 'Page/58', value: '{{ x }}' } ];
	assert.deepEqual( run( SPECS, f ).flat[ 2 ].attributes, { sgsHideOnMobile: true, sgsHideOnDesktop: true }, 'its own tablet-only gate' );
} );

test( 'MUST FAIL: a child with its own gate, itself widened to every width by a block placed in it, is never handed the wrapper\'s gate', () => {
	const f = facts();
	f.elements[ 'Page/57' ].template.membership.scIf = [ { key: 'Page/55', value: '{{ x }}' } ];
	f.elements[ 'Page/46' ] = el( 'Page/46', [] )[ 1 ];
	const r = run( [ SPECS[ 0 ], SPECS[ 1 ], { name: 'sgs/container', n: 57, parent: 0 }, { name: 'sgs/button', n: 46, parent: 2 } ], f );
	assert.equal( r.gate.has( 2 ), false, 'the inner wrapper is shown wherever its placed button is' );
	assert.deepEqual( r.flat[ 2 ].attributes, {} );
	assert.deepEqual( r.flat[ 3 ].attributes, {} );
} );
