// Spec 48 FR-48-100: a cloned form keeps its success message and its validation (lib/fill-form-behaviour.mjs, called by
// lib/fill-form.mjs::formWrites). Fixtures tests/fixtures/form-behaviour: Mama's Munches' contact form (its submit handler
// writes `sent = true`, which shows the "Contact sent" result record's sc-if: "message received" and "Thank you! Zainab will be
// in touch soon.", a tick and a "Send another" button) and Indus Foods' enquiry form (its validation refuses an empty name,
// email and message with its own copy, and its inputs carry no `required` attribute). Each fixture is the committed draft
// component, its skeleton and the fact record's entries for the form (copied from sites/<client>).
//
// The validation copy's lost hand-off, proven here: Fill read the draft's scripts from `--draft-dir` only
// (`formSources( o.draftDir, … )` in fill.mjs), while site-run passes `--draft-url`, so the sources were {} and no field got its
// copy; and a copy alone never made a field required, so the clone took a blank submission. formDraftFolder gives the folder
// the draft's logic is read from, and requiredFromCopy makes a field the draft refuses empty required.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { formWrites, formSources } from '../lib/fill-form.mjs';
import { formDraftFolder, successMessageOf, formRecordOf, requiredFromCopy } from '../lib/fill-form-behaviour.mjs';
import { openDb } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'form-behaviour' );
const read = ( ...p ) => JSON.parse( fs.readFileSync( path.join( FIX, ...p ), 'utf8' ) );
const SENT = 'message received<br>Thank you! Zainab will be in touch soon.';

// Fill's inputs for a skeleton: flat nodes, their records (one target per node with a draft reference) and the draft read's
// form facts at 1440 (`controls`: the read of each control by its template reference).
function fillInputs( tree, controls = {} ) {
	const flat = [];
	const walk = ( list ) => list.forEach( ( n ) => {
		flat.push( n );
		walk( n.innerBlocks || [] );
	} );
	walk( tree );
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, targets: n.draftRef ? [ { slot: '', id: `t${ index }`, finder: { tpl: n.draftRef.tpl } } ] : [] } ) );
	const widths = { 1440: Object.fromEntries( flat.map( ( n, i ) => [ `t${ i }`, { form: controls[ n.draftRef?.tpl ] || null } ] ) ) };
	return { flat, nodes, refOf: ( n ) => `n${ flat.indexOf( n ) }`, reads: { widths } };
}
const writesOf = ( out ) => out.writes.map( ( w ) => [ w.block, w.attr, w.after ] );

test( 'MUST FAIL: the form takes the words its draft shows once sent as its success message, word for word', () => {
	const facts = read( 'mamas', 'facts.json' );
	const tree = read( 'mamas', 'form-send.skeleton.json' );
	const db = openDb();
	const out = formWrites( { ...fillInputs( tree ), facts, db, component: 'Contact', folder: path.join( FIX, 'mamas' ) } );
	db.close();
	assert.deepEqual( writesOf( out ).filter( ( w ) => 'successMessage' === w[ 1 ] ), [ [ 'sgs/form', 'successMessage', SENT ] ] );
	assert.equal( tree[ 0 ].attributes.successMessage, SENT, 'written onto the form node' );
	const sent = successMessageOf( { factRecord: facts, record: facts.surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } );
	assert.deepEqual( sent.lines, [ 'message received', 'Thank you! Zainab will be in touch soon.' ], 'never the tick or the Send another button' );
	assert.equal( sent.state, 'S-35 sent', 'the result record the submit handler shows' );
	assert.equal( formRecordOf( facts, 'Contact/44' )?.id, 'S-34' );
	const two = { ...facts, surfaces: { 'S-99': { id: 'S-99', kind: 'form', dc: 'Contact', roots: [ 'Contact/75' ], states: [] }, ...facts.surfaces } };
	assert.equal( formRecordOf( two, 'Contact/44' )?.id, 'S-34', 'the record whose roots hold the element, not the first form record' );
	// A sent state keyed by a string value: the handler's quoted write matches it.
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'form-behaviour-' ) );
	fs.writeFileSync( path.join( dir, 'Contact.dc.html' ), fs.readFileSync( path.join( FIX, 'mamas', 'Contact.dc.html' ), 'utf8' ).replace( 'e.preventDefault(); this.setState({ sent: true });', "e.preventDefault(); this.setState({ sent: 'done' });" ) );
	const word = JSON.parse( JSON.stringify( facts ) );
	word.surfaces[ 'S-35' ].states[ 0 ].state_keys = { sent: 'done' };
	assert.equal( successMessageOf( { factRecord: word, record: word.surfaces[ 'S-34' ], folder: dir } ).message, SENT );
} );

