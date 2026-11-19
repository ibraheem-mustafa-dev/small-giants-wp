// Spec 48 FR-48-100: a form's fields shown under an `<sc-if>` tied to another field's value wait on that field, and those the
// page never rendered are built (lib/form-scif-fields.mjs, called by lib/skeleton-propose.mjs::proposeSkeleton for a form
// surface). Fixture tests/fixtures/form-behaviour/mamas: Mama's Munches' contact form, whose committed skeleton shows the
// order-number field always (its sc-if was open at the read, the topic starting at "order") and lacks the cookie-count and
// date fields (their sc-if, open only for the "bulk" topic, was closed). The fact record's form states name each sc-if.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { scIfFields, scIfConditions, templateKeyOf } from '../lib/form-scif-fields.mjs';
import { loadDraft } from '../lib/intake-ast.mjs';
import { openDb } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'form-behaviour', 'mamas' );
const RULES = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ).rules;
const facts = () => JSON.parse( fs.readFileSync( path.join( FIX, 'facts.json' ), 'utf8' ) );
const tree = () => JSON.parse( fs.readFileSync( path.join( FIX, 'form-send.skeleton.json' ), 'utf8' ) );
const db = openDb();
const has = ( b, a ) => !! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( b, a );
const fields = ( t ) => {
	const out = [];
	const walk = ( list ) => list.forEach( ( n ) => {
		/^sgs\/form-field-/.test( n.name ) && out.push( [ n.attributes.label, n.attributes.conditionalField ?? null, n.attributes.conditionalValue ?? null ] );
		walk( n.innerBlocks || [] );
	} );
	walk( t );
	return out;
};

test( 'MUST FAIL: the order-number field waits on My order, and the cookie-count and date fields are built waiting on the event topic', () => {
	const t = tree();
	const r = scIfFields( t, { factRecord: facts(), surfaceId: 'S-34', folder: FIX, rules: RULES, has } );
	assert.deepEqual( fields( t ), [
		[ 'What’s it about?', null, null ],
		[ 'Your name', null, null ],
		[ 'Email', null, null ],
		[ 'Order number (if you have it)', 'topic', 'My order' ],
		[ 'How many cookies, roughly?', 'topic', 'Baby shower or event' ],
		[ 'Date needed', 'topic', 'Baby shower or event' ],
		[ 'Message', null, null ],
	] );
	const form = t[ 0 ].innerBlocks;
	assert.deepEqual( form.slice( 3, 6 ).map( ( n ) => n.name ), [ 'sgs/form-field-text', 'sgs/form-field-text', 'sgs/form-field-date' ], 'built in template order, after the order field and before the message' );
	assert.equal( form[ 4 ].attributes.inputmode, 'numeric' );
	assert.ok( form.slice( 3, 6 ).every( ( n ) => 'equals' === n.attributes.conditionalOperator ) );
	const tiles = t[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ];
	assert.deepEqual( [ tiles.attributes.fieldName, tiles.attributes.defaultValue ], [ 'topic', 'My order' ], 'the watched field is named by its state key and starts on the draft\'s topic' );
	assert.deepEqual( r.built, [ 'Contact/62', 'Contact/64' ] );
	assert.deepEqual( r.conditioned, [ 'Contact/58' ] );
	assert.equal( r.notes.length, 2 );
} );

test( 'MUST FAIL: the conditions come from the record states that show one sc-if for one value', () => {
	const idx = loadDraft( FIX, 'Contact.dc.html' ).idx;
	assert.deepEqual( scIfConditions( { factRecord: facts(), surfaceId: 'S-34', idx } ), [
		{ scIf: 'Contact/56', field: 'topic', raw: 'order', value: 'My order' },
		{ scIf: 'Contact/59', field: 'topic', raw: 'bulk', value: 'Baby shower or event' },
	], 'the either-or topics and the editing state (the form root) give none' );
	assert.equal( templateKeyOf( { draftRef: { tpl: 'Root/58#0' } }, 'Contact' ), 'Contact/58' );
	assert.equal( templateKeyOf( { draftRef: { tpl: 'Root>EnquiryForm@468#0/26#3' } }, 'Contact' ), 'EnquiryForm/26' );
	assert.equal( templateKeyOf( {}, 'Contact' ), null );
} );

