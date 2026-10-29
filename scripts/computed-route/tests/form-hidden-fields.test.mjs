// B1 (register), Spec 48 FR-48-57: a form control the draft holds in an `sc-if` that is closed at rest (the cookie count and date
// of a bulk order, shown only while the topic is "bulk") is in the fact record but in no inventory row. The skeleton builds it a
// field node (lib/skeleton-hidden-fields.mjs) and Fill makes it a conditional field on the choice the `sc-if` reads
// (lib/fill-form.mjs::hiddenControlOf, lib/fill-form-conditions.mjs). Each test fails against the code before this change
// (neither field existed). The fixtures are the fact record's own shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { formWrites, hiddenControlOf } from '../lib/fill-form.mjs';
import { hiddenFieldNodes, hiddenControls, hiddenControlBlock } from '../lib/skeleton-hidden-fields.mjs';
import { skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';

const db = openDb();
const SCRIPT = `class Contact {
  renderVals() { const S = this.state; return {
    topics: [['order', 'My order'], ['gift', 'A gift'], ['bulk', 'Baby shower or event']].map(([id, name]) => ({ name, pick: () => this.setState({ topic: id }) })),
    showBulk: S.topic === 'bulk', notSent: !S.sent,
  }; }
}`;
const F = { tags: [ 'input', 'select', 'textarea' ], byTag: { select: 'sgs/form-field-select', textarea: 'sgs/form-field-textarea' }, byType: { text: 'sgs/form-field-text', date: 'sgs/form-field-date', hidden: 'sgs/form-field-hidden' }, notFields: [ 'submit', 'reset', 'image' ], fallback: 'sgs/form-field-text' };
const CHAIN = [ 'Contact/44', 'Contact/43' ];
const el = ( n, tag, over = {} ) => [ `Contact/${ n }`, { template: { key: `Contact/${ n }`, tag, realTag: tag, attrs: {}, words: '', parentChain: [], membership: { scIf: [], scFor: [] }, ...over } } ];
const open = [ { key: 'Contact/43', value: '{{ notSent }}' } ];
const closed = ( k, v ) => [ { key: `Contact/${ k }`, value: v }, ...open ];
const elements = Object.fromEntries( [
	el( 44, 'form', { membership: { scIf: open, scFor: [] }, parentChain: [ 'Contact/43' ] } ),
	el( 58, 'input', { attrs: { placeholder: 'MM-1042' }, parentChain: [ 'Contact/57', 'Contact/56', ...CHAIN ], membership: { scIf: closed( 56, '{{ showOrder }}' ), scFor: [] } } ),
	el( 61, 'label', { words: 'How many cookies, roughly?', parentChain: [ 'Contact/60', 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [] } } ),
	el( 62, 'input', { attrs: { inputmode: 'numeric' }, parentChain: [ 'Contact/61', 'Contact/60', 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [] } } ),
	el( 63, 'label', { words: 'Date needed', parentChain: [ 'Contact/60', 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [] } } ),
	el( 64, 'input', { attrs: { type: 'date' }, parentChain: [ 'Contact/63', 'Contact/60', 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [] } } ),
	el( 70, 'label', { words: 'Her name', parentChain: [ 'Contact/69', ...CHAIN ], membership: { scIf: closed( 69, '{{ isGift }}' ), scFor: [] } } ),
	el( 71, 'input', { parentChain: [ 'Contact/70', 'Contact/69', ...CHAIN ], membership: { scIf: closed( 69, '{{ isGift }}' ), scFor: [] } } ),
	el( 72, 'input', { attrs: { type: 'hidden' }, parentChain: [ 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [] } } ),
	el( 80, 'input', { parentChain: CHAIN, membership: { scIf: open, scFor: [] } } ),
	el( 81, 'input', { attrs: { placeholder: '{{ hint }}', type: 'email' }, parentChain: CHAIN, membership: { scIf: open, scFor: [] } } ),
	el( 73, 'input', { parentChain: [ 'Contact/59', ...CHAIN ], membership: { scIf: closed( 59, '{{ showBulk }}' ), scFor: [ { key: 'Contact/f73' } ] } } ),
] );
const factRecord = { elements };
const rendered = new Set( [ 'Contact/44', 'Contact/58' ] );
const choices = new Set( [ 'My order', 'A gift', 'Baby shower or event' ] );
const skeleton = () => [ { name: 'sgs/form', attributes: {}, draftRef: { tpl: 'Contact/44#0' }, innerBlocks: [
	{ name: 'sgs/form-field-tiles', attributes: { label: 'What is it about?' }, draftRef: { tpl: 'Contact/48#0' }, innerBlocks: [] },
	{ name: 'sgs/form-field-text', attributes: { label: 'Order number' }, draftRef: { tpl: 'Contact/58#0' }, innerBlocks: [] },
	{ name: 'sgs/form-field-textarea', attributes: { label: 'Message' }, draftRef: { tpl: 'Contact/66#0' }, innerBlocks: [] },
] } ];
const build = ( over = {} ) => {
	const sk = skeleton();
	const notes = [];
	hiddenFieldNodes( sk, { factRecord, formNodes: [ { node: sk[ 0 ], key: 'Contact/44' } ], rendered, choices, scriptOf: () => SCRIPT, rules: { formControl: F }, note: ( n, t ) => notes.push( t ), ...over } );
	return { sk, notes };
};
const built = ( r ) => r.sk[ 0 ].innerBlocks.filter( ( k ) => k.hiddenControl );

test( 'MUST FAIL: the controls of a closed choice condition become field nodes after the form field ahead of them, in template order', () => {
	const { sk, notes } = build();
	const kids = sk[ 0 ].innerBlocks;
	assert.deepEqual( kids.map( ( k ) => k.name ), [ 'sgs/form-field-tiles', 'sgs/form-field-text', 'sgs/form-field-text', 'sgs/form-field-date', 'sgs/form-field-textarea' ] );
	assert.deepEqual( kids[ 2 ], { name: 'sgs/form-field-text', attributes: { label: 'How many cookies, roughly?' }, innerBlocks: [], hiddenControl: 'Contact/62' } );
	assert.deepEqual( kids[ 3 ], { name: 'sgs/form-field-date', attributes: { label: 'Date needed' }, innerBlocks: [], hiddenControl: 'Contact/64' } );
	assert.equal( kids[ 2 ].draftRef, undefined, 'no draftRef: Fill reads nothing for the node and the form block field settings give its look' );
	assert.ok( notes.some( ( n ) => /Contact\/62/.test( n ) && /showBulk/.test( n ) && ! /notSent/.test( n ) ) );
	assert.deepEqual( skeletonProblems( sk ), [] );
	assert.equal( JSON.stringify( cleanTree( sk ) ).includes( 'hiddenControl' ), false, 'the key is a draft key, stripped from the tree Fill writes' );
} );

test( 'NEGATIVE: a toggle condition, a loop, a hidden input, a rendered control, an unread script and a missing rule build nothing', () => {
	const r = build();
	assert.equal( built( r ).length, 2, 'the isGift field would show for ever as a field, so it is left out' );
	assert.ok( r.notes.some( ( n ) => /not built/.test( n ) && /Contact\/71/.test( n ) ) );
	assert.deepEqual( hiddenControls( { elements, formKey: 'Contact/44', rendered, F } ).map( ( t ) => t.key ), [ 'Contact/62', 'Contact/64', 'Contact/71' ], 'the rendered order field, the hidden input, the loop item and a control with no condition of its own are not hidden controls' );
	assert.equal( hiddenControlBlock( elements[ 'Contact/72' ].template, F ), null );
	assert.equal( built( build( { choices: new Set( [ 'Unrelated' ] ) } ) ).length, 0, 'no button of the form is the choice the condition tests' );
	assert.equal( built( build( { scriptOf: () => null } ) ).length, 0, 'no script, no condition' );
	assert.equal( built( build( { rules: {} } ) ).length, 0 );
	// a draft whose logic holds a form schema builds its unrendered fields from the schema (lib/skeleton-form-steps.mjs)
	const schema = { ...factRecord, logic: { statics: { Contact: { entries: [ { name: 'STEPS', kind: 'array', value: [ { label: 'One', fields: [ { name: 'cookies', label: 'Cookies' } ] } ] } ] } } } };
	assert.equal( built( build( { factRecord: schema } ) ).length, 0, 'the schema builds them' );
	assert.equal( built( build( { rendered: new Set( [ 'Contact/44', 'Contact/58', 'Contact/62', 'Contact/64' ] ) } ) ).length, 0, 'controls the render shows are not rebuilt' );
} );

const node = ( name, attributes, ref ) => ( { name, attributes, innerBlocks: [], ref } );
const written = ( out, ref ) => Object.fromEntries( out.writes.filter( ( w ) => w.node === ref ).map( ( w ) => [ w.attr, w.after ] ) );
function fill( { control = 'Contact/62', facts = { elements }, script = SCRIPT } ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'hidden-' ) );
	fs.writeFileSync( path.join( dir, 'Contact.dc.html' ), script );
	const flat = [ node( 'sgs/form-field-tiles', { label: 'What is it about?' }, 'topic' ), node( 'sgs/form-field-text', { label: 'How many cookies, roughly?' }, 'cookies' ) ];
	const nodes = [ { index: 0, name: flat[ 0 ].name, node: {}, targets: [ { id: '0:', slot: '', finder: { tpl: 'Contact/48#0' } } ] }, { index: 1, name: flat[ 1 ].name, node: { hiddenControl: control }, targets: [] } ];
	const reads = { widths: { 1440: { '0:': { form: { tag: 'div', chips: [ { label: 'My order' }, { label: 'A gift' }, { label: 'Baby shower or event' } ] } } } } };
	return formWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, facts, db, component: 'Contact', draftFolder: dir } );
}

