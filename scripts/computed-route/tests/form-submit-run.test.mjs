// The pure parts of the live form submission check (lib/form-submit-run.mjs). Each fails against a stub that returns a constant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { formSettingsOf, formFieldsOf, testValueFor, successVerdict, originalRecipient, targetSite } from '../lib/form-submit-run.mjs';

const CONTENT = `<!-- wp:sgs/form {"formId":"enquiry","successMessage":"Thanks, we will reply soon.","notifyEmail":"sales@example.test"} -->
<!-- wp:sgs/form-field-text {"label":"Name","required":true,"msgRequired":"Please enter your name"} /-->
<!-- wp:sgs/form-field-email {"label":"Email"} /-->
<!-- wp:sgs/form-field-textarea {"label":"Message","required":true} /-->
<!-- /wp:sgs/form -->`;

test( 'form settings and fields are read from the post content', () => {
	assert.deepEqual( formSettingsOf( CONTENT ), { successMessage: 'Thanks, we will reply soon.', successRedirect: '', notifyEmail: 'sales@example.test' } );
	assert.deepEqual( formFieldsOf( CONTENT ).map( ( f ) => [ f.block, f.required, f.msgRequired ] ), [
		[ 'sgs/form-field-text', true, 'Please enter your name' ], [ 'sgs/form-field-email', false, '' ], [ 'sgs/form-field-textarea', true, '' ],
	] );
	assert.equal( formSettingsOf( '<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->' ), null );
	assert.deepEqual( formFieldsOf( '' ), [] );
} );

test( 'a control gets a valid value for its type, and a file or hidden control none', () => {
	assert.equal( testValueFor( { tag: 'input', type: 'email' } ), 'form-check@example.test' );
	assert.equal( testValueFor( { tag: 'input', type: 'tel' } ), '07700900123' );
	assert.equal( testValueFor( { tag: 'input', type: 'number', min: '5' } ), '5' );
	assert.equal( testValueFor( { tag: 'input', type: 'number', min: '' } ), '1' );
	assert.equal( testValueFor( { tag: 'select', options: [ '', 'a', 'b' ] } ), 'a' );
	assert.equal( testValueFor( { tag: 'input', type: 'checkbox' } ), 'check' );
	assert.equal( testValueFor( { tag: 'input', type: 'file' } ), null );
	assert.equal( testValueFor( { tag: 'input', type: 'text' } ), 'Form check' );
} );

test( 'the success verdict follows the redirect when there is one, else the message', () => {
	assert.equal( successVerdict( { settings: { successRedirect: '/thanks/' }, finalUrl: 'https://s.test/thanks', successText: '' } ).ok, true );
	assert.equal( successVerdict( { settings: { successRedirect: '/thanks/' }, finalUrl: 'https://s.test/enquiry/', successText: 'Thanks' } ).ok, false );
	assert.equal( successVerdict( { settings: { successMessage: 'Thanks' }, finalUrl: '', successText: ' Thanks ' } ).ok, true );
	assert.equal( successVerdict( { settings: { successMessage: 'Thanks' }, finalUrl: '', successText: 'Other' } ).ok, false );
	assert.equal( successVerdict( { settings: {}, finalUrl: '', successText: '' } ).ok, false );
	assert.equal( successVerdict( { settings: {}, finalUrl: '', successText: 'Thank you!' } ).ok, true );
} );

test( 'the original recipient comes from the test redirect subject, else the mail to', () => {
	assert.equal( originalRecipient( { subject: '[test site, to: Sales@Example.test] New enquiry', to: 'bean@inbox.test' } ), 'sales@example.test' );
	assert.equal( originalRecipient( { subject: 'New enquiry', to: 'a@b.test' } ), 'a@b.test' );
	assert.equal( originalRecipient( { subject: '[test site, to: a@b.test, c@d.test] x', to: 'z@z.test' } ), 'a@b.test' );
} );

test( 'a target resolves to its site folder from the TARGETS text', () => {
	const py = `TARGETS = {\n    "indus-test": {\n        "host": "h.example.com",\n        "wp_content": "domains/h.example.com/public_html/wp-content",\n        "client": "x",\n    },\n}`;
	assert.deepEqual( targetSite( py, 'indus-test' ), { host: 'h.example.com', root: 'domains/h.example.com/public_html' } );
	assert.equal( targetSite( py, 'nope' ), null );
} );
