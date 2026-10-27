// The words of a multi-step form's own buttons (Spec 48 FR-48-57, lib/fill-form-buttons.mjs): the draft's Next and Back
// buttons the skeleton absorbed give the form's nextLabel, submitLabel and prevLabel, read from the fact record and the
// draft's logic. MUST FAIL: a chosen binding gives both Next words, plain words give nextLabel only, no words give nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogic } from '../lib/intake-ast.mjs';
import { stepButtonLabels, stepButtonWrites, buttonWords, trueOnLast } from '../lib/fill-form-buttons.mjs';
import { formWrites } from '../lib/fill-form.mjs';

const RULES = {
	next: { words: { patterns: [ '^(?:next|continue)(?:\\s+step)?$' ], flags: 'i' }, handlers: { patterns: [ '^(?:next|forward)(?:Step)?$' ] } },
	back: { words: { patterns: [ '^(?:back|prev|previous)(?:\\s+step)?$' ], flags: 'i' }, handlers: { patterns: [ '^(?:back|prev|previous)(?:Step)?$' ] } },
};
const logic = ( vals, pre = 'const S = this.schema, isReview = step === S.length - 1;' ) => parseLogic( `class C { get schema() { return []; } renderVals() { const step = this.state.step; ${ pre } return { ${ vals }, arrow: React.createElement( 'svg' ) }; } }` );
const str = ( v ) => ( { 1440: { v: [ { t: 'string', v } ] } } );
const ICON = { 1440: { v: [ { t: 'element' } ] } };
// A button element of the fact record: words, text holes (path -> record reading), handler, and loop membership.
const button = ( key, { words, holes = {}, onClick = null, loop = false } ) => ( {
	template: { key, tag: 'button', realTag: 'button', attrs: onClick ? { type: 'button', onClick: `{{ ${ onClick } }}` } : { type: 'button' }, words, inFor: loop, membership: { scFor: loop ? [ { key: 'x' } ] : [] }, holes: Object.keys( holes ).map( ( p, i ) => ( { id: `text#${ i }`, where: 'text', path: p, expr: p } ) ) },
	logic: { holes: Object.fromEntries( Object.values( holes ).map( ( r, i ) => [ `text#${ i }`, r ] ) ) },
} );
const NEXT = button( 'Apply/85', { words: '{{ nextLabel }} {{ arrow }}', holes: { nextLabel: str( 'Continue' ), arrow: ICON }, onClick: 'next' } );
const BACK = button( 'Apply/81', { words: 'Back', onClick: 'back' } );
const facts = ( ...els ) => ( { elements: Object.fromEntries( els.map( ( e ) => [ e.template.key, e ] ) ) } );
const read = ( f, idx ) => stepButtonLabels( { facts: f, component: 'Apply', idx, rules: RULES } );

test( 'MUST FAIL: a Next button whose words a step test chooses gives nextLabel and submitLabel; Back gives prevLabel', () => {
	const out = read( facts( NEXT, BACK ), logic( "nextLabel: isReview ? 'Submit application' : 'Continue'" ) );
	assert.deepEqual( out.labels, { nextLabel: 'Continue', submitLabel: 'Submit application', prevLabel: 'Back' } );
	assert.deepEqual( out.notes, [] );
} );

