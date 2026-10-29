// B1 (a) and (b), Spec 48 FR-48-57: a form's `successMessage` is the draft's sent state (its result surface, else its own sent
// state: lib/fill-form-success.mjs), and a field the draft's own validation refuses when empty is `required` with its copy,
// from the draft folder a URL-served run still reads (lib/fill-form-success.mjs::draftFolderOf). Each test fails against the code
// before this change (no successMessage write, no `required` write, the form sources read from no folder).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { formWrites, formSources, formFieldWrites } from '../lib/fill-form.mjs';
import { successMessageOf, sentKeys, draftFolderOf } from '../lib/fill-form-success.mjs';

const db = openDb();
const tpl = ( key, n, tag, o = {} ) => ( { template: { key, component: key.split( '/' )[ 0 ], n: String( n ), tag, realTag: tag, attrs: {}, holes: [], parentChain: [], membership: { scIf: [], scFor: [] }, words: '', events: [], ...o } } );
const sentIf = ( value ) => ( { scIf: [ { key: 'Enq/43', value } ], scFor: [] } );

// A form with a result surface: the sent state is the sc-if Enq/43 (a heading, a worded paragraph with three blanks, a button).
const hole = ( i, v ) => [ `text#${ i }`, { 1440: { v: [ { t: 'string', v } ], n: 1, loop: false } } ];
const FACTS = {
	surfaces: { 'S-59': { id: 'S-59', kind: 'form', dc: 'Enq', parent: 'S-37', roots: [ 'Enq/5' ] }, 'S-60': { id: 'S-60', kind: 'result', dc: 'Enq', parent: 'S-59', roots: [ 'Enq/43' ] } },
	elements: {
		'Enq/6': tpl( 'Enq/6', 6, 'form', { parentChain: [ 'Enq/5', 'Enq/4' ], events: [ { name: 'onSubmit', expr: 'submit' } ] } ),
		'Enq/43': tpl( 'Enq/43', 43, 'sc-if', { parentChain: [ 'Enq/4' ] } ),
		'Enq/46': tpl( 'Enq/46', 46, 'h3', { parentChain: [ 'Enq/44', 'Enq/43' ], words: 'Message sent' } ),
		'Enq/47': { ...tpl( 'Enq/47', 47, 'p', { parentChain: [ 'Enq/44', 'Enq/43' ], words: 'Thanks, {{ name }}. Your {{ topicLower }} enquiry is with the right team and we’ll reply by {{ prefLower }} within one working day.' } ), logic: { holes: Object.fromEntries( [ hole( 0, 'there' ), hole( 1, 'general' ), hole( 2, 'email' ) ] ) } },
		'Enq/48': tpl( 'Enq/48', 48, 'button', { parentChain: [ 'Enq/44', 'Enq/43' ], words: 'Send another message' } ),
		// An icon the script builds (words are one blank with no text value) and a bare tick glyph are no words to carry.
		'Enq/45': { ...tpl( 'Enq/45', 45, 'span', { parentChain: [ 'Enq/44', 'Enq/43' ], words: '{{ bigTick }}' } ), logic: { holes: { 'text#0': { 1440: { v: [ { t: 'array', n: 1 } ], n: 1, loop: false } } } } },
		'Enq/49': tpl( 'Enq/49', 49, 'span', { parentChain: [ 'Enq/44', 'Enq/43' ], words: '✓' } ),
	},
};
const SENT = 'Message sent. Thanks, there. Your general enquiry is with the right team and we’ll reply by email within one working day.';

test( 'MUST FAIL: the result surface\'s words, blanks read at rest, are the message; the reset button is not part of it', () => {
	const r = successMessageOf( { facts: FACTS, formKey: 'Enq/6' } );
	assert.equal( r.message, SENT );
	assert.match( r.source, /result surface/ );
	assert.deepEqual( r.notes, [] );
} );

