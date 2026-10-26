// Fill writes each effect once per element: the motion schema's unique-effect limit refuses a second Marquee (or
// Ambient float, Cursor field, ...) on one element, so a second record reaching the same effect shares the first layer
// (same values) or is a named row (different values), never a second layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBehaviours } from '../lib/fill-behaviour.mjs';

function run( valuesB ) {
	const doc = { v: 1, elements: {} };
	const out = { writes: [], unmapped: [], notes: [], site: [] };
	const written = new Map();
	const behaviour = ( values ) => ( { kind: 'effect', effects: [ { effect: 'marquee', panel: 'effects', values } ] } );
	const items = [ { r: { id: 'A-1' }, b: behaviour( { speed: 40 } ) }, { r: { id: 'A-2' }, b: behaviour( valuesB ) } ];
	const finish = ( e, id ) => ( { target: 'root', list: 'effects', layer: { id, effect: e.effect, trigger: 'loop', values: e.values }, dropped: [] } );
	applyBehaviours( { items, n: { name: 'sgs/container', index: 0 }, target: 'root', doc, pending: [], written, controls: [], out, where: { node: 'n0', block: 'sgs/container', slot: '' }, flat: [ {} ], finish, mdb: { field: () => null }, hasAttr: () => false } );
	return { doc, out, written };
}

test( 'two records with the same effect and values: one layer, both records point at it', () => {
	const { doc, out, written } = run( { speed: 40 } );
	assert.equal( doc.elements.root.effects.length, 1 );
	assert.equal( written.get( 'A-2' ).layer, doc.elements.root.effects[ 0 ] );
	assert.ok( out.notes.some( ( n ) => /A-2: marquee is already on this element with the same values/.test( n.text ) ) );
	assert.equal( out.unmapped.length, 0 );
} );

test( 'two records with the same effect and different values: the first stands, the second is a named row', () => {
	const { doc, out } = run( { speed: 90 } );
	assert.equal( doc.elements.root.effects.length, 1 );
	assert.deepEqual( doc.elements.root.effects[ 0 ].values, { speed: 40 } );
	assert.ok( out.unmapped.some( ( u ) => 'A-2' === u.value && /values\.speed differ/.test( u.reason ) ) );
} );
