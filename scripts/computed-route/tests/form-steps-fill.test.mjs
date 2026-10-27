// The two halves of a multi-step form around the skeleton (Spec 48 FR-48-57): Fill writes a field node the skeleton built from
// the schema (no draft control: lib/fill-form.mjs::formWrites, schemaControl; lib/fill-form-schema.mjs::schemaFieldByName),
// and the proposal's rows follow the nodes the form draws itself (lib/skeleton-form-steps.mjs::formStepContext). The settings
// are checked against the framework DB's real field blocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { formWrites, schemaControl } from '../lib/fill-form.mjs';
import { schemaFieldByName } from '../lib/fill-form-schema.mjs';
import { formStepContext } from '../lib/skeleton-form-steps.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const SCHEMA = [
	{ key: 'a', label: 'Business', fields: [ { name: 'structure', label: 'Structure', type: 'select', options: [ 'Sole trader', 'LLP' ] }, { name: 'companyNo', label: 'Company number', show: false, ph: '8 digits', rxMsg: 'Company numbers are 8 characters' } ] },
	{ key: 'b', label: 'Ordering', fields: [ { name: 'when', label: 'When', type: 'select', options: [ 'Weekly', 'Monthly' ] }, { name: 'cats', label: 'Ranges', type: 'chips', multi: true, options: [ 'Rice', 'Flour' ] }, { name: 'city', label: 'Town', ac: 'address-level2' }, { name: 'same', type: 'check', text: 'Deliver here', dflt: true } ] },
	{ key: 'review', label: 'Review', fields: [] },
];
const FACTS = { logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 3, value: SCHEMA } ] } } }, elements: {} };
const SOURCE = 'class C { get schema() { const v = this.state.v; const ltd = v.structure === \'LLP\'; return [ { fields: [ { name: \'companyNo\', show: ltd } ] } ]; } }';
const node = ( name, attributes, ref ) => ( { name, attributes, innerBlocks: [], ref } );
const run = ( flat, reads = { widths: { 1440: {} } } ) => formWrites( { nodes: flat.map( ( n, i ) => ( { index: i, name: n.name, targets: n.target ? [ { id: n.target, slot: '' } ] : [] } ) ), flat, refOf: ( n ) => n.ref, reads, facts: FACTS, db, sources: { Apply: SOURCE }, component: 'Apply' } );
const written = ( out, ref ) => Object.fromEntries( out.writes.filter( ( w ) => w.node === ref ).map( ( w ) => [ w.attr, w.after ] ) );

test( 'MUST FAIL: a field node built from the schema gets the schema field\'s settings by its fieldName', () => {
	const flat = [
		node( 'sgs/form-field-select', { label: 'When', fieldName: 'when' }, 'when' ),
		node( 'sgs/form-field-tiles', { label: 'Ranges', fieldName: 'cats' }, 'cats' ),
		node( 'sgs/form-field-text', { label: 'Town', fieldName: 'city' }, 'city' ),
		node( 'sgs/form-field-text', { label: 'Company number', fieldName: 'companyNo' }, 'co' ),
		node( 'sgs/form-field-checkbox', { fieldName: 'same', options: [ { value: 'Deliver here', label: 'Deliver here' } ] }, 'same' ),
	];
	const out = run( flat );
	assert.deepEqual( written( out, 'when' ), { options: [ { value: 'Weekly', label: 'Weekly' }, { value: 'Monthly', label: 'Monthly' } ] } );
	assert.deepEqual( written( out, 'cats' ), { tiles: [ { label: 'Rice', value: 'Rice' }, { label: 'Flour', value: 'Flour' } ], multiSelect: true } );
	assert.deepEqual( written( out, 'city' ), { autocomplete: 'address-level2' } );
	assert.deepEqual( written( out, 'co' ), { placeholder: '8 digits', msgInvalid: 'Company numbers are 8 characters', conditionalField: 'structure', conditionalValue: 'LLP' }, 'the operator is the block default, so it is not written' );
	assert.deepEqual( written( out, 'same' ), {}, 'its option is the skeleton\'s, and a ticked start it cannot hold is a named row' );
	assert.ok( out.unmapped.some( ( u ) => 'same' === u.node && /holds no setting for a ticked start/.test( u.reason ) ), JSON.stringify( out.unmapped ) );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'form read-back' === u.property ), [], 'every write reads back against the schema' );
} );

