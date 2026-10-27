// The multi-step form in the skeleton (Spec 48 FR-48-57; lib/skeleton-form-steps.mjs::formStepNodes,
// lib/skeleton-form-step-parts.mjs). A planted fact record holds a schema of three steps (two with fields, a review) and the
// rendered form shows the first step only, as a draft's step state does: its fields, a heading bound to the current step's
// record, the draft's step list, step count and Continue button. The proposal is sgs/form > sgs/form-step x2 + sgs/form-review,
// each step holding its schema fields (the rendered ones where the page drew them, the rest built from the schema by type),
// the bound heading in every step, and the step list, count and Continue absorbed (the form block draws them). The rules
// are the standing ones (data/skeleton-decisions.json) and the attribute checks the framework DB's.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { formStepNodes } from '../lib/skeleton-form-steps.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { lintSkeleton } from '../lint.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const FACTS = loadFacts( { db, client: 'fixture-client', repo: REPO } );
const RULES = FACTS.decisions.rules;
const has = ( b, a ) => !! FACTS.attr( b, a );

const SCHEMA = () => [
	{ key: 'a', label: 'Your business', title: 'About you', note: 'Note A', fields: [
		{ name: 'kind', label: 'Kind', type: 'chips', req: true, options: [ 'Shop', 'Cafe' ] },
		{ name: 'tradingName', label: 'Trading name', req: true },
		{ name: 'companyNo', label: 'Company number', show: false, req: false },
		{ name: 'email', label: 'Email', type: 'email', hint: 'We reply here.' },
	] },
	{ key: 'b', label: 'How you order', title: 'Ordering', note: 'Note B', fields: [
		{ name: 'notes', label: 'Notes', type: 'textarea', hint: 'Anything else' },
		{ name: 'when', label: 'When', type: 'select', req: true, options: [ 'Weekly', 'Monthly' ] },
		{ name: 'extraHead', label: 'Credit details', type: 'heading', show: false },
		{ name: 'okay', type: 'check', req: true, text: 'I agree to a credit check' },
		{ name: 'same', type: 'check', text: 'Deliver here' },
		{ name: 'stars', label: 'Stars', type: 'rating' },
	] },
	{ key: 'review', label: 'Review', title: 'Check it', fields: [] },
];
const RECORD = ( steps = SCHEMA() ) => ( { logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: steps.length, value: steps } ] } } } } );

// Nodes, each carrying `d` (what draftOf answers for it: its chips, holes, loop and handlers).
const nd = ( name, attributes = {}, innerBlocks = [], d = null, ref = null ) => ( { name, attributes, innerBlocks, ...( ref ? { draftRef: { tpl: ref } } : {} ), ...( d ? { d } : {} ) } );
const text = ( t, d ) => nd( 'sgs/text', { text: t }, [], d );
const tree = () => [ nd( 'sgs/form', {}, [
	text( 'Welcome' ),
	nd( 'sgs/container', {}, [
		nd( 'sgs/container', {}, [
			nd( 'sgs/label', { text: 'Step 1 of 3' } ),
			text( 'Saves as you go' ),
			nd( 'sgs/container', {}, [ text( '1' ), text( 'Your business', { holes: [ { where: 'text', path: 'st.label' } ], inLoop: true } ), text( '2' ), text( 'How you order', { inLoop: true } ), text( '3' ), text( 'Review', { inLoop: true } ) ] ),
		] ),
		nd( 'sgs/heading', { content: 'About you' }, [], { holes: [ { where: 'text', path: 'cur.title' } ] }, 'Root/23#0' ),
		nd( 'sgs/container', {}, [
			nd( 'sgs/form-field-tiles', {}, [], { chips: [ 'Shop', 'Cafe' ] }, 'Root/47#0' ),
			nd( 'sgs/form-field-text', { label: 'Trading name' }, [], null, 'Root/39#0' ),
			nd( 'sgs/form-field-email', { label: 'Email' }, [], null, 'Root/39#1' ),
			nd( 'sgs/form-field-text', { label: 'Promo code' }, [], null, 'Root/39#2' ),
			nd( 'sgs/form-field-text', { label: 'Trading name' }, [], null, 'Root/39#3' ),
			nd( 'sgs/form-field-tiles', {}, [], { chips: [ 'Red', 'Blue' ] }, 'Root/47#1' ),
			nd( 'sgs/form-field-text', { label: 'Credit details' }, [], null, 'Root/39#4' ),
		] ),
		nd( 'sgs/text', { text: 'Note A' }, [], { holes: [ { where: 'text', path: 'cur.note' } ] }, 'Root/70#0' ),
		nd( 'sgs/container', {}, [ text( 'Takes 5 minutes' ), nd( 'sgs/button', { label: 'Continue' }, [], { handlers: [ 'next' ] } ) ] ),
	] ),
	nd( 'sgs/button', { label: 'Call us' } ),
] ) ];
const run = ( t = tree(), o = {} ) => {
	const absorbed = [];
	const notes = [];
	const out = formStepNodes( t, { factRecord: o.record || RECORD(), surfaceKind: 'form', rules: o.rules || RULES, has, draftOf: ( n ) => n.d || null, absorb: ( n, reason, role ) => absorbed.push( { n, reason, role } ), note: ( x ) => notes.push( x ) } );
	return { out, form: out[ 0 ], steps: out[ 0 ].innerBlocks.filter( ( n ) => 'sgs/form-step' === n.name ), absorbed, notes };
};
const names = ( list ) => list.map( ( n ) => n.name );
const all = ( list, out = [] ) => {
	list.forEach( ( n ) => {
		out.push( n );
		all( n.innerBlocks || [], out );
	} );
	return out;
};

