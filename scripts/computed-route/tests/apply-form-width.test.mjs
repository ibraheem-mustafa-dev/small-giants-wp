// RF7: the form's field widths pair the draft's and the live form's fields by name among those each shows at rest, so a
// conditional field one form hides (the draft's "Companies House" until its condition holds) takes no place in the pairing
// (lib/apply-form-width.mjs::pairedFields, ::fieldWidths). The probe records carry the keys lib/apply-probes.mjs::fieldsOf writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldWidths, pairedFields } from '../lib/apply-form-width.mjs';

const column = { ref: null, cellW: 300, gridW: 640, cols: 2, form: false };
const span = { ref: null, cellW: 640, gridW: 640, cols: 2, form: false };
const field = ( name, layout, extra = {} ) => ( { name, layout, shown: true, honeypot: false, field: {}, label: null, type: 'text', ...extra } );
const live = ( name, ref, extra = {} ) => field( name, { ref, cellW: 640, gridW: 640, cols: 0, form: false }, extra );
const all = { blocks: { 'cr-ref-a': { block: 'sgs/form-field-text', attrs: {} }, 'cr-ref-b': { block: 'sgs/form-field-text', attrs: {} }, 'cr-ref-c': { block: 'sgs/form-field-text', attrs: {} } } };
const db = { prepare: () => ( { get: () => ( { attr_name: 'width' } ), all: () => [ { attr_name: 'width' } ] } ) };

// The draft shows two fields (its third, a conditional one, is hidden at rest); the live form shows all three.
const draft = { 1440: { probes: { fields: [ field( 'first', column ), field( 'second', column ), field( 'company', column, { shown: false } ) ] } } };
const liveForm = { 1440: { probes: { fields: [ live( 'first', 'cr-ref-a' ), live( 'second', 'cr-ref-b' ), live( 'company', 'cr-ref-c' ) ] } } };

test( 'MUST FAIL: a field only the live form shows pairs with nothing, the others pair by name', () => {
	const { pairs } = pairedFields( draft[ 1440 ].probes.fields, liveForm[ 1440 ].probes.fields );
	assert.deepEqual( pairs.map( ( [ d, l ] ) => [ d.name, l.name ] ), [ [ 'first', 'first' ], [ 'second', 'second' ] ] );
} );

test( 'MUST FAIL: the widths are written on the paired fields, none on the conditional one', () => {
	const items = fieldWidths( { draft, live: liveForm, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => [ i.ref, i.status ] ), [ [ 'cr-ref-a', 'op' ], [ 'cr-ref-b', 'op' ] ] );
} );

test( 'a reordered live form still pairs by name', () => {
	const swapped = { 1440: { probes: { fields: [ live( 'second', 'cr-ref-b' ), live( 'first', 'cr-ref-a' ) ] } } };
	const items = fieldWidths( { draft: { 1440: { probes: { fields: [ field( 'first', column ), field( 'second', span ) ] } } }, live: swapped, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => i.ref ), [ 'cr-ref-a' ] );
} );

test( 'negative control: no names on the draft side pairs by position, and unequal counts pair nothing', () => {
	const bare = ( f ) => ( { ...f, name: '' } );
	const same = fieldWidths( { draft: { 1440: { probes: { fields: [ bare( field( 'x', column ) ), bare( field( 'y', column ) ) ] } } }, live: { 1440: { probes: { fields: [ live( 'x', 'cr-ref-a' ), live( 'y', 'cr-ref-b' ) ] } } }, block: 'sgs/form', all, db } );
	assert.deepEqual( same.map( ( i ) => i.ref ), [ 'cr-ref-a', 'cr-ref-b' ] );
	const uneven = fieldWidths( { draft: { 1440: { probes: { fields: [ bare( field( 'x', column ) ) ] } } }, live: { 1440: { probes: { fields: [ live( 'x', 'cr-ref-a' ), live( 'y', 'cr-ref-b' ) ] } } }, block: 'sgs/form', all, db } );
	assert.equal( uneven[ 0 ].status, 'no-setting' );
} );