test( 'NEGATIVE: a built node naming no schema field, a node with no fieldName and a rendered field keep their own path', () => {
	const flat = [
		node( 'sgs/form-field-select', { label: 'When', fieldName: 'nope' }, 'nope' ),
		node( 'sgs/form-field-select', { label: 'When' }, 'bare' ),
		{ ...node( 'sgs/form-field-select', { label: 'When', fieldName: 'when' }, 'drawn' ), target: '2:' },
	];
	const out = run( flat, { widths: { 1440: { '2:': { form: { tag: 'select', options: [ { value: 'Daily', label: 'Daily' } ] } } } } } );
	assert.deepEqual( written( out, 'nope' ), {} );
	assert.deepEqual( written( out, 'bare' ), {} );
	assert.deepEqual( written( out, 'drawn' ), { options: [ { value: 'Daily', label: 'Daily' } ] }, 'a rendered control is read from the page, not the schema' );
} );

test( 'schemaFieldByName and schemaControl read the named field and its control as the block takes it', () => {
	const schema = { steps: SCHEMA };
	assert.equal( schemaFieldByName( schema, 'cats' ).step.label, 'Ordering' );
	assert.equal( schemaFieldByName( schema, 'missing' ), null );
	assert.equal( schemaFieldByName( schema, '' ), null );
	assert.equal( schemaFieldByName( null, 'cats' ), null );
	assert.equal( schemaFieldByName( { steps: [ { label: 'x', fields: [ { label: 'No name' } ] } ] }, undefined ), null, 'a node with no fieldName is no field without a name' );
	assert.deepEqual( schemaControl( db, 'sgs/form-field-tiles', SCHEMA[ 1 ].fields[ 1 ] ), { name: 'cats', chips: [ { label: 'Rice' }, { label: 'Flour' } ] } );
	assert.deepEqual( schemaControl( db, 'sgs/form-field-select', SCHEMA[ 1 ].fields[ 0 ] ), { name: 'when', options: [ { value: 'Weekly', label: 'Weekly' }, { value: 'Monthly', label: 'Monthly' } ] } );
	assert.deepEqual( schemaControl( db, 'sgs/form-field-text', SCHEMA[ 1 ].fields[ 2 ] ), { name: 'city', autocomplete: 'address-level2' } );
	assert.deepEqual( schemaControl( db, 'sgs/form-field-select', { name: 'x', options: [] } ), { name: 'x' } );
} );

// A proposal slice: root > header (count, list, a quiet bar, a worded note) and a button, each with its row.
function slice() {
	const el = ( key, parentKey, words = '', o = {} ) => ( { key, parentKey, tag: o.tag || 'div', words, allText: o.allText ?? words, ...o } );
	const els = [ el( 'R', null ), el( 'H', 'R' ), el( 'C', 'H', 'Step 1 of 2' ), el( 'L', 'H' ), el( 'B', 'H', '', { allText: '' } ), el( 'N', 'H', 'Saved' ), el( 'W', 'H', '', { allText: 'inner words' } ), el( 'X', 'R', 'Next', { tag: 'button' } ), el( 'K', 'X', '', { tag: 'span' } ), el( 'T', 'R', '' ), el( 'T1', 'T', 'Shop', { tag: 'button' } ), el( 'T2', 'T', 'Cafe', { tag: 'button' } ), el( 'T3', 'T', 'Note', { tag: 'span' } ), el( 'Q', 'R', '', { allText: '' } ) ];
	const byKey = Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) );
	const m = { els, byKey, root: byKey.R, words: ( e ) => e.words, blockKids: ( e ) => els.filter( ( k ) => k.parentKey === e.key ) };
	const templates = { X: { attrs: { type: 'button', onClick: '{{ next }}', onKeyDown: '{{ keys }}' }, holes: [ { where: 'text', path: 'nextLabel' } ], membership: { scFor: [] } }, T1: { membership: { scFor: [ { key: 'f' } ] } } };
	const view = { entry: ( e ) => ( templates[ e.key ] ? { template: templates[ e.key ] } : null ), realTag: ( e ) => e.tag };
	const rows = els.map( ( e ) => ( { key: e.key, action: null, block: 'sgs/x' } ) );
	rows.push( { key: 'K', action: 'absorbed', into: 'X', block: null, rule: 'icon' } );
	rows.find( ( r ) => 'B' === r.key ).action = 'unresolved';
	rows.find( ( r ) => 'W' === r.key ).action = 'unresolved';
	rows.find( ( r ) => 'Q' === r.key ).action = 'unresolved';
	const rowOf = Object.fromEntries( rows.filter( ( r ) => 'absorbed' !== r.action ).map( ( r ) => [ r.key, r ] ) );
	const nodes = Object.fromEntries( [ 'C', 'L', 'X', 'T', 'N' ].map( ( k ) => [ k, { name: 'sgs/x', attributes: {}, innerBlocks: [] } ] ) );
	return { m, view, rows, rowOf, nodes };
}
const RULES = { formSteps: { reasons: { count: 'count reason', next: 'next reason', progress: 'progress reason' } } };