test( 'a multi-step schema becomes steps and a review under the form, labels from the draft, before what follows the form', () => {
	const { form, steps } = run();
	assert.deepEqual( names( form.innerBlocks ).slice( 0, 4 ), [ 'sgs/text', 'sgs/form-step', 'sgs/form-step', 'sgs/form-review' ], 'the steps go where the first field sat, after what came before it' );
	assert.deepEqual( steps.map( ( n ) => n.attributes.label ), [ 'Your business', 'How you order' ] );
	assert.equal( form.innerBlocks.at( -1 ).attributes.label, 'Call us', 'what follows the form stays after the steps' );
	const outside = all( form.innerBlocks.filter( ( n ) => 'sgs/form-step' !== n.name ) );
	assert.ok( ! outside.some( ( n ) => 'sgs/container' === n.name && ! n.innerBlocks.length ), 'a wrapper the move empties goes' );
} );

test( 'MUST FAIL: every step holds its schema fields in schema order, the rendered ones where the page drew them and the rest built from the schema', () => {
	const { steps } = run();
	const [ one, two ] = steps;
	const fields = ( s ) => s.innerBlocks.filter( ( n ) => /^sgs\/form-field-/.test( n.name ) );
	// Step one: the unclaimed rendered fields first (a second field of a claimed label, choices no field offers, the label of a
	// heading), then the schema order; the conditional field the page never drew is built.
	assert.deepEqual( fields( one ).map( ( n ) => n.draftRef?.tpl ?? n.attributes.fieldName ), [ 'Root/39#2', 'Root/39#3', 'Root/47#1', 'Root/39#4', 'Root/47#0', 'Root/39#0', 'companyNo', 'Root/39#1' ] );
	assert.deepEqual( fields( one ).find( ( n ) => 'companyNo' === n.attributes.fieldName ), { name: 'sgs/form-field-text', attributes: { label: 'Company number', fieldName: 'companyNo' }, innerBlocks: [] } );
	// Step two: built by type through rules.formControl and rules.formSteps.schemaTypes.
	assert.deepEqual( two.innerBlocks.filter( ( n ) => ! n.draftRef ).map( ( n ) => [ n.name, n.attributes ] ), [
		[ 'sgs/form-field-textarea', { label: 'Notes', helpText: 'Anything else', fieldName: 'notes' } ],
		[ 'sgs/form-field-select', { label: 'When', required: true, fieldName: 'when' } ],
		[ 'sgs/heading', { content: 'Credit details' } ],
		[ 'sgs/form-field-consent', { consentText: 'I agree to a credit check', required: true, fieldName: 'okay' } ],
		[ 'sgs/form-field-checkbox', { options: [ { value: 'Deliver here', label: 'Deliver here' } ], fieldName: 'same' } ],
	] );
	assert.ok( ! all( two.innerBlocks ).some( ( n ) => n.draftRef && /^sgs\/form-field-/.test( n.name ) ), 'a built field reads no draft element' );
} );