// A form with only a sent state of its own (no result surface): the span sits inside an sc-if on `contactSent`.
const OWN = {
	surfaces: {},
	elements: {
		'Site/9': tpl( 'Site/9', 9, 'form', { events: [ { name: 'onSubmit', expr: 'submitContact' } ] } ),
		'Site/12': tpl( 'Site/12', 12, 'span', { words: 'Thanks — I\'ll come back to you shortly.', membership: sentIf( '{{ contactSent }}' ) } ),
		'Site/13': tpl( 'Site/13', 13, 'span', { words: 'Elsewhere', membership: { scIf: [ { key: 'x', value: '{{ other }}' } ], scFor: [] } } ),
	},
};
const SCRIPT = 'class S { sendReset = e => { this.setState({ view: "sent" }); }\n  submitContact = e => { e.preventDefault(); this.setState({ contactSent: true, sending: true }); }; }';

test( 'MUST FAIL: with no result surface the form\'s own sent state (the key its submit handler sets true) gives the message', () => {
	const r = successMessageOf( { facts: OWN, formKey: 'Site/9', scriptOf: () => SCRIPT } );
	assert.equal( r.message, 'Thanks — I\'ll come back to you shortly.' );
	assert.match( r.source, /sent state \(contactSent\)/ );
	assert.deepEqual( sentKeys( SCRIPT, 'submitContact' ), [ 'contactSent' ], 'a sending flag is no result' );
} );

test( 'NEGATIVE: no result surface and no handler key, a handler setting no result key, or a missing form give nothing', () => {
	assert.equal( successMessageOf( { facts: OWN, formKey: 'Site/9', scriptOf: () => null } ), null );
	assert.equal( successMessageOf( { facts: OWN, formKey: 'Site/9', scriptOf: () => 'class S { submitContact = e => { this.setState({ sending: true }); }; }' } ), null );
	assert.equal( successMessageOf( { facts: OWN, formKey: 'Site/99', scriptOf: () => SCRIPT } ), null );
	// A result surface whose parent surface is not rooted on this form is another form's.
	const other = structuredClone( FACTS );
	other.surfaces[ 'S-59' ].roots = [ 'Enq/99' ];
	assert.equal( successMessageOf( { facts: other, formKey: 'Enq/6' } ), null );
	assert.deepEqual( sentKeys( SCRIPT, 'nope' ), [] );
	assert.deepEqual( sentKeys( SCRIPT, null ), [] );
} );

test( 'a blank with no single value at rest is left out and named in a note', () => {
	const facts = structuredClone( FACTS );
	facts.elements[ 'Enq/47' ].logic.holes[ 'text#2' ][ 1440 ].v = [ { t: 'array', n: 3 } ];
	const r = successMessageOf( { facts, formKey: 'Enq/6' } );
	assert.equal( r.message, 'Message sent. Thanks, there. Your general enquiry is with the right team and we’ll reply by within one working day.' );
	assert.equal( r.notes.length, 1 );
} );

const node = ( name, attributes, ref ) => ( { name, attributes, innerBlocks: [], ref } );
const written = ( out, ref ) => Object.fromEntries( out.writes.filter( ( w ) => w.node === ref ).map( ( w ) => [ w.attr, w.after ] ) );
const runForm = ( facts, component, tplKey, folder = null ) => formWrites( {
	nodes: [ { index: 0, name: 'sgs/form', targets: [ { id: '0:', slot: '', finder: { tpl: tplKey } } ] } ],
	flat: [ node( 'sgs/form', {}, 'form' ) ], refOf: ( n ) => n.ref, reads: { widths: { 1440: {} } }, facts, db, component, draftFolder: folder,
} );

test( 'MUST FAIL: formWrites writes the sent state as the sgs/form successMessage', () => {
	const out = runForm( FACTS, 'Enq', 'Root>Enq@1#0/6#0' );
	assert.equal( written( out, 'form' ).successMessage, SENT );
	assert.ok( out.notes.some( ( n ) => /successMessage is the words of the result surface/.test( n ) ) );
} );

test( 'NEGATIVE: a form whose draft holds no sent state keeps the block default', () => {
	const out = runForm( { surfaces: {}, elements: { 'Enq/6': FACTS.elements[ 'Enq/6' ] } }, 'Enq', 'Root>Enq@1#0/6#0' );
	assert.deepEqual( written( out, 'form' ), {} );
} );