test( 'MUST FAIL: the test is placed by the last index, whichever way round it is written', () => {
	const cases = [
		[ 'const S = this.schema, more = step < S.length - 1;', "nextLabel: more ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema, isReview = step === S.length - 1;', "nextLabel: !isReview ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 > step ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: step >= S.length - 1 ? 'Send' : 'Continue'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 <= step ? 'Send' : 'Continue'" ],
		[ 'const S = this.schema;', "nextLabel: step !== S.length - 1 ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: step == S.length - 1 ? 'Send' : 'Continue'" ],
		[ 'const S = this.schema;', "nextLabel: step != S.length - 1 ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 == step ? 'Send' : 'Continue'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 !== step ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 != step ? 'Continue' : 'Send'" ],
		[ 'const S = this.schema;', "nextLabel: S.length - 1 === step ? 'Send' : 'Continue'" ],
	];
	for ( const [ pre, vals ] of cases ) {
		assert.deepEqual( read( facts( NEXT ), logic( vals, pre ) ).labels, { nextLabel: 'Continue', submitLabel: 'Send' }, vals );
	}
} );

test( 'MUST FAIL: plain Next words give nextLabel only; a Next hole with one value is plain', () => {
	const plain = button( 'Apply/90', { words: 'Next step', onClick: 'go' } );
	assert.deepEqual( read( facts( plain ), null ).labels, { nextLabel: 'Next step' } );
	assert.deepEqual( read( facts( NEXT ), logic( "nextLabel: 'Carry on'" ) ).labels, { nextLabel: 'Carry on' } );
	assert.deepEqual( read( facts( NEXT ), logic( "nextLabel: isReview ? 'Go' : 'Go'" ) ).labels, { nextLabel: 'Go', submitLabel: 'Go' }, 'a chosen value is the submit words too, even when both branches agree' );
} );

test( 'MUST FAIL: a button with no words, or words that cannot be read, writes nothing', () => {
	const bare = button( 'Apply/85', { words: '{{ arrow }}', holes: { arrow: ICON }, onClick: 'next' } );
	assert.deepEqual( read( facts( bare ), logic( "nextLabel: 'x'" ) ), { labels: {}, notes: [] }, 'an icon is no words' );
	const cases = [
		[ facts( NEXT ), null, /logic is not read/ ],
		[ facts( NEXT ), logic( "nextLabel: step > 0 ? 'Continue' : 'Start'" ), /a test that names no step/ ],
		[ facts( NEXT ), logic( "nextLabel: this.state.label" ), /no readable words/ ],
		[ facts( NEXT ), logic( "nextLabel: isReview ? 'Send' : 'Step ' + step" ), /no readable words/ ],
		[ facts( NEXT ), logic( "nextLabel: step === S.size - 1 ? 'Send' : 'Continue'" ), /a test that names no step/ ],
		[ facts( NEXT ), logic( "nextLabel: step === S.length - 2 ? 'Send' : 'Continue'" ), /a test that names no step/ ],
		[ facts( NEXT ), logic( "nextLabel: last ? 'Send' : 'Continue'", 'const S = this.schema, last = this.f ? step === S.length - 1 : step > 0;' ), /a test that names no step/ ],
		[ facts( button( 'Apply/85', { words: 'Go {{ nextLabel }}', holes: { nextLabel: str( 'on' ) }, onClick: 'next' } ) ), logic( "nextLabel: 'on'" ), /its own text and a text hole/ ],
		[ facts( button( 'Apply/85', { words: '{{ a }} {{ b }}', holes: { a: str( 'x' ), b: str( 'y' ) }, onClick: 'next' } ) ), logic( "a: 'x', b: 'y'" ), /several text holes/ ],
		[ facts( button( 'Apply/85', { words: '{{ nextLabel }}', holes: { nextLabel: {} }, onClick: 'next' } ) ), logic( "nextLabel: 'x'" ), /no reading in the fact record/ ],
	];
	for ( const [ f, idx, why ] of cases ) {
		const out = read( f, idx );
		assert.deepEqual( out.labels, {}, String( why ) );
		assert.ok( out.notes.some( ( n ) => why.test( n ) ), JSON.stringify( out.notes ) );
	}
} );

test( 'NEGATIVE: looped buttons, another component\'s buttons and buttons that move nowhere are not read; a back button that changes words is a note', () => {
	const looped = button( 'Apply/33', { words: 'Next', onClick: 'go', loop: true } );
	const other = button( 'Other/5', { words: 'Continue', onClick: 'next' } );
	const submit = button( 'Apply/99', { words: 'Send it' } );
	assert.deepEqual( read( facts( looped, other, submit ), null ), { labels: {}, notes: [] } );
	const chosenBack = button( 'Apply/81', { words: '{{ backLabel }}', holes: { backLabel: str( 'Back' ) }, onClick: 'back' } );
	const out = read( facts( chosenBack ), logic( "backLabel: isReview ? 'Edit' : 'Back'" ) );
	assert.deepEqual( out.labels, {} );
	assert.ok( out.notes.some( ( n ) => /back button changes its words/.test( n ) ), JSON.stringify( out.notes ) );
	const two = read( facts( button( 'Apply/1', { words: 'Next', onClick: 'next' } ), button( 'Apply/2', { words: 'Continue', onClick: 'next' } ) ), null );
	assert.deepEqual( two.labels, {} );
	assert.ok( two.notes.some( ( n ) => /show different words/.test( n ) ), JSON.stringify( two.notes ) );
	const agree = read( facts( button( 'Apply/1', { words: 'Next', onClick: 'next' } ), button( 'Apply/2', { words: 'Next', onClick: 'next' } ) ), null );
	assert.deepEqual( agree.labels, { nextLabel: 'Next' }, 'two copies with the same words agree' );
} );

test( 'buttonWords and trueOnLast: a test that is not a comparison with the last index is unplaced', () => {
	const idx = logic( "nextLabel: 'x'" );
	assert.equal( trueOnLast( idx, null ), null );
	assert.equal( buttonWords( { words: '', holes: [] }, {} ), null );
	assert.deepEqual( buttonWords( { words: '  Back  ', holes: [] }, {} ), { plain: 'Back' } );
} );

// Fill's form pass: the labels land on a multi-step sgs/form node, where the block holds the setting.
const SCHEMA = [ { label: 'One', fields: [ { name: 'a', label: 'A' } ] }, { label: 'Review', fields: [] } ];
const FILL_FACTS = { ...facts( NEXT, BACK ), logic: { statics: { Apply: { entries: [ { name: 'schema', kind: 'array', value: SCHEMA } ] } } } };
const DEFAULTS = { nextLabel: 'Next', prevLabel: 'Previous', submitLabel: 'Submit' };
const dbWith = ( held ) => ( { prepare: () => ( { get: ( block, attr ) => ( 'sgs/form' === block && held.includes( attr ) ? { default_value: JSON.stringify( DEFAULTS[ attr ] ) } : undefined ) } ) } );
const fill = ( form, db, vals = "nextLabel: isReview ? 'Submit application' : 'Continue'" ) => formWrites( { nodes: [ { index: 0, name: 'sgs/form', targets: [] } ], flat: [ form ], refOf: () => 'form', reads: { widths: { 1440: {} } }, facts: FILL_FACTS, db, component: null, idxFor: ( c ) => ( 'Apply' === c ? logic( vals ) : null ), buttonRules: RULES } );
const stepped = ( attributes = {} ) => ( { name: 'sgs/form', attributes, innerBlocks: [ { name: 'sgs/form-step', attributes: {}, innerBlocks: [] }, { name: 'sgs/form-review', attributes: {}, innerBlocks: [] } ] } );

test( 'MUST FAIL: Fill writes the draft\'s button words on a multi-step form', () => {
	const form = stepped();
	const out = fill( form, dbWith( [ 'nextLabel', 'prevLabel', 'submitLabel' ] ) );
	assert.deepEqual( Object.fromEntries( out.writes.map( ( w ) => [ w.attr, w.after ] ) ), { nextLabel: 'Continue', submitLabel: 'Submit application', prevLabel: 'Back' } );
	assert.equal( form.attributes.submitLabel, 'Submit application' );
	assert.deepEqual( out.unmapped, [] );
} );

test( 'NEGATIVE: a single-step form, a default value and a block without the setting', () => {
	const single = { name: 'sgs/form', attributes: {}, innerBlocks: [] };
	assert.deepEqual( fill( single, dbWith( [ 'nextLabel', 'prevLabel', 'submitLabel' ] ) ).writes, [], 'no steps, no step buttons' );
	const same = fill( stepped(), dbWith( [ 'nextLabel', 'prevLabel', 'submitLabel' ] ), "nextLabel: isReview ? 'Submit' : 'Next'" );
	assert.deepEqual( same.writes.map( ( w ) => w.attr ), [ 'prevLabel' ], 'words equal to the block default are not written' );
	const held = fill( stepped( { prevLabel: 'Back' } ), dbWith( [ 'nextLabel', 'prevLabel', 'submitLabel' ] ) );
	assert.ok( ! held.writes.some( ( w ) => 'prevLabel' === w.attr ), 'a node already holding the words is left alone' );
	const missing = fill( stepped(), dbWith( [ 'submitLabel' ] ) );
	assert.deepEqual( missing.writes.map( ( w ) => w.attr ), [ 'submitLabel' ] );
	assert.deepEqual( missing.unmapped.map( ( u ) => u.property ).sort(), [ 'nextLabel', 'prevLabel' ] );
	assert.ok( missing.unmapped.every( ( u ) => /sgs\/form holds no setting for the words of its (next|prev) button/.test( u.reason ) && 'form' === u.node ), JSON.stringify( missing.unmapped ) );
	assert.deepEqual( stepButtonWrites( { labels: {}, def: () => null } ), { writes: [], unmapped: [], notes: [] } );
} );