test( 'a schema field whose type no rule names is a note, never a guessed block; a heading the draft shows only on a condition is a note', () => {
	const { steps, notes } = run();
	assert.ok( ! all( steps[ 1 ].innerBlocks ).some( ( n ) => 'stars' === n.attributes.fieldName ) );
	assert.ok( notes.some( ( x ) => /^How you order: .*"stars" is a rating field/.test( x ) ), notes.join( '\n' ) );
	assert.ok( notes.some( ( x ) => /"Credit details" only while another field has a value; sgs\/heading holds no condition/.test( x ) ), notes.join( '\n' ) );
	const plain = SCHEMA();
	plain[ 1 ].fields = plain[ 1 ].fields.filter( ( f ) => ! [ 'stars', 'extraHead' ].includes( f.name ) );
	assert.deepEqual( run( tree(), { record: RECORD( plain ) } ).notes, [], 'NEGATIVE: a schema every rule covers leaves no note' );
} );

test( 'MUST FAIL: a rendered element bound to the current step record leads every step, with that step\'s value and the same draft element', () => {
	const { steps, form } = run();
	assert.deepEqual( steps.map( ( s ) => [ s.innerBlocks[ 0 ].name, s.innerBlocks[ 0 ].attributes.content, s.innerBlocks[ 0 ].draftRef?.tpl ] ), [ [ 'sgs/heading', 'About you', 'Root/23#0' ], [ 'sgs/heading', 'Ordering', 'Root/23#0' ] ] );
	assert.ok( ! all( form.innerBlocks.filter( ( n ) => 'sgs/form-step' !== n.name ) ).some( ( n ) => 'About you' === n.attributes.content ), 'it no longer sits outside the steps' );
	assert.notEqual( steps[ 0 ].innerBlocks[ 0 ], steps[ 1 ].innerBlocks[ 0 ], 'each step holds its own copy' );
	assert.deepEqual( steps.map( ( s ) => [ s.innerBlocks.at( -1 ).attributes.text, s.innerBlocks.at( -1 ).draftRef?.tpl ] ), [ [ 'Note A', 'Root/70#0' ], [ 'Note B', 'Root/70#0' ] ], 'bound content after the fields follows them' );
} );

test( 'NEGATIVE bound content: an element in a loop, one bound to no step key, one whose words are not the first step\'s, and a key a step lacks stay where they are', () => {
	const t = tree();
	const holder = t[ 0 ].innerBlocks[ 1 ];
	holder.innerBlocks.push( text( 'About you', { holes: [ { where: 'text', path: 'cur.title' } ], inLoop: true } ) );
	holder.innerBlocks.push( text( 'Shown now', { holes: [ { where: 'text', path: 'savedLabel' } ] } ) );
	holder.innerBlocks.push( text( 'Other words', { holes: [ { where: 'text', path: 'cur.title' } ] } ) );
	holder.innerBlocks.push( text( 'Your business', { holes: [ { where: 'style:color', path: 'cur.label' } ] } ) );
	const s = SCHEMA();
	s[ 0 ].intro = 'Hello';
	holder.innerBlocks.push( text( 'Hello', { holes: [ { where: 'text', path: 'cur.intro' } ] } ) );
	const { form } = run( t, { record: RECORD( s ) } );
	const left = all( form.innerBlocks.filter( ( n ) => 'sgs/form-step' !== n.name ) ).map( ( n ) => n.attributes.text ).filter( Boolean );
	for ( const w of [ 'About you', 'Shown now', 'Other words', 'Your business', 'Hello' ] ) {
		assert.ok( left.includes( w ), `${ w } stays outside the steps (${ left.join( ', ' ) })` );
	}
} );

test( 'MUST FAIL: the draft\'s step list, step count and Continue button are absorbed with their reasons; the words beside them stay', () => {
	const { form, absorbed } = run();
	const outside = all( form.innerBlocks.filter( ( n ) => 'sgs/form-step' !== n.name ) );
	assert.ok( ! outside.some( ( n ) => [ 'Step 1 of 3', 'How you order', 'Review' ].includes( n.attributes.text ) || 'Continue' === n.attributes.label ), JSON.stringify( outside.map( ( n ) => n.attributes ) ) );
	assert.deepEqual( [ ...new Set( absorbed.map( ( a ) => a.role ) ) ].sort(), [ 'count', 'indicator', 'next' ] );
	assert.equal( absorbed.filter( ( a ) => 'indicator' === a.role ).length, 7, 'the list and each node inside it' );
	assert.ok( absorbed.every( ( a ) => a.reason === RULES.formSteps.reasons[ a.role ] ) );
	assert.ok( outside.some( ( n ) => 'Saves as you go' === n.attributes.text ) && outside.some( ( n ) => 'Takes 5 minutes' === n.attributes.text ), 'other words stay' );
} );

