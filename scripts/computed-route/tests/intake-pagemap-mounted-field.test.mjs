// Spec 48 FR-48-30 with Spec 48A FR-48A-17 (a field built once as a component and mounted): a component a parent mounts
// inside its own <form> is a part of that form, never a form of its own (lib/intake-pagemap-surfaces.mjs::codeSurfaces,
// `inParentForm`). Fixture tests/fixtures/mounted-field-form: Page.dc.html mounts Field.dc.html (a label holding an input
// or a textarea, each in its own sc-if) twice inside its <form>, and mounts Newsletter.dc.html (two inputs and a button,
// no <form>) outside any form. Mutations: tests/fixtures/mounted-field-form/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'mounted-field-form' );
const forms = () => proposePageMap( { folder: FIX } ).rows.filter( ( r ) => 'sgs_form' === r.postType ).map( ( r ) => r.slug );

test( 'MUST FAIL: a field component mounted inside a parent form makes no form row of its own', () => {
	assert.ok( ! forms().includes( 'form-field' ), forms().join( ', ' ) );
} );

test( 'negative control: the parent\'s own form and a component of fields mounted outside any form are still forms', () => {
	assert.deepEqual( forms(), [ 'form-newsletter', 'form-send' ] );
} );
