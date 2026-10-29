// B1 (c), Spec 48 FR-48-57: a field the draft shows only while a choice has a value (`<sc-if value="{{ showOrder }}">`,
// `showOrder: S.topic === 'order'`, the choice a group of pills setting `topic`) is a conditional field of the form blocks:
// it waits on the choice field (named by the draft's state key) for the choice's label (lib/fill-form-conditions.mjs).
// Each test fails against the code before this change (the field was written with no condition, so it always showed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { formWrites } from '../lib/fill-form.mjs';
import { showTests, choiceLabels, stateCondition } from '../lib/fill-form-conditions.mjs';

const db = openDb();
const SCRIPT = `class Contact {
  renderVals() { const S = this.state; return {
    topics: [['order', 'My order'], ['gift', 'A gift'], ['bulk', 'Baby shower or event']].map(([id, name]) => ({ name, ...pill(S.topic === id), pick: () => this.setState({ topic: id }) })),
    showOrder: S.topic === 'order', showBulk: S.topic === 'bulk', hideGift: S.topic !== 'gift',
    sent: S.sent, notSent: !S.sent,
  }; }
}`;

test( 'MUST FAIL: the state tests, the choice labels and the condition an sc-if puts on a control are read from the script', () => {
	assert.deepEqual( showTests( SCRIPT ), { showOrder: { key: 'topic', op: 'equals', value: 'order' }, showBulk: { key: 'topic', op: 'equals', value: 'bulk' }, hideGift: { key: 'topic', op: 'not_equals', value: 'gift' } } );
	assert.deepEqual( choiceLabels( SCRIPT, 'topic' ), { order: 'My order', gift: 'A gift', bulk: 'Baby shower or event' } );
	assert.equal( showTests( `${ SCRIPT }
const later = { showOrder: S.size === 'big' };` ).showOrder.key, 'topic', 'the first test of a property is the one the template reads' );
	assert.deepEqual( choiceLabels( SCRIPT.replace( 'setState({ topic: id })', 'setState({ other: id })' ), 'topic' ), {}, "a pair list whose choices set another key is not this key's" );
	assert.deepEqual( stateCondition( [ { value: '{{ showBulk }}' }, { value: '{{ notSent }}' } ], SCRIPT ), { key: 'topic', op: 'equals', value: 'bulk', label: 'Baby shower or event' } );
	assert.deepEqual( stateCondition( [ { value: '{{ hideGift }}' } ], SCRIPT ), { key: 'topic', op: 'not_equals', value: 'gift', label: 'A gift' } );
} );

test( 'NEGATIVE: a plain sc-if, a test on a key no choice sets, an unknown choice and a missing script give no condition', () => {
	assert.equal( stateCondition( [ { value: '{{ notSent }}' } ], SCRIPT ), null );
	assert.equal( stateCondition( [ { value: '{{ showOrder }}' } ], 'showOrder: S.size === 8' ), null );
	assert.equal( stateCondition( [ { value: '{{ showOrder }}' } ], SCRIPT.replace( '\'order\', \'My order\'', '\'other\', \'Other\'' ) ), null );
	assert.equal( stateCondition( [ { value: '{{ showOrder }}' } ], null ), null );
	assert.deepEqual( choiceLabels( SCRIPT, 'nope' ), {} );
	assert.deepEqual( choiceLabels( SCRIPT, 'bad key' ), {} );
} );

const node = ( name, attributes, ref ) => ( { name, attributes, innerBlocks: [], ref } );
const written = ( out, ref ) => Object.fromEntries( out.writes.filter( ( w ) => w.node === ref ).map( ( w ) => [ w.attr, w.after ] ) );
function run( { membership, script = SCRIPT, chips } ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cond-' ) );
	fs.writeFileSync( path.join( dir, 'Contact.dc.html' ), script );
	const flat = [ node( 'sgs/form-field-tiles', { label: 'What’s it about?' }, 'topic' ), node( 'sgs/form-field-text', { label: 'Order number' }, 'order' ) ];
	const nodes = [ { index: 0, name: flat[ 0 ].name, targets: [ { id: '0:', slot: '', finder: { tpl: 'Root>Contact@1#0/48#0' } } ] }, { index: 1, name: flat[ 1 ].name, targets: [ { id: '1:', slot: '', finder: { tpl: 'Root>Contact@1#0/58#0' } } ] } ];
	const reads = { widths: { 1440: { '0:': { form: { tag: 'div', chips } }, '1:': { form: { tag: 'input', type: 'text' } } } } };
	const facts = { elements: { 'Contact/58': { template: { key: 'Contact/58', membership: { scIf: membership, scFor: [] } } } } };
	return formWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, facts, db, component: 'Contact', draftFolder: dir } );
}
const CHIPS = [ { label: 'My order' }, { label: 'A gift' }, { label: 'Baby shower or event' } ];

test( 'MUST FAIL: the order-number field waits on the choice field for "My order"; the choice field is named by the draft\'s state key', () => {
	const out = run( { membership: [ { value: '{{ showOrder }}' }, { value: '{{ notSent }}' } ], chips: CHIPS } );
	assert.deepEqual( written( out, 'order' ), { conditionalField: 'topic', conditionalValue: 'My order' }, 'the operator is the block default, so it is not written' );
	assert.equal( written( out, 'topic' ).fieldName, 'topic' );
} );

test( 'MUST FAIL: a not-equal test writes the not_equals operator', () => {
	const out = run( { membership: [ { value: '{{ hideGift }}' } ], chips: CHIPS } );
	assert.deepEqual( written( out, 'order' ), { conditionalField: 'topic', conditionalOperator: 'not_equals', conditionalValue: 'A gift' } );
} );

test( 'NEGATIVE: a field in a plain sc-if, or whose choice is on no choice field of the form, keeps no condition and names nothing', () => {
	const plain = run( { membership: [ { value: '{{ notSent }}' } ], chips: CHIPS } );
	assert.deepEqual( written( plain, 'order' ), {} );
	assert.equal( written( plain, 'topic' ).fieldName, undefined );
	const none = run( { membership: [ { value: '{{ showOrder }}' } ], chips: [ { label: 'Unrelated' }, { label: 'Other' } ] } );
	assert.deepEqual( written( none, 'order' ), {} );
	assert.equal( written( none, 'topic' ).fieldName, undefined );
} );