test( 'MUST FAIL: formStepContext settles the row of an absorbed node, the rows absorbed into it, and the quiet progress line beside a count', () => {
	const s = slice();
	const ctx = formStepContext( { m: s.m, view: s.view, nodeOfKey: s.nodes, rowOf: s.rowOf, rows: s.rows, rules: RULES, attr: () => true } );
	ctx.absorb( s.nodes.C, 'count reason', 'count' );
	ctx.absorb( s.nodes.X, 'next reason', 'next' );
	const row = ( k ) => s.rows.find( ( r ) => r.key === k && ( 'K' !== k || 'X' === r.into || 'R' === r.into ) );
	assert.deepEqual( [ row( 'C' ).action, row( 'C' ).block, row( 'C' ).into, row( 'C' ).rule, row( 'C' ).reason ], [ 'absorbed', null, 'R', 'formSteps', 'drawn by sgs/form: count reason' ] );
	assert.equal( row( 'X' ).reason, 'drawn by sgs/form: next reason' );
	assert.deepEqual( [ row( 'K' ).into, row( 'K' ).reason ], [ 'R', 'drawn by sgs/form: next reason' ], 'what the button absorbed goes with it' );
	assert.equal( row( 'B' ).reason, 'drawn by sgs/form: progress reason' );
	assert.equal( row( 'W' ).action, 'unresolved', 'NEGATIVE: a sibling holding words is no progress line' );
	assert.equal( row( 'Q' ).action, 'unresolved', 'NEGATIVE: a quiet element elsewhere is no progress line' );
	assert.equal( row( 'N' ).action, null, 'NEGATIVE: a resolved sibling stays' );
	assert.equal( row( 'L' ).action, null, 'NEGATIVE: a node never absorbed stays' );
} );

test( 'NEGATIVE formStepContext: a Next button settles no progress line, an unknown node or no reason settles nothing', () => {
	const s = slice();
	const ctx = formStepContext( { m: s.m, view: s.view, nodeOfKey: s.nodes, rowOf: s.rowOf, rows: s.rows, rules: RULES } );
	ctx.absorb( s.nodes.X, 'next reason', 'next' );
	assert.equal( s.rows.find( ( r ) => 'B' === r.key ).action, 'unresolved' );
	ctx.absorb( { name: 'sgs/y' }, 'count reason', 'count' );
	ctx.absorb( s.nodes.L, null, 'indicator' );
	assert.equal( s.rows.find( ( r ) => 'L' === r.key ).action, null );
	const bare = formStepContext( { m: s.m, view: s.view, nodeOfKey: s.nodes, rowOf: s.rowOf, rows: s.rows, rules: {} } );
	bare.absorb( s.nodes.C, 'count reason', 'count' );
	assert.equal( s.rows.find( ( r ) => 'B' === r.key ).action, 'unresolved', 'no progress reason, no progress line' );
	assert.equal( bare.has( 'a', 'b' ), true, 'no DB check holds every setting' );
} );