test( 'negative control: a state key no field writes, an either-or value or no record leaves the tree as it was', () => {
	const sent = facts();
	sent.surfaces[ 'S-34' ].states = [ { name: 'sent', state_keys: { sent: true }, sc_if_tpl_ids: [ '59' ] } ];
	const t = tree();
	scIfFields( t, { factRecord: sent, surfaceId: 'S-34', folder: FIX, rules: RULES, has } );
	assert.deepEqual( t, tree(), 'no control writes `sent`: the form\'s own state, no field value' );
	const either = facts();
	either.surfaces[ 'S-34' ].states.forEach( ( st ) => {
		st.state_keys.topic && ( st.state_keys.topic = `${ st.state_keys.topic }|gift` );
	} );
	const t2 = tree();
	scIfFields( t2, { factRecord: either, surfaceId: 'S-34', folder: FIX, rules: RULES, has } );
	assert.deepEqual( t2, tree() );
	const t3 = tree();
	scIfFields( t3, { factRecord: facts(), surfaceId: 'S-99', folder: FIX, rules: RULES, has } );
	assert.deepEqual( t3, tree() );
	const t5 = tree();
	assert.deepEqual( scIfFields( t5, { factRecord: facts(), surfaceId: 'S-34', folder: os.tmpdir(), rules: RULES, has } ).notes, [], 'no draft file of the form component: nothing read, nothing thrown' );
	const root = facts();
	root.surfaces[ 'S-34' ].states = [ { name: 'gift', state_keys: { topic: 'gift' }, sc_if_tpl_ids: [ '43' ] } ];
	const t4 = tree();
	scIfFields( t4, { factRecord: root, surfaceId: 'S-34', folder: FIX, rules: RULES, has } );
	assert.deepEqual( fields( t4 ).filter( ( f ) => f[ 1 ] ), [], 'the sc-if that is the form itself puts no condition on its fields' );
	const desc = facts();
	desc.surfaces[ 'S-34' ].states[ 1 ].state_keys = { topic: 'any topic at all' };
	assert.equal( scIfConditions( { factRecord: desc, surfaceId: 'S-34', idx: loadDraft( FIX, 'Contact.dc.html' ).idx } ).length, 1, 'a described value is no condition' );
} );

test( 'MUST FAIL: a value with no label pair is used as it is, a block lacking a setting is left without it, and a set name is kept', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'scif-' ) );
	fs.writeFileSync( path.join( dir, 'Contact.dc.html' ), fs.readFileSync( path.join( FIX, 'Contact.dc.html' ), 'utf8' ).replace( "['bulk', 'Baby shower or event']", "['bulk']" ) );
	const t = tree();
	t[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ].attributes.fieldName = 'subject';
	scIfFields( t, { factRecord: facts(), surfaceId: 'S-34', folder: dir, rules: RULES, has: ( b, a ) => ! ( 'sgs/form-field-date' === b && 'conditionalValue' === a ) && has( b, a ) } );
	const form = t[ 0 ].innerBlocks;
	assert.equal( form[ 4 ].attributes.conditionalValue, 'bulk' );
	assert.equal( form[ 5 ].attributes.conditionalValue, undefined );
	assert.equal( t[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ].attributes.fieldName, 'subject' );
} );

test( 'MUST FAIL: the skeleton proposer runs it for a form surface', () => {
	const src = fs.readFileSync( path.join( HERE, '..', 'lib', 'skeleton-propose.mjs' ), 'utf8' );
	assert.ok( src.includes( "const scIf = 'form' === surfaceKind ? scIfFields( skeleton, { factRecord, surfaceId: scope?.id, folder: handoffOf( facts ), rules: R, has: ( b, a ) => !! facts.attr?.( b, a ) } ) : null;" ) );
} );
