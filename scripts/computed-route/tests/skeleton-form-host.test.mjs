// The form host and the field's input part in the skeleton (Spec 48 FR-48-57, FR-48-6; lib/skeleton-form-host.mjs::formHostNodes,
// lib/skeleton-form-slots.mjs::fieldInputSlot). Each test fails against code that leaves the skeleton alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { formHostNodes } from '../lib/skeleton-form-host.mjs';
import { fieldInputSlot } from '../lib/skeleton-form-slots.mjs';
import { attrsFor, openDb } from '../lib/db.mjs';

const SCHEMA = [ { key: 'a', label: 'Business', fields: [ { name: 'tradingName' } ] }, { key: 'b', label: 'Review', fields: [] } ];
const FACTS = { logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 2, value: SCHEMA } ] } } } };
const field = ( ref ) => ( { name: 'sgs/form-field-text', draftRef: ref, attributes: {}, innerBlocks: [] } );
const box = ( ...kids ) => ( { name: 'sgs/container', attributes: {}, innerBlocks: kids } );
const names = ( n ) => [ n.name, ...( n.innerBlocks || [] ).flatMap( names ) ];

test( 'fields outside a form, in a draft with a form schema, are held by one form node at the lowest node holding them all', () => {
	const inner = box( field( '#a' ), box( field( '#b' ) ) );
	const out = formHostNodes( [ box( { name: 'sgs/heading', attributes: {}, innerBlocks: [] }, inner ) ], { factRecord: FACTS } );
	const host = out[ 0 ].innerBlocks[ 1 ];
	assert.equal( host.name, 'sgs/form' );
	assert.equal( host.draftRef, undefined );
	assert.equal( host.innerBlocks[ 0 ], inner );
	assert.equal( names( out[ 0 ] ).filter( ( n ) => 'sgs/form' === n ).length, 1 );
} );

test( 'a lone field is held through its parent, and fields with no shared node make the whole skeleton the form', () => {
	const lone = formHostNodes( [ box( box( field( '#a' ) ) ) ], { factRecord: FACTS } );
	assert.deepEqual( names( lone[ 0 ] ), [ 'sgs/container', 'sgs/form', 'sgs/container', 'sgs/form-field-text' ] );
	const apart = formHostNodes( [ box( field( '#a' ) ), box( field( '#b' ) ) ], { factRecord: FACTS } );
	assert.equal( apart.length, 1 );
	assert.equal( apart[ 0 ].name, 'sgs/form' );
	assert.equal( apart[ 0 ].innerBlocks.length, 2 );
} );

test( 'nothing changes without a form schema, with no fields, or when a form already holds them', () => {
	const tree = () => [ box( field( '#a' ) ) ];
	assert.equal( JSON.stringify( formHostNodes( tree(), { factRecord: null } ) ), JSON.stringify( tree() ) );
	assert.equal( JSON.stringify( formHostNodes( [ box() ], { factRecord: FACTS } ) ), JSON.stringify( [ box() ] ) );
	const held = () => [ { name: 'sgs/form', attributes: {}, innerBlocks: [ box( field( '#a' ) ) ] } ];
	assert.equal( JSON.stringify( formHostNodes( held(), { factRecord: FACTS } ) ), JSON.stringify( held() ) );
} );

const RULES = { inputPart: 'field-input', inputPartHost: 'sgs/form' };
const HOME = '.sgs-form__inner > .sgs-form-field:nth-of-type(2) > .sgs-form-field__input';
test( 'the input slot is the field calibration\'s element that the form block\'s calibrated home slot ends in', () => {
	const db = openDb();
	const hostSettings = Object.fromEntries( attrsFor( db, 'sgs/form' ).filter( ( r ) => 'field-input' === r.css_element ).map( ( r ) => [ r.attr_name, { slot: HOME, slots: [ HOME ] } ] ) );
	const calSettings = ( slug ) => ( 'sgs/form' === slug ? hostSettings : {} );
	const keys = { 'sgs/form-field-text': [ '.sgs-form-field__input', '.sgs-form-field__error' ], 'sgs/form-field-file': [ '.sgs-form-field__file-zone' ] };
	const calKeys = ( slug ) => keys[ slug ] || [];
	assert.equal( fieldInputSlot( { db, rules: RULES, block: 'sgs/form-field-text', calSettings, calKeys } ), '.sgs-form-field__input' );
	assert.equal( fieldInputSlot( { db, rules: RULES, block: 'sgs/form-field-file', calSettings, calKeys } ), null );
	assert.equal( fieldInputSlot( { db, rules: RULES, block: 'sgs/form-field-text', calSettings: () => ( {} ), calKeys } ), null );
	assert.equal( fieldInputSlot( { db: null, rules: RULES, block: 'sgs/form-field-text', calSettings, calKeys } ), null );
	assert.equal( fieldInputSlot( { db, rules: {}, block: 'sgs/form-field-text', calSettings, calKeys } ), null );
} );
