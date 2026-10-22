// FR-48-41 binding grouping (lib/fill-binding-group.mjs): elements that share one {{ }} style binding and were written the
// same value share one group; a different value under the same binding is split; an unbound or single element is no group.
// The bindings are read from the fact record's holes (elements[<component>/<n>].template.holes), never from census rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupBindings } from '../lib/fill-binding-group.mjs';

const tpl = ( n, copy = 0 ) => ( { tpl: `Root>Sec@1#0/${ n }#${ copy }` } );
// Three sections (roots 0, 2, 4), each with one child node; node i names draft element i by its tpl finder.
const node = ( index, parent, n ) => ( { index, parent, targets: [ { id: `${ index }:`, index, slot: '', finder: tpl( n ) } ] } );
const nodes = [ node( 0, null, 1 ), node( 1, 0, 2 ), node( 2, null, 3 ), node( 3, 2, 4 ), node( 4, null, 5 ), node( 5, 4, 6 ) ];
// A record element holding one hole: `where` is `style:<property>` for the style attribute, `text` for a text hole.
const hole = ( expr, where = 'style:padding' ) => ( { id: `${ where }#0`, where, expr, path: expr, whole: false } );
const facts = ( ...bound ) => ( { elements: Object.fromEntries( bound.map( ( [ n, h ] ) => [ `Sec/${ n }`, { template: { holes: [ h ] } } ] ) ) } );
const write = ( index, after, extra = {} ) => ( { node: `n${ index }`, index, slot: '', prop: 'padding-top', attr: 'paddingTop', after, how: 'resolve', ...extra } );

test( 'a binding used by three sections becomes one group, not three copies', () => {
	const f = facts( [ 1, hole( 'R.pad' ) ], [ 2, hole( 'R.pad' ) ], [ 4, hole( 'R.pad' ) ], [ 6, hole( 'R.pad' ) ] );
	const writes = [ write( 0, '80px' ), write( 1, '80px' ), write( 3, '80px' ), write( 5, '80px' ) ];
	const { groups, split } = groupBindings( { facts: f, nodes, writes } );
	assert.equal( groups.length, 1 );
	assert.deepEqual( [ groups[ 0 ].binding, groups[ 0 ].attr, groups[ 0 ].value, groups[ 0 ].members.length, groups[ 0 ].sections ], [ 'R.pad', 'paddingTop', '80px', 4, 3 ] );
	assert.deepEqual( split, [] );
	assert.deepEqual( writes.map( ( w ) => w.group ), Array( 4 ).fill( 'R.pad|paddingTop' ) );
} );

test( 'NEGATIVE: the same binding written different values is split, never grouped', () => {
	const f = facts( [ 2, hole( 'item.pad' ) ], [ 4, hole( 'item.pad' ) ] );
	const writes = [ write( 1, '80px' ), write( 3, '40px' ) ];
	const { groups, split } = groupBindings( { facts: f, nodes, writes } );
	assert.deepEqual( groups, [] );
	assert.equal( split.length, 1 );
	assert.deepEqual( split[ 0 ].values.map( ( v ) => v.value ), [ '80px', '40px' ] );
	assert.equal( writes[ 0 ].group, undefined );
} );

test( 'NEGATIVE: one bound element, text bindings, a hover hole, a state write and an unbound twin make no group', () => {
	const writes = [ write( 1, '80px' ), write( 3, '80px', { state: 'hover' } ), write( 5, '80px' ) ];
	assert.deepEqual( groupBindings( { facts: facts( [ 2, hole( 'R.pad' ) ] ), nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { facts: facts( [ 2, hole( 'R.t', 'text' ) ], [ 6, hole( 'R.t', 'text' ) ] ), nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { facts: facts( [ 2, hole( 'R.c', 'style-hover:color' ) ], [ 6, hole( 'R.c', 'style-hover:color' ) ] ), nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { facts: facts( [ 2, hole( 'R.pad' ) ], [ 4, hole( 'R.pad' ) ] ), nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { facts: null, nodes, writes } ), { groups: [], split: [] } );
} );

test( 'MUST FAIL (FR-48-41): bindings are read from the record holes: a binding only in a census row is not grouped, one only in the record is', () => {
	const writes = () => [ write( 1, '80px' ), write( 3, '80px' ) ];
	// A census-shaped row carries the binding but the record does not: no group.
	const census = [ 2, 4 ].map( ( n ) => ( { id: `binding@Sec:${ n }/attr:style=R.pad`, kind: 'binding', draftId: `Sec:${ n }`, component: 'Sec' } ) );
	assert.deepEqual( groupBindings( { facts: { elements: {} }, rows: census, nodes, writes: writes() } ).groups, [] );
	// The record carries the binding and no census row exists: one group.
	const { groups } = groupBindings( { facts: facts( [ 2, hole( 'R.pad' ) ], [ 4, hole( 'R.pad' ) ] ), nodes, writes: writes() } );
	assert.equal( groups.length, 1 );
	assert.equal( groups[ 0 ].members.length, 2 );
} );
