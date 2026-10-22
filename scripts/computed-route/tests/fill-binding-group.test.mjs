// FR-48-41 binding grouping (lib/fill-binding-group.mjs): elements that share one {{ }} style binding and were written the
// same value share one group; a different value under the same binding is split; an unbound or single element is no group.
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupBindings } from '../lib/fill-binding-group.mjs';

const tpl = ( n, copy = 0 ) => ( { tpl: `Root>Sec@1#0/${ n }#${ copy }` } );
// Three sections (roots 0, 2, 4), each with one child node; node i names draft element i by its tpl finder.
const node = ( index, parent, n ) => ( { index, parent, targets: [ { id: `${ index }:`, index, slot: '', finder: tpl( n ) } ] } );
const nodes = [ node( 0, null, 1 ), node( 1, 0, 2 ), node( 2, null, 3 ), node( 3, 2, 4 ), node( 4, null, 5 ), node( 5, 4, 6 ) ];
const row = ( n, expression, where = 'attr:style' ) => ( { id: `binding@Sec:${ n }/${ where }=${ expression }`, kind: 'binding', draftId: `Sec:${ n }`, component: 'Sec' } );
const write = ( index, after, extra = {} ) => ( { node: `n${ index }`, index, slot: '', prop: 'padding-top', attr: 'paddingTop', after, how: 'resolve', ...extra } );

test( 'a binding used by three sections becomes one group, not three copies', () => {
	const rows = [ row( 1, 'R.pad' ), row( 2, 'R.pad' ), row( 4, 'R.pad' ), row( 6, 'R.pad' ) ];
	const writes = [ write( 0, '80px' ), write( 1, '80px' ), write( 3, '80px' ), write( 5, '80px' ) ];
	const { groups, split } = groupBindings( { rows, nodes, writes } );
	assert.equal( groups.length, 1 );
	assert.deepEqual( [ groups[ 0 ].binding, groups[ 0 ].attr, groups[ 0 ].value, groups[ 0 ].members.length, groups[ 0 ].sections ], [ 'R.pad', 'paddingTop', '80px', 4, 3 ] );
	assert.deepEqual( split, [] );
	assert.deepEqual( writes.map( ( w ) => w.group ), Array( 4 ).fill( 'R.pad|paddingTop' ) );
} );

test( 'NEGATIVE: the same binding written different values is split, never grouped', () => {
	const rows = [ row( 2, 'item.pad' ), row( 4, 'item.pad' ) ];
	const writes = [ write( 1, '80px' ), write( 3, '40px' ) ];
	const { groups, split } = groupBindings( { rows, nodes, writes } );
	assert.deepEqual( groups, [] );
	assert.equal( split.length, 1 );
	assert.deepEqual( split[ 0 ].values.map( ( v ) => v.value ), [ '80px', '40px' ] );
	assert.equal( writes[ 0 ].group, undefined );
} );

test( 'NEGATIVE: one bound element, text bindings, a state write and an unbound twin make no group', () => {
	const writes = [ write( 1, '80px' ), write( 3, '80px', { state: 'hover' } ), write( 5, '80px' ) ];
	assert.deepEqual( groupBindings( { rows: [ row( 2, 'R.pad' ) ], nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { rows: [ row( 2, 'R.t', 'text' ), row( 6, 'R.t', 'text' ) ], nodes, writes } ).groups, [] );
	assert.deepEqual( groupBindings( { rows: [ row( 2, 'R.pad' ), row( 4, 'R.pad' ) ], nodes, writes } ).groups, [] );
} );
