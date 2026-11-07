// A hover setting is written only from a draft hover record that targets the element, and removed where the draft has none.
// Run: node --test tests/apply-stray-hover.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../lib/apply-family-state.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { strayHovers } from '../lib/apply-stray.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rec = ( id, tpl, props ) => ( { id, element: { dc: 'D', template_tpl_id: String( tpl ) }, trigger: { type: 'hover', detail: ':hover rule (style-hover)' }, properties: props } );
// A Why Choose card: the card (231) is the one element with a hover record; its heading (235) and text (236) have none.
const cardRec = rec( 'TR-052', 231, [ { property: 'color', from: 'rgb(255, 255, 255)', to: 'rgb(216, 202, 80)' } ] );
const card = { ref: 'cr-ref-home-18', tpl: 'Root/231#0', owns: [ 231 ], reach: [ 231, 235, 236 ] };
const heading = { ref: 'cr-ref-home-21', tpl: 'Root/235#0', owns: [ 235 ], reach: [ 235 ] };
const surface = { pairs: [ card, heading ] };
const index = recordIndex( [ cardRec ], 'D' );
const draft = { 1440: { styles: { color: 'rgb(255, 255, 255)' } } };
const run = ( target, saved, block = 'sgs/heading' ) => strayHovers( { target, block, saved, surface, recordsIndex: index, db, draft } );

test( 'a block whose draft element has no hover record loses every stored hover setting, whatever its ancestors do', () => {
	const [ item ] = run( heading, { textColourHover: '#D8CA50', linkColourHover: '', label: 'x' } );
	assert.deepEqual( item.writes, [ { attr: 'textColourHover', unset: true } ] );
	assert.equal( 'op', item.status );
} );

test( 'negative control: the card, whose draft element has a hover record, keeps its hover; a block with nothing stored writes nothing', () => {
	assert.deepEqual( run( card, { textColourHover: '#D8CA50' }, 'sgs/container' ), [] );
	assert.deepEqual( run( heading, { label: 'x' } ), [] );
	assert.deepEqual( strayHovers( { target: heading, block: 'sgs/heading', saved: { textColourHover: '#D8CA50' }, surface, recordsIndex: index, db, draft: { 1440: null } } ), [], 'an element the draft read never reached is left' );
});

test( 'the state family writes a hover look only for a property a record of the element names', () => {
	const read = ( hover ) => ( { 1440: { styles: { color: 'rgb(255, 255, 255)' }, hover } } );
	const ctx = ( records ) => ( { target: heading, surface, block: 'sgs/heading', saved: {}, draft: read( { color: 'rgb(216, 202, 80)' } ), live: read( { color: 'rgb(255, 255, 255)' } ), recordsIndex: recordIndex( records, 'D' ), db, rawSnapshot: null, snapshot: null, calFor: () => null } );
	const colour = ( items ) => items.filter( ( i ) => 'color' === i.prop && 'hover' === i.state );
	// The heading's only record moves it; the colour it reads on hover is inherited from the card.
	const moves = rec( 'TR-own', 235, [ { property: 'transform', from: null, to: 'translateY(-2px)' } ] );
	assert.deepEqual( colour( state.decide( ctx( [ cardRec, moves ] ) ) ).map( ( i ) => i.status ), [ 'equal' ] );
	// Negative control: a record of its own that names colour sends it through the resolver.
	const own = rec( 'TR-own', 235, [ { property: 'color', from: 'rgb(255, 255, 255)', to: 'rgb(216, 202, 80)' } ] );
	assert.ok( ! colour( state.decide( ctx( [ cardRec, own ] ) ) ).some( ( i ) => 'equal' === i.status && /not its own/.test( i.why ) ) );
} );
