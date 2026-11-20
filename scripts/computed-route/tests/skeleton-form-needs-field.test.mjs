// The form rule needs a real field (Spec 48 FR-48-57; re-applies 9200e3008's rule): a form block stands only on a <form>
// element, or a form surface's root, that is or holds something a visitor fills in (an input of a type that takes an entry,
// a select, a textarea, a pressed-state option or a radio, checkbox or option role). A <form> or a form record's root holding
// only a button, a link or a hidden input is that control, never a form with nothing to fill in. Synthetic inventories and
// fact records (tests/fixtures/choice-flow-fixture.mjs). Tests marked MUST FAIL fail on the skeleton writer before the rule;
// each carries its negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, R0, build, db, facts, names } from './fixtures/choice-flow-fixture.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const run = ( list, kind = 'form' ) => {
	const b = build( list, { ids: { 'S-09': { kind, name: 'The form', root: list[ 0 ].n } } } );
	return proposeSkeleton( { inventory: b.inventory, facts: facts(), surface: 'the-form', surfaceKind: kind, surfaceName: 'The form', db, factRecord: b.record, openers: {}, pageMap: [], surfaceId: 'S-09' } );
};
const hasForm = ( r ) => names( r.skeleton ).includes( 'sgs/form' );
const FORM_TAG = ( ...kids ) => [ E( 1, 'form', null, { rendered: R0 } ), ...kids.map( ( k, i ) => ( { ...k, n: 2 + i, parent: 1 } ) ) ];
const SUBMIT = E( 0, 'button', 1, { attrs: { type: 'submit' }, words: 'Go', rendered: R0 } );

test( 'MUST FAIL: a <form> holding only its submit button is that button, never a form block', () => {
	const r = run( FORM_TAG( SUBMIT ), 'modal' );
	assert.ok( ! hasForm( r ), 'a <form> with nothing to fill in' );
	assert.notEqual( r.proposal.rows[ 0 ].rule, 'formHost' );
	assert.ok( names( r.skeleton ).includes( 'sgs/button' ), 'the button is still built' );
} );

test( 'MUST FAIL: a <form> holding a button and a hidden input has nothing to fill in', () => {
	const r = run( FORM_TAG( E( 0, 'input', 1, { attrs: { type: 'hidden', name: 'token' }, rendered: R0 } ), SUBMIT ), 'modal' );
	assert.ok( ! hasForm( r ) );
} );

test( 'MUST FAIL: a form surface whose root is a lone link or button is that control', () => {
	const link = run( [ E( 1, 'a', null, { attrs: { href: '#results' }, words: 'Show 4 gifts', rendered: R0 } ) ] );
	assert.ok( ! hasForm( link ), 'a link the form record names leads elsewhere' );
	assert.notEqual( link.proposal.rows[ 0 ].rule, 'formHost' );
	const button = run( [ E( 1, 'button', null, { words: 'Add to basket', click: 'add', rendered: R0 } ) ] );
	assert.ok( ! hasForm( button ) );
	assert.notEqual( button.proposal.rows[ 0 ].rule, 'formHost' );
} );

test( 'negative controls: a root or <form> holding a field, a lone field and a field in a group are the form block', () => {
	const card = run( [ E( 1, 'div', null, { rendered: R0 } ), E( 2, 'label', 1, { words: 'Email', rendered: R0 } ), E( 3, 'input', 1, { attrs: { type: 'email' }, rendered: R0 } ), E( 4, 'button', 1, { attrs: { type: 'submit' }, words: 'Send', rendered: R0 } ) ] );
	assert.equal( card.skeleton[ 0 ].name, 'sgs/form', 'a card holding a field' );
	assert.equal( run( [ E( 1, 'input', null, { attrs: { type: 'search' }, rendered: R0 } ) ] ).skeleton[ 0 ].name, 'sgs/form', 'a lone field' );
	assert.equal( run( FORM_TAG( E( 0, 'input', 1, { attrs: { type: 'text' }, rendered: R0 } ), SUBMIT ), 'modal' ).skeleton[ 0 ].name, 'sgs/form', 'a <form> with a field' );
	assert.equal( run( FORM_TAG( E( 0, 'select', 1, { rendered: R0 } ), SUBMIT ), 'modal' ).skeleton[ 0 ].name, 'sgs/form', 'a <form> with a select' );
	assert.equal( run( FORM_TAG( E( 0, 'textarea', 1, { rendered: R0 } ), SUBMIT ), 'modal' ).skeleton[ 0 ].name, 'sgs/form', 'a <form> with a textarea' );
	const chips = run( FORM_TAG( E( 0, 'div', 1, { rendered: R0 } ) ).concat( [ E( 5, 'button', 2, { pressed: true, words: 'A', rendered: R0 } ), E( 6, 'button', 2, { pressed: false, words: 'B', rendered: R0 } ) ] ), 'modal' );
	assert.equal( chips.skeleton[ 0 ].name, 'sgs/form', 'a <form> holding pressed-state options' );
	// A lone pressed-state button, a radio or checkbox role, and a chip group read by aria-checked are fields too.
	assert.equal( run( FORM_TAG( E( 0, 'button', 1, { pressed: false, words: 'Subscribe', rendered: R0 } ) ), 'modal' ).skeleton[ 0 ].name, 'sgs/form', 'a lone pressed-state button' );
	assert.equal( run( FORM_TAG( E( 0, 'div', 1, { attrs: { role: 'checkbox' }, words: 'Agree', rendered: R0 } ) ), 'modal' ).skeleton[ 0 ].name, 'sgs/form', 'a checkbox role' );
	const checked = run( FORM_TAG( E( 0, 'div', 1, { rendered: R0 } ) ).concat( [ E( 5, 'button', 2, { attrs: { 'aria-checked': 'true' }, words: 'A', rendered: R0 } ), E( 6, 'button', 2, { attrs: { 'aria-checked': 'false' }, words: 'B', rendered: R0 } ) ] ), 'modal' );
	assert.equal( checked.skeleton[ 0 ].name, 'sgs/form', 'chips read by aria-checked' );
} );