test( 'MUST FAIL: the sent state of the form\'s own script is read from the draft folder', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sent-' ) );
	fs.writeFileSync( path.join( dir, 'Site.dc.html' ), SCRIPT );
	assert.equal( written( runForm( OWN, 'Site', 'Root>Site@1#0/9#0', dir ), 'form' ).successMessage, 'Thanks — I\'ll come back to you shortly.' );
	assert.deepEqual( written( runForm( OWN, 'Site', 'Root>Site@1#0/9#0', null ), 'form' ), {}, 'without the folder the script is unread' );
} );

// The validation hand-off: the Indus enquiry validates in script only (no native required attribute).
const ENQUIRY = `submit = (e) => {
    if (!v.name) errs.name = 'Please enter your name';
    if (!v.email || !/^[^@\\s]+@[^@\\s]+$/.test(v.email)) errs.email = 'Enter a valid email address';
    if (!v.msg || v.msg.trim().length < 10) errs.msg = 'Tell us a little more';
};`;

test( 'MUST FAIL: a field the draft\'s script refuses when empty is required, with its copy', () => {
	const w = formFieldWrites( { db, block: 'sgs/form-field-text', el: { tag: 'input', type: 'text' }, copy: { required: 'Please enter your name' } } );
	assert.deepEqual( w.writes.filter( ( x ) => /^(required|msgRequired)$/.test( x.attr ) ).map( ( x ) => [ x.attr, x.value ] ), [ [ 'required', true ], [ 'msgRequired', 'Please enter your name' ] ] );
} );

test( 'NEGATIVE: a field the draft\'s script gives no copy is not made required; an already-required field is not rewritten', () => {
	assert.deepEqual( formFieldWrites( { db, block: 'sgs/form-field-text', el: { tag: 'input', type: 'text' }, copy: {} } ).writes, [] );
	const held = formFieldWrites( { db, block: 'sgs/form-field-text', attributes: { required: true }, el: { tag: 'input', type: 'text' }, copy: { required: 'x' } } );
	assert.deepEqual( held.writes.map( ( x ) => x.attr ), [ 'msgRequired' ] );
	const hidden = formFieldWrites( { db, block: 'sgs/form-field-hidden', el: { tag: 'input', type: 'hidden' }, copy: { required: 'Pick one' } } );
	assert.equal( hidden.writes.some( ( x ) => 'required' === x.attr ), false, 'a block holding no required setting writes none' );
	assert.equal( hidden.unmapped.some( ( u ) => 'required' === u.property ), false, 'and names no gap for the required flag, which the message row already names' );
} );

test( 'MUST FAIL: a URL-served run reads the same folder as the logic reader: the surface\'s draftDir, else the client\'s handoff folder', () => {
	assert.equal( draftFolderOf( { draftDir: null, entry: {}, repo: '/r', client: 'c' } ), path.join( '/r', 'sites', 'c', 'handoff' ) );
	assert.equal( draftFolderOf( { draftDir: null, entry: { draftDir: 'sites/c/other' }, repo: '/r', client: 'c' } ), path.join( '/r', 'sites/c/other' ) );
	assert.equal( draftFolderOf( { draftDir: '/given', entry: { draftDir: 'x' }, repo: '/r', client: 'c' } ), '/given' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'enq-' ) );
	fs.writeFileSync( path.join( dir, 'Enq.dc.html' ), ENQUIRY );
	const sources = formSources( draftFolderOf( { draftDir: null, entry: { draftDir: path.basename( dir ) }, repo: os.tmpdir(), client: 'c' } ), null );
	assert.ok( sources.Enq, 'the enquiry\'s script, which holds validation copy, is a form source' );
	assert.deepEqual( formSources( null, null ), {}, 'a run that never names the folder reads no validation copy' );
} );

test( 'MUST FAIL: Fill passes the one draft folder to the form sources, not the run\'s --draft-dir alone (a URL-served run has none)', () => {
	const fill = fs.readFileSync( fileURLToPath( new URL( '../fill.mjs', import.meta.url ) ), 'utf8' );
	assert.match( fill, /formSources\( draftFolder,/ );
	assert.doesNotMatch( fill, /formSources\( o\.draftDir/ );
	assert.match( fill, /draftFolder = draftFolderOf\(/ );
} );
