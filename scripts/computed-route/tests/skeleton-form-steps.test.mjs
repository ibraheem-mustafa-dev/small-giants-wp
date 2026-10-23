// The multi-step form in the skeleton (Spec 48 FR-48-57; lib/skeleton-form-steps.mjs::formStepNodes). A planted fact record holds a
// three-step schema (two with fields, a review) and the rendered form's field nodes sit in wrappers; the proposal is
// sgs/form > sgs/form-step x2 + sgs/form-review, labels from the draft, the rendered fields in step one. Each test fails
// against a skeleton the function leaves alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { formStepNodes } from '../lib/skeleton-form-steps.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { openDb } from '../lib/db.mjs';
import { lintSkeleton } from '../lint.mjs';

const SCHEMA = [
	{ key: 'a', label: 'Your business', fields: [ { name: 'tradingName' }, { name: 'email' } ] },
	{ key: 'b', label: 'How you order', fields: [ { name: 'frequency' } ] },
	{ key: 'review', label: 'Review', fields: [] },
];
const FACTS = { logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 3, value: SCHEMA } ] } } } };
const field = ( ref ) => ( { name: 'sgs/form-field-text', draftRef: ref, attributes: {}, innerBlocks: [] } );
const tree = () => [ { name: 'sgs/form', attributes: {}, innerBlocks: [
	{ name: 'sgs/heading', attributes: {}, innerBlocks: [] },
	{ name: 'sgs/container', attributes: {}, innerBlocks: [ field( '#a' ), field( '#b' ) ] },
	{ name: 'sgs/button', attributes: {}, innerBlocks: [] },
] } ];

test( 'a multi-step schema becomes steps and a review under the form, labels from the draft', () => {
	const [ form ] = formStepNodes( tree(), { factRecord: FACTS, surfaceKind: 'form' } );
	assert.deepEqual( form.innerBlocks.map( ( n ) => n.name ), [ 'sgs/heading', 'sgs/form-step', 'sgs/form-step', 'sgs/form-review', 'sgs/button' ] );
	assert.deepEqual( form.innerBlocks.filter( ( n ) => 'sgs/form-step' === n.name ).map( ( n ) => n.attributes.label ), [ 'Your business', 'How you order' ] );
} );

test( 'the rendered fields move into step one in order; the emptied wrapper is dropped; later steps hold none', () => {
	const [ form ] = formStepNodes( tree(), { factRecord: FACTS, surfaceKind: 'form' } );
	const [ one, two ] = form.innerBlocks.filter( ( n ) => 'sgs/form-step' === n.name );
	assert.deepEqual( one.innerBlocks.map( ( n ) => n.draftRef ), [ '#a', '#b' ] );
	assert.deepEqual( two.innerBlocks, [] );
	assert.equal( form.innerBlocks.some( ( n ) => 'sgs/container' === n.name ), false );
} );

test( 'a form node is made when the root is not one', () => {
	const out = formStepNodes( [ { name: 'sgs/container', attributes: {}, innerBlocks: [ field( '#a' ) ] } ], { factRecord: FACTS, surfaceKind: 'form' } );
	assert.equal( out[ 0 ].name, 'sgs/form' );
	assert.deepEqual( out[ 0 ].innerBlocks.map( ( n ) => n.name ), [ 'sgs/form-step', 'sgs/form-step', 'sgs/form-review' ] );
} );

test( 'nothing changes for a single-step schema, a non-form surface, no schema, or a form that already has steps', () => {
	const one = { logic: { statics: { A: { entries: [ { name: 's', kind: 'array', value: [ SCHEMA[ 0 ] ] } ] } } } };
	for ( const args of [ { factRecord: one, surfaceKind: 'form' }, { factRecord: FACTS, surfaceKind: 'page' }, { factRecord: null, surfaceKind: 'form' } ] ) {
		assert.equal( JSON.stringify( formStepNodes( tree(), args ) ), JSON.stringify( tree() ) );
	}
	const stepped = [ { name: 'sgs/form', attributes: {}, innerBlocks: [ { name: 'sgs/form-step', attributes: {}, innerBlocks: [ field( '#a' ) ] } ] } ];
	assert.equal( JSON.stringify( formStepNodes( structuredClone( stepped ), { factRecord: FACTS, surfaceKind: 'form' } ) ), JSON.stringify( stepped ) );
} );

test( 'the proposed tree passes the skeleton model checks', () => {
	const out = formStepNodes( tree(), { factRecord: FACTS, surfaceKind: 'form' } );
	assert.deepEqual( skeletonProblems( out ), [] );
	assert.deepEqual( lintSkeleton( out, openDb() ).filter( ( p ) => /form-step|form-review/.test( JSON.stringify( p ) ) ), [] );
} );
