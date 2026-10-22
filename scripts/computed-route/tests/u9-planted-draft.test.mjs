// U9's planted-draft proof (Spec 48 FR-48-57, FR-48-48; Spec 04 FR-4-3 to FR-4-11): a planted draft form read by the real page
// read (lib/fill-read.mjs::readDraft) and a planted fact record are written by the form writer (lib/fill-form.mjs::formWrites)
// onto the field, step, review and form blocks, each setting a block really holds (framework DB). Every closed coverage ID
// is covered with its write, check and this test named, and is a gap again with its write reference removed.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf, walk } from '../lib/tree.mjs';
import { formWrites, formReadback, formSources, COVERAGE_WRITES } from '../lib/fill-form.mjs';
import { formSchemaOf, conditionsFromSource, linkParams } from '../lib/fill-form-schema.mjs';
import { loadCoverage, statusOf } from '../lib/clone-coverage.mjs';
import { openDb } from '../lib/db.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0; font: 16px sans-serif } form { width: 600px; padding: 8px } label { display: block } input, select, textarea { display: block; height: 40px; width: 300px; box-sizing: border-box }
.chips button { display: inline-flex; flex-direction: column } .box { position: relative } .box label.in { position: absolute; left: 4px; top: 4px; margin: 0; height: 16px }
</style></head><body><form>
<label for="ta-tradingName">Trading name</label><input id="ta-tradingName" type="text" autocomplete="organization" inputmode="text" placeholder="e.g. Spice Garden" maxlength="60">
<label for="ta-email">Email</label><input id="ta-email" type="email" autocomplete="email" placeholder="you@example.test">
<label for="ta-phone">Phone</label><input id="ta-phone" type="tel" autocomplete="tel" inputmode="tel">
<div class="box"><label class="in" for="ta-floaty">Floating</label><input id="ta-floaty" type="text" autocomplete="off"></div>
<label for="ta-notes">Notes</label><div><textarea id="ta-notes" rows="3" placeholder="Parking, loading bay" maxlength="800" style="height:80px"></textarea><span>0 / 800</span></div>
<label for="ta-companyNo">Companies House number</label><input id="ta-companyNo" type="text">
<label for="ta-delAddr">Delivery address</label><input id="ta-delAddr" type="text">
<label for="ta-team">Team</label><select id="ta-team" name="team"><option value="">Please select</option><option value="Sales">Sales</option><option value="Driver" selected>Driver</option></select>
<div class="chips" id="chips"><button type="button" aria-pressed="false"><span>Phone</span><span>Quick call</span></button><button type="button" aria-pressed="true"><span>Email</span><span>Written reply</span></button><button type="button" aria-pressed="false"><span>WhatsApp</span><span>Message</span></button></div>
<button type="button" role="checkbox" aria-checked="true" id="ta-agree">I agree</button>
<button type="button" role="checkbox" aria-checked="false" id="ta-sameDelivery">Deliver to this address</button>
<label for="ta-freq">How often</label><select id="ta-freq" autocomplete="off"><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select>
<div><input id="ta-bio" type="text"><span>0 / 300</span></div>
<input id="ta-docs" type="file" accept=".pdf,.jpg,.png">
<button type="submit" id="go">Send</button>
</form></body></html>`;

const FIELD = ( id ) => `#${ id }`;
const TREE = [ { name: 'sgs/form', attributes: {}, innerBlocks: [
	{ name: 'sgs/form-step', attributes: {}, innerBlocks: [
		{ name: 'sgs/form-field-text', draftRef: FIELD( 'ta-tradingName' ), attributes: {} },
		{ name: 'sgs/form-field-email', draftRef: FIELD( 'ta-email' ), attributes: {} },
		{ name: 'sgs/form-field-phone', draftRef: FIELD( 'ta-phone' ), attributes: {} },
		{ name: 'sgs/form-field-text', draftRef: FIELD( 'ta-floaty' ), attributes: {} },
		{ name: 'sgs/form-field-textarea', draftRef: FIELD( 'ta-notes' ), attributes: {} },
		{ name: 'sgs/form-field-text', draftRef: FIELD( 'ta-companyNo' ), attributes: {} },
		{ name: 'sgs/form-field-text', draftRef: FIELD( 'ta-delAddr' ), attributes: {} },
	] },
	{ name: 'sgs/form-step', attributes: {}, innerBlocks: [
		{ name: 'sgs/form-field-select', draftRef: FIELD( 'ta-team' ), attributes: {} },
		{ name: 'sgs/form-field-tiles', draftRef: '#chips', attributes: {} },
		{ name: 'sgs/form-field-consent', draftRef: FIELD( 'ta-agree' ), attributes: {} },
		{ name: 'sgs/form-field-consent', draftRef: FIELD( 'ta-sameDelivery' ), attributes: {} },
		{ name: 'sgs/form-field-select', draftRef: FIELD( 'ta-freq' ), attributes: {} },
		{ name: 'sgs/form-field-text', draftRef: FIELD( 'ta-bio' ), attributes: {} },
		{ name: 'sgs/form-field-file', draftRef: FIELD( 'ta-docs' ), attributes: {} },
		{ name: 'sgs/button', draftRef: '#go', attributes: {} },
	] },
	{ name: 'sgs/form-review', attributes: {}, innerBlocks: [] },
] } ];