test( 'formStepContext reads a node\'s draft element and notes onto the root row', () => {
	const s = slice();
	const ctx = formStepContext( { m: s.m, view: s.view, nodeOfKey: s.nodes, rowOf: s.rowOf, rows: s.rows, rules: RULES, attr: ( b, a ) => 'sgs/x' === b && 'label' === a } );
	assert.deepEqual( ctx.draftOf( s.nodes.X ), { chips: [], holes: [ { where: 'text', path: 'nextLabel' } ], inLoop: false, handlers: [ 'next', 'keys' ] } );
	assert.deepEqual( ctx.draftOf( s.nodes.T ), { chips: [ 'Shop', 'Cafe' ], holes: [], inLoop: false, handlers: [] } );
	assert.equal( ctx.draftOf( { name: 'sgs/y' } ), null );
	assert.deepEqual( [ ctx.has( 'sgs/x', 'label' ), ctx.has( 'sgs/x', 'text' ) ], [ true, false ] );
	ctx.note( 'one' );
	ctx.note( 'two' );
	assert.deepEqual( s.rowOf.R.slotNotes, [ 'one', 'two' ] );
	assert.equal( ctx.rules, RULES );
} );

// The proposal end to end: a form surface drawn in a <div> (no <form>), showing its first step: a labelled input, a chip
// group and a Continue button. proposeSkeleton passes formStepContext, so the second step's field is built, the chips are
// the first step's tiles field and Continue's row is drawn by the form.
function surface() {
	const elements = [];
	const recs = {};
	let n = 0;
	const add = ( tag, o, parentKey, depth, chain, kids = [] ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const tk = `Root/${ id }`;
		const words = o.words || '';
		const el = { key, parentKey, depth, tag, template: 'Root', tpl: id, attrs: o.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: id * 30, w: 300, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		recs[ tk ] = { template: { key: tk, component: 'Root', n: String( id ), tag, realTag: tag, attrs: o.attrs || {}, style: { static: [], holes: [] }, pseudo: {}, holes: [], parent: chain[ 0 ] || null, realParent: chain[ 0 ] || null, parentChain: chain, membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: 1 }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} };
		const texts = kids.map( ( [ t, ko, kk ] ) => add( t, ko, key, depth + 1, [ tk, ...chain ], kk ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	add( 'div', {}, null, 0, [], [
		[ 'div', {}, [ [ 'label', { words: 'Trading name' } ], [ 'input', { attrs: { type: 'text' } } ] ] ],
		[ 'div', {}, [ [ 'button', { words: 'Shop', attrs: { 'aria-pressed': 'false' } } ], [ 'button', { words: 'Cafe', attrs: { 'aria-pressed': 'false' } } ] ] ],
		[ 'button', { words: 'Continue', attrs: { type: 'button', onClick: '{{ next }}' } } ],
	] );
	const steps = [
		{ key: 'a', label: 'Business', fields: [ { name: 'tradingName', label: 'Trading name', req: true }, { name: 'kind', label: 'Kind', type: 'chips', options: [ 'Shop', 'Cafe' ] } ] },
		{ key: 'b', label: 'Contact', fields: [ { name: 'email', label: 'Email', type: 'email', req: true } ] },
	];
	const record = { schema: '1', client: 'fixture-client', elements: recs, surfaces: {}, sources: { files: {} }, logic: { statics: { Root: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 2, value: steps } ] } } } };
	return { inventory: { checks: {}, source: 'fixture', root: 'div', generated: 'fixture', elements }, record };
}

test( 'MUST FAIL: the proposal of a multi-step form surface builds the later step, makes the chips its tiles field and settles Continue as the form\'s', () => {
	const s = surface();
	const r = proposeSkeleton( { inventory: s.inventory, facts: loadFacts( { db, client: 'fixture-client', repo: REPO } ), surface: 'fixture', surfaceKind: 'form', surfaceName: 'Fixture', motion: new Set(), db, factRecord: s.record, openers: {} } );
	const [ form ] = r.skeleton;
	assert.equal( form.name, 'sgs/form' );
	const steps = form.innerBlocks.filter( ( k ) => 'sgs/form-step' === k.name );
	assert.deepEqual( steps.map( ( k ) => [ k.attributes.label, k.innerBlocks.map( ( f ) => f.name ) ] ), [ [ 'Business', [ 'sgs/form-field-text', 'sgs/form-field-tiles' ] ], [ 'Contact', [ 'sgs/form-field-email' ] ] ] );
	assert.deepEqual( steps[ 1 ].innerBlocks[ 0 ].attributes, { label: 'Email', required: true, fieldName: 'email' } );
	const cont = r.proposal.rows.find( ( x ) => 'Continue' === x.words );
	assert.deepEqual( [ cont.action, cont.rule, cont.block ], [ 'absorbed', 'formSteps', null ] );
	assert.deepEqual( r.problems, [] );
} );