test( 'MUST FAIL: the draft\'s plain words are written as HTML, so a "<", ">" or "&" in them shows as typed and only the line breaks are markup', () => {
	// The fact record's words are the text the page showed (decoded), and the message is rich text the editor sanitises.
	const facts = read( 'mamas', 'facts.json' );
	facts.elements[ 'Contact/71' ].template.words = 'We <3 you & yours';
	facts.elements[ 'Contact/72' ].template.words = 'Fish &amp; chips, <b>not</b> "bold" > 3';
	const r = successMessageOf( { factRecord: facts, record: facts.surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } );
	assert.equal( r.message, 'We &lt;3 you &amp; yours<br>Fish &amp;amp; chips, &lt;b&gt;not&lt;/b&gt; "bold" &gt; 3' );
	// The lines stay the draft's own words.
	assert.deepEqual( r.lines, [ 'We <3 you & yours', 'Fish &amp; chips, <b>not</b> "bold" > 3' ] );
	// Negative control: words with none of the three characters are written as they are.
	assert.equal( successMessageOf( { factRecord: read( 'mamas', 'facts.json' ), record: read( 'mamas', 'facts.json' ).surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } ).message, SENT );
} );

test( 'negative control: a form with no folder, no submit handler, or a handler that shows no state writes no message', () => {
	const facts = read( 'mamas', 'facts.json' );
	const db = openDb();
	assert.deepEqual( writesOf( formWrites( { ...fillInputs( read( 'mamas', 'form-send.skeleton.json' ) ), facts, db, component: 'Contact' } ) ).filter( ( w ) => 'successMessage' === w[ 1 ] ), [], 'no draft folder' );
	db.close();
	const noSubmit = JSON.parse( JSON.stringify( facts ) );
	delete noSubmit.elements[ 'Contact/44' ].template.attrs.onSubmit;
	assert.equal( successMessageOf( { factRecord: noSubmit, record: noSubmit.surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } ).message, null );
	const otherState = JSON.parse( JSON.stringify( facts ) );
	otherState.surfaces[ 'S-35' ].states[ 0 ].state_keys = { sent: 'yes' };
	assert.equal( successMessageOf( { factRecord: otherState, record: otherState.surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } ).message, null, 'a state the handler never writes is not the sent state' );
	const holes = JSON.parse( JSON.stringify( facts ) );
	holes.elements[ 'Contact/72' ].template.words = 'Thank you, {{ name }}!';
	const r = successMessageOf( { factRecord: holes, record: holes.surfaces[ 'S-34' ], folder: path.join( FIX, 'mamas' ) } );
	assert.equal( r.message, 'message received' );
	assert.match( r.notes[ 0 ], /fills in what the visitor typed/ );
} );