// The planted fact record: the draft's logic holds a schema (steps, fields, a review step), a link elsewhere hands a page
// `?team=Sales&role=Driver`, and a button inside a loop is the review's Edit.
const SCHEMA = [
	{ key: 'a', label: 'Business', title: 'About you', intro: 'The basics.', fields: [
		{ name: 'tradingName', label: 'Trading name', req: true, ph: 'e.g. Spice Garden', ac: 'organization' },
		{ name: 'email', label: 'Email', type: 'email', req: true, rxMsg: 'Enter a valid email address' },
		{ name: 'companyNo', label: 'Companies House number', show: false },
		{ name: 'delAddr', label: 'Delivery address', show: false },
	] },
	{ key: 'b', label: 'Ordering', title: 'How', intro: 'Ordering.', fields: [
		{ name: 'contactPref', label: 'Best way to reach you', type: 'chips', multi: true, options: [ 'Phone', 'Email', 'WhatsApp' ] },
		{ name: 'sameDelivery', type: 'check', text: 'Deliver to this address', dflt: true },
	] },
	{ key: 'review', label: 'Review', title: 'Check and submit', intro: 'Make sure everything looks right. You can edit any section before submitting.', fields: [] },
];
const FACTS = { logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 3, value: SCHEMA } ] } } }, elements: {
	'Page/9': { template: { key: 'Page/9', tag: 'a', attrs: { href: '#apply?team=Sales&role=Driver' }, membership: { scIf: [], scFor: [] }, words: 'Apply for this role' } },
	'Apply/73': { template: { key: 'Apply/73', tag: 'button', attrs: { type: 'button' }, membership: { scIf: [], scFor: [ { key: 'Apply/69' } ] }, words: 'Edit section' } },
} };
const SOURCE = `get schema() {
	const ltd = v.structure === 'Limited company';
	const either = ['Credit account', 'Direct debit'].includes(v.payment);
	return [
		{ name: 'companyNo', label: 'Companies House number', show: ltd, ph: '8 digits' },
		{ name: 'delAddr', label: 'Delivery address', show: either },
	];
}`;
const FLAGS = [ { kind: 'prototype-only', draftId: 'Apply.dc.html:js:176:28', text: 'localStorage.setItem(this.KEY, JSON.stringify({ v, step }))', why: 'browser storage write' } ];

const db = openDb();
let served;
let reads;
let tree;
let nodes;
let flat;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'u9-planted-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	fs.writeFileSync( path.join( dir, 'Apply.dc.html' ), SOURCE );
	served = await serveDraft( dir );
	nodes = skeletonNodes( TREE );
	tree = cleanTree( TREE );
	addRefs( tree, 'planted' );
	flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	reads = await readDraft( { url: served.url, nodes, headless: true, sweep: false } );
	served.dir = dir;
} );
after( () => served?.close() );

const run = ( over = {} ) => {
	const t = JSON.parse( JSON.stringify( tree ) );
	const f = [];
	walk( t, ( n, i ) => {
		f[ i ] = n;
	} );
	const out = formWrites( { nodes, flat: f, refOf, reads, facts: FACTS, flags: FLAGS, db, sources: formSources( served.dir, FACTS ), ...over } );
	return { out, attrs: ( block, nth = 0 ) => f.filter( ( n ) => n.name === block )[ nth ].attributes || {} };
};