test( 'a Back button is found by its words or its handler; Next by its handler alone', () => {
	const t = tree();
	const bar = t[ 0 ].innerBlocks[ 1 ].innerBlocks.at( -1 );
	bar.innerBlocks.push( nd( 'sgs/button', { label: 'Previous' } ), nd( 'sgs/button', { label: '' }, [], { handlers: [ 'back' ] } ), nd( 'sgs/button', { label: 'Go' }, [], { handlers: [ 'next' ] } ) );
	const { absorbed } = run( t );
	assert.deepEqual( absorbed.filter( ( a ) => /next|back/.test( a.role ) ).map( ( a ) => a.role ), [ 'next', 'back', 'back', 'next' ] );
} );

test( 'NEGATIVE chrome: a count of another total, a button that leaves the form, a list missing a step, a step list holding a field and the rule removed are not the form\'s navigation', () => {
	const t = tree();
	const holder = t[ 0 ].innerBlocks[ 1 ];
	holder.innerBlocks.push( nd( 'sgs/label', { text: 'Page 1 of 4' } ), nd( 'sgs/button', { label: 'Continue shopping' }, [], { handlers: [ 'goShop' ] } ), nd( 'sgs/container', {}, [ text( 'Your business' ), text( 'Review' ) ] ), text( 'Back', { handlers: [ 'back' ] } ) );
	holder.innerBlocks.push( nd( 'sgs/container', {}, [ text( 'Your business' ), text( 'How you order' ), text( 'Review' ), nd( 'sgs/form-field-text', { label: 'Inside' } ) ] ) );
	const { form, absorbed } = run( t );
	const outside = all( form.innerBlocks.filter( ( n ) => 'sgs/form-step' !== n.name ) );
	assert.ok( outside.some( ( n ) => 'Page 1 of 4' === n.attributes.text ) && outside.some( ( n ) => 'Continue shopping' === n.attributes.label ) );
	assert.ok( outside.some( ( n ) => 'Back' === n.attributes.text ), 'a text that is no button is no Back button' );
	assert.equal( outside.filter( ( n ) => 'Review' === n.attributes.text ).length, 2, 'the short list and the list beside a field stay' );
	assert.equal( absorbed.filter( ( a ) => 'indicator' === a.role ).length, 7, 'only the real list goes' );
	const rules = structuredClone( RULES );
	delete rules.formSteps;
	const off = run( tree(), { rules } );
	assert.deepEqual( off.absorbed, [] );
	assert.ok( all( off.form.innerBlocks ).some( ( n ) => 'Continue' === n.attributes.label ) );
} );

test( 'a form node is made when the root is not one; nothing changes for a single-step schema, a non-form surface, no schema, or a form that already has steps', () => {
	const out = formStepNodes( [ nd( 'sgs/container', {}, [ nd( 'sgs/form-field-text', { label: 'Trading name' }, [], null, '#a' ) ] ) ], { factRecord: RECORD(), surfaceKind: 'form', rules: RULES, has } );
	assert.equal( out[ 0 ].name, 'sgs/form' );
	assert.deepEqual( names( out[ 0 ].innerBlocks ), [ 'sgs/form-step', 'sgs/form-step', 'sgs/form-review' ] );
	const one = RECORD( [ SCHEMA()[ 0 ] ] );
	for ( const args of [ { factRecord: one, surfaceKind: 'form' }, { factRecord: RECORD(), surfaceKind: 'page' }, { factRecord: null, surfaceKind: 'form' } ] ) {
		assert.equal( JSON.stringify( formStepNodes( tree(), { ...args, rules: RULES, has } ) ), JSON.stringify( tree() ) );
	}
	const stepped = [ nd( 'sgs/form', {}, [ nd( 'sgs/form-step', {}, [ nd( 'sgs/form-field-text', {}, [], null, '#a' ) ] ) ] ) ];
	assert.equal( JSON.stringify( formStepNodes( structuredClone( stepped ), { factRecord: RECORD(), surfaceKind: 'form', rules: RULES, has } ) ), JSON.stringify( stepped ) );
} );

test( 'the proposed tree passes the skeleton model checks and the lint', () => {
	const { out } = run();
	const strip = ( list ) => list.map( ( { d, ...n } ) => ( { ...n, innerBlocks: strip( n.innerBlocks || [] ) } ) );
	assert.deepEqual( skeletonProblems( strip( out ) ), [] );
	assert.deepEqual( lintSkeleton( strip( out ), db ).filter( ( p ) => /form-|consent|heading/.test( JSON.stringify( p ) ) ), [] );
} );