test( 'MUST FAIL: Indus\'s enquiry fields carry the copy the draft refuses them empty with, and are required', () => {
	const facts = read( 'indus', 'facts.json' );
	const tree = read( 'indus', 'form-enquiry.skeleton.json' );
	// The draft renders each field's id from its loop item (`id: 'enq-' + n`) and the message box as `enq-msg`.
	const ids = { 'Root>EnquiryForm@468#0/26#0': [ 'input', 'text', 'enq-name' ], 'Root>EnquiryForm@468#0/26#1': [ 'input', 'text', 'enq-business' ], 'Root>EnquiryForm@468#0/26#2': [ 'input', 'email', 'enq-email' ], 'Root>EnquiryForm@468#0/26#3': [ 'input', 'tel', 'enq-phone' ], 'Root>EnquiryForm@468#0/31#0': [ 'textarea', null, 'enq-msg' ] };
	const controls = Object.fromEntries( Object.entries( ids ).map( ( [ tpl, [ tag, type, id ] ] ) => [ tpl, { tag, type, id, name: null, required: false } ] ) );
	const db = openDb();
	// Before: the sources read from the --draft-dir option, which site-run never passes.
	const lost = formWrites( { ...fillInputs( JSON.parse( JSON.stringify( tree ) ), controls ), facts, db, component: 'EnquiryForm', sources: formSources( undefined, facts, 'EnquiryForm' ) } );
	assert.deepEqual( writesOf( lost ).filter( ( w ) => /^(msgRequired|required)$/.test( w[ 1 ] ) ), [], 'the copy is lost when the sources are read from no folder' );
	// After: the folder the draft's logic is read from.
	const folder = formDraftFolder( { draftDir: path.join( FIX, 'indus' ), repo: 'unused', client: 'unused' } );
	const out = formWrites( { ...fillInputs( tree, controls ), facts, db, component: 'EnquiryForm', sources: formSources( folder, facts, 'EnquiryForm' ), folder } );
	db.close();
	assert.deepEqual( writesOf( out ).filter( ( w ) => /^(msgRequired|required)$/.test( w[ 1 ] ) ), [
		[ 'sgs/form-field-text', 'msgRequired', 'Please enter your name' ],
		[ 'sgs/form-field-text', 'required', true ],
		[ 'sgs/form-field-email', 'msgRequired', 'Enter a valid email address' ],
		[ 'sgs/form-field-email', 'required', true ],
		[ 'sgs/form-field-textarea', 'msgRequired', 'Tell us a little more (at least 10 characters)' ],
		[ 'sgs/form-field-textarea', 'required', true ],
	] );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'form read-back' === u.property ), [], 'every copy reads back' );
	assert.deepEqual( writesOf( out ).filter( ( w ) => 'successMessage' === w[ 1 ] ), [ [ 'sgs/form', 'successMessage', 'Message sent' ] ], 'the result record\'s words that hold no visitor input' );
} );

test( 'MUST FAIL: the draft folder falls back from --draft-dir to the surface entry\'s, then the client\'s handoff folder', () => {
	assert.equal( formDraftFolder( { draftDir: 'D:/draft', repo: '/r', entryDraftDir: 'x', client: 'c' } ), 'D:/draft' );
	assert.equal( formDraftFolder( { repo: '/r', entryDraftDir: 'sites/c/served', client: 'c' } ), path.join( '/r', 'sites/c/served' ) );
	assert.equal( formDraftFolder( { repo: '/r', client: 'c' } ), path.join( '/r', 'sites', 'c', 'handoff' ) );
	// Fill hands the form pass that folder for its sources, as it does the draft's logic (fill.mjs runs no test of its own).
	const fill = fs.readFileSync( path.join( HERE, '..', 'fill.mjs' ), 'utf8' );
	assert.ok( fill.includes( 'const draftFolder = formDraftFolder( { draftDir: o.draftDir, repo, entryDraftDir: entry.draftDir, client: o.client } );' ) );
	assert.ok( fill.includes( 'component: intakeParts.rootComponent, idxFor, folder: draftFolder }' ) );
} );

test( 'negative control: no copy, an already required field, or a block with no required setting', () => {
	const has = ( b, a ) => 'sgs/form-field-tiles' !== b || 'required' !== a;
	assert.deepEqual( requiredFromCopy( { block: 'sgs/form-field-text', copy: {}, has } ).writes, [] );
	assert.deepEqual( requiredFromCopy( { block: 'sgs/form-field-text', copy: { tooLong: 'x' }, has } ).writes, [], 'a too-long copy alone is no empty refusal' );
	assert.deepEqual( requiredFromCopy( { block: 'sgs/form-field-text', attributes: { required: true }, copy: { required: 'x' }, has } ).writes, [] );
	const none = requiredFromCopy( { block: 'sgs/form-field-tiles', copy: { required: 'Pick one' }, has } );
	assert.deepEqual( none.writes, [] );
	assert.match( none.unmapped[ 0 ].reason, /holds no required setting/ );
} );
