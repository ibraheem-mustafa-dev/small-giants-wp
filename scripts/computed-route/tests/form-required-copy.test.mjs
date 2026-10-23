// The draft's required-field copy (Spec 48 FR-48-57): read from the component's script by lib/fill-form-schema.mjs::requiredCopyOf,
// written as `msgRequired` / `msgTooLong` by lib/fill-form.mjs::formFieldWrites and checked by formReadback. A field the draft gives
// no copy writes nothing. Each test fails against the code before this change (the exports and writes did not exist).
import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredCopyOf, copyFor } from '../lib/fill-form-schema.mjs';
import { formFieldWrites, formReadback, componentOf, formSources } from '../lib/fill-form.mjs';
import { openDb } from '../lib/db.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PER_FIELD = `submit = (e) => {
    if (!v.name) errs.name = 'Please enter your name';
    if (!v.email || !/^[^@\s]+@[^@\s]+$/.test(v.email)) errs.email = 'Enter a valid email address';
    if (v.bio && v.bio.length > 300) errs.bio = "Keep it under 300 characters";
    if (v.age < 18) errs.age = 'Too young';
};`;
const SHARED = `validate() {
      if (f.req && empty) errs[f.name] = f.type === 'chips' ? 'Please choose at least one option' : f.type === 'check' ? 'Please confirm to continue' : 'This field is required';
      else if (!empty && f.rx && !f.rx.test(String(val).trim())) errs[f.name] = f.rxMsg;
}`;
const db = openDb();

test( 'a per-field line gives the copy shown for an empty field; a guard without the empty test gives none', () => {
	const c = requiredCopyOf( PER_FIELD );
	assert.equal( c.fields.name.required, 'Please enter your name' );
	assert.equal( c.fields.email.required, 'Enter a valid email address' );
	assert.equal( c.fields.age, undefined, 'a guard without the empty test names no required copy' );
	assert.equal( c.byType, null );
} );

test( 'a length guard gives the too-long copy, not the required copy', () => {
	const c = requiredCopyOf( PER_FIELD );
	assert.equal( c.fields.bio.tooLong, 'Keep it under 300 characters' );
	assert.equal( c.fields.bio.required, undefined );
} );

test( 'the shared line gives one copy per field type and the last string for the rest', () => {
	const c = requiredCopyOf( SHARED );
	assert.deepEqual( c.byType, { chips: 'Please choose at least one option', check: 'Please confirm to continue', '': 'This field is required' } );
	assert.deepEqual( copyFor( c, [ 'ta-postcode' ], { name: 'postcode', req: true } ), { required: 'This field is required' } );
	assert.deepEqual( copyFor( c, [ 'x' ], { name: 'x', type: 'chips', req: true } ), { required: 'Please choose at least one option' } );
	assert.deepEqual( copyFor( c, [ 'x' ], { name: 'x', type: 'chips' } ), {}, 'a field the draft does not require gets no copy' );
	assert.deepEqual( copyFor( c, [ 'x' ], { name: 'x', type: 'chips', req: false } ), {} );
} );

test( 'a script with no validation copy, or a control it does not name, gives nothing', () => {
	assert.deepEqual( requiredCopyOf( '<input required="{{ true }}">' ), { fields: {}, byType: null } );
	assert.deepEqual( copyFor( requiredCopyOf( PER_FIELD ), [ 'enq-phone' ], null ), {} );
	assert.deepEqual( copyFor( requiredCopyOf( PER_FIELD ), [ 'enq-name' ], null ), { required: 'Please enter your name' } );
} );

test( 'formFieldWrites writes msgRequired and msgTooLong where the block holds them, and nothing where the draft has no copy', () => {
	const el = { tag: 'input', type: 'text' };
	const w = formFieldWrites( { db, block: 'sgs/form-field-text', el, copy: { required: 'Please enter your name', tooLong: 'Too long' } } );
	assert.deepEqual( w.writes.filter( ( x ) => /^msg/.test( x.attr ) ).map( ( x ) => [ x.attr, x.value ] ), [ [ 'msgRequired', 'Please enter your name' ], [ 'msgTooLong', 'Too long' ] ] );
	assert.deepEqual( formFieldWrites( { db, block: 'sgs/form-field-text', el, copy: {} } ).writes, [] );
	const none = formFieldWrites( { db, block: 'sgs/form-field-tiles', el, copy: { required: 'Pick one' } } );
	assert.equal( none.unmapped.length, 1, 'a block with no msgRequired setting is a named gap, never a dropped fact' );
} );

test( 'the read-back flags a msgRequired that is not the draft copy', () => {
	const writes = [ { attr: 'msgRequired', value: 'Invented' } ];
	assert.equal( formReadback( { writes, el: {}, copy: { required: 'Please enter your name' } } ).length, 1 );
	assert.equal( formReadback( { writes: [ { attr: 'msgRequired', value: 'Please enter your name' } ], el: {}, copy: { required: 'Please enter your name' } } ).length, 0 );
} );

test( 'componentOf names the innermost candidate import in a tpl finder chain', () => {
	const t = ( tpl ) => ( { finder: { tpl } } );
	assert.equal( componentOf( t( 'Root>EnquiryForm@5#0/26#0' ), [ 'EnquiryForm', 'Root' ] ), 'EnquiryForm' );
	assert.equal( componentOf( t( 'Root/26#0' ), [ 'EnquiryForm', 'Root' ] ), 'Root' );
	assert.equal( componentOf( { finder: 'form input' }, [ 'EnquiryForm' ] ), null );
} );

test( 'formSources reads every component whose script carries required copy', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'form-copy-' ) );
	fs.writeFileSync( path.join( dir, 'A.dc.html' ), PER_FIELD );
	fs.writeFileSync( path.join( dir, 'B.dc.html' ), '<div></div>' );
	assert.deepEqual( Object.keys( formSources( dir, null ) ), [ 'A' ] );
} );