test( 'MUST FAIL: Fill makes the hidden field a conditional field on the bulk choice and writes its recorded settings; the choice field is named by the draft state key', () => {
	const out = fill( {} );
	assert.deepEqual( written( out, 'cookies' ), { inputmode: 'numeric', conditionalField: 'topic', conditionalValue: 'Baby shower or event' } );
	assert.equal( written( out, 'topic' ).fieldName, 'topic' );
	assert.deepEqual( hiddenControlOf( { elements }, 'Contact/64' ), { tag: 'input', type: 'date' } );
	assert.deepEqual( hiddenControlOf( { elements }, 'Contact/58' ), { tag: 'input', type: 'text', placeholder: 'MM-1042' } );
	assert.deepEqual( hiddenControlOf( { elements }, 'Contact/81' ), { tag: 'input', type: 'email' }, 'a bound attribute is not a fact' );
} );

test( 'NEGATIVE: a hiddenControl the record does not hold, or a condition the script cannot read, writes no condition', () => {
	assert.deepEqual( written( fill( { control: 'Contact/999' } ), 'cookies' ), {} );
	assert.equal( hiddenControlOf( { elements }, 'Contact/999' ), null );
	assert.equal( hiddenControlOf( null, 'Contact/62' ), null );
	assert.deepEqual( written( fill( { script: 'class X {}' } ), 'cookies' ), { inputmode: 'numeric' } );
	assert.equal( skeletonProblems( [ { name: 'sgs/form-field-text', attributes: {}, innerBlocks: [], hiddenControl: 'Contact/62', draftRef: 'input' } ] ).length, 1, 'a hidden control with a draftRef is refused' );
	assert.equal( skeletonProblems( [ { name: 'sgs/heading', attributes: {}, innerBlocks: [], hiddenControl: 'Contact/62' } ] ).length, 1, 'only a form field block takes one' );
} );