test( 'the planted draft is read as form controls (so the tests below are not vacuous)', () => {
	const form = ( i ) => reads.widths[ 1440 ][ nodes[ i ].targets[ 0 ].id ]?.form;
	assert.equal( form( 2 ).autocomplete, 'organization' );
	assert.equal( form( 6 ).tag, 'textarea' );
	assert.equal( form( 6 ).counterMax, 800 );
	assert.equal( form( 11 ).chips.length, 3 );
} );

test( 'MUST FAIL WITHOUT THE WRITER: placeholder, autocomplete, inputmode, maxLength, rows and the counter are written from the control', () => {
	const { attrs } = run();
	const text = attrs( 'sgs/form-field-text' );
	assert.equal( text.placeholder, 'e.g. Spice Garden' );
	assert.equal( text.autocomplete, 'organization' );
	assert.equal( text.maxLength, 60 );
	assert.equal( attrs( 'sgs/form-field-text', 4 ).maxLength, 300, 'a cap shown only by the n / max counter' );
	assert.ok( run().out.unmapped.some( ( u ) => 'sgs/form-field-text' === u.block && 'counter' === u.property ), 'a text field has no counter: a named gap' );
	assert.equal( attrs( 'sgs/form-field-email' ).autocomplete, 'email' );
	assert.equal( attrs( 'sgs/form-field-phone' ).inputmode, 'tel' );
	const area = attrs( 'sgs/form-field-textarea' );
	assert.equal( area.maxLength, 800 );
	assert.equal( area.rows, 3 );
	assert.equal( area.placeholder, 'Parking, loading bay' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a select\'s options, blank option as placeholder, and its default are written; an option the browser picked first is no default', () => {
	const { attrs, out } = run();
	const sel = attrs( 'sgs/form-field-select' );
	assert.deepEqual( sel.options, [ { value: 'Sales', label: 'Sales' }, { value: 'Driver', label: 'Driver' } ] );
	assert.equal( sel.placeholder, 'Please select' );
	assert.equal( sel.defaultValue, 'Driver' );
	assert.equal( attrs( 'sgs/form-field-select', 1 ).defaultValue, undefined, 'an option the browser picked first is not the draft default' );
	assert.ok( ! out.unmapped.some( ( u ) => 'value' === u.property ) );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a role=checkbox button\'s aria-checked is the consent field\'s ticked start', () => {
	const { attrs } = run();
	assert.equal( attrs( 'sgs/form-field-consent', 0 ).defaultChecked, true, 'the button the draft draws ticked' );
	assert.equal( attrs( 'sgs/form-field-consent', 1 ).defaultChecked, true, 'the field the schema starts ticked' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a file input\'s accept is the file field\'s allowedTypes', () => {
	assert.deepEqual( run().attrs( 'sgs/form-field-file' ).allowedTypes, [ '.pdf', '.jpg', '.png' ] );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a group of chips is the tiles field: label, value and description line, and multiSelect from the schema', () => {
	const tiles = run().attrs( 'sgs/form-field-tiles' );
	assert.deepEqual( tiles.tiles, [ { label: 'Phone', value: 'Phone', description: 'Quick call' }, { label: 'Email', value: 'Email', description: 'Written reply' }, { label: 'WhatsApp', value: 'WhatsApp', description: 'Message' } ] );
	assert.equal( tiles.multiSelect, true );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a label above the box is a static label; a label inside the box is the inside position', () => {
	const { attrs } = run();
	assert.equal( attrs( 'sgs/form-field-text' ).floatingLabel, false );
	assert.equal( attrs( 'sgs/form-field-text', 1 ).floatingLabelPosition, 'inside' );
	assert.equal( attrs( 'sgs/form-field-text', 1 ).floatingLabel, undefined );
} );

test( 'MUST FAIL WITHOUT THE WRITER: the schema\'s validation copy is the field\'s msgInvalid', () => {
	assert.equal( run().attrs( 'sgs/form-field-email' ).msgInvalid, 'Enter a valid email address' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a select whose name a link carries as a query parameter takes its value from that parameter', () => {
	assert.deepEqual( [ ...linkParams( FACTS ) ], [ 'team', 'role' ] );
	assert.equal( run().attrs( 'sgs/form-field-select' ).valueFromParam, 'team' );
	assert.equal( run().attrs( 'sgs/form-field-text' ).valueFromParam, undefined, 'a field no link names takes none' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a conditional field is written with its field, operator and value; an either-or test is a named gap, never a guess', () => {
	const c = conditionsFromSource( SOURCE );
	assert.deepEqual( c.companyNo, { field: 'structure', op: 'equals', value: 'Limited company' } );
	assert.match( c.delAddr.reason, /any of Credit account, Direct debit/ );
	const { attrs, out } = run();
	const a = attrs( 'sgs/form-field-text', 2 );
	assert.equal( a.conditionalField, 'structure' );
	assert.equal( a.conditionalValue, 'Limited company' );
	const b = attrs( 'sgs/form-field-text', 3 );
	assert.equal( b.conditionalField, undefined );
	assert.ok( out.out?.unmapped || out.unmapped.some( ( u ) => 'conditional field' === u.property && /Credit account/.test( u.reason ) ) );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a draft that keeps answers in the browser sets the form\'s savedProgress; the steps and the review take the schema\'s words', () => {
	const { attrs } = run();
	assert.equal( attrs( 'sgs/form' ).savedProgress, true );
	assert.equal( attrs( 'sgs/form-step', 0 ).label, 'Business' );
	assert.equal( attrs( 'sgs/form-step', 1 ).label, 'Ordering' );
	const review = attrs( 'sgs/form-review' );
	assert.equal( review.intro, 'Make sure everything looks right. You can edit any section before submitting.' );
	assert.equal( review.editLabel, 'Edit section' );
	assert.equal( run( { flags: [] } ).attrs( 'sgs/form' ).savedProgress, undefined, 'no storage write, no saved progress' );
} );

test( 'MUST FAIL WITHOUT THE WRITER: a submit button is isSubmit', () => {
	assert.equal( run().attrs( 'sgs/button' ).isSubmit, true );
} );

test( 'a setting the block does not hold is a named UNMAPPED row, and nothing is written for it', () => {
	const { out } = run();
	const row = out.unmapped.find( ( u ) => 'sgs/form-field-select' === u.block && 'autocomplete' === u.property );
	assert.ok( row, 'the select field holds no autocomplete' );
	assert.match( row.reason, /holds no setting/ );
	assert.ok( ! out.writes.some( ( w ) => 'autocomplete' === w.attr && /select/.test( w.block ) ) );
} );

test( 'the written settings read back against the draft', () => {
	const el = reads.widths[ 1440 ][ nodes[ 2 ].targets[ 0 ].id ].form;
	assert.deepEqual( formReadback( { writes: run().out.writes.filter( ( w ) => w.index === 2 ).map( ( w ) => ( { attr: w.attr, value: w.after } ) ), el } ), [] );
	assert.ok( formReadback( { writes: [ { attr: 'autocomplete', value: 'wrong' } ], el } ).length );
} );

test( 'the schema is found in the fact record only where steps hold named fields', () => {
	assert.equal( formSchemaOf( FACTS ).component, 'Apply' );
	assert.equal( formSchemaOf( { logic: { statics: { X: { entries: [ { kind: 'array', value: [ { label: 'a' } ] } ] } } } } ), null );
} );

test( 'MUST FAIL WITHOUT THE WRITE REF: every closed coverage ID names its recogniser, write, check and this test, and is a gap again with the write reference removed', () => {
	const coverage = loadCoverage();
	assert.ok( COVERAGE_WRITES.length >= 26 );
	for ( const id of COVERAGE_WRITES ) {
		const e = coverage.entries[ id ];
		assert.ok( e?.recognise && e.write && e.check && e.test, `${ id } names recognise, write, check and its test` );
		assert.match( e.write, /lib\/fill-form\.mjs#form/ );
		assert.equal( e.test, 'scripts/computed-route/tests/u9-planted-draft.test.mjs' );
		assert.equal( statusOf( e ), 'covered', `${ id } is covered` );
		assert.equal( statusOf( { ...e, write: null, wave: 'shop, forms and data' } ), 'gap', `${ id } is a gap with its write reference removed` );
	}
} );
