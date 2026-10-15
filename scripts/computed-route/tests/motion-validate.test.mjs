// Spec 38A FR-38A-5 / FR-38A-2: the cloning writer's gate (lib/motion-validate.mjs).
// Run: node --test scripts/computed-route/tests/motion-validate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMotionWrite, assertMotionWritable, selectorProblem, SELECTOR_ALLOWED } from '../lib/motion-validate.mjs';

const review = { draftNode: 'draft element 42', reason: 'No declared part names this span.' };
const hover = { state: { values: { opacity: 0.7, duration: 200 } } };
const doc = ( element ) => ( { v: 1, elements: { 'custom:1': element } } );
const good = () => ( { selector: '.sgs-example__inner > span', review: { ...review }, hover: JSON.parse( JSON.stringify( hover ) ) } );

test( 'a custom target with its review row is accepted', () => {
	const r = validateMotionWrite( doc( good() ) );
	assert.deepEqual( r, { valid: true, errors: [], refusals: [] } );
	assert.doesNotThrow( () => assertMotionWritable( doc( good() ) ) );
} );

test( 'a custom target with no review row is refused with a clear error', () => {
	const e = good();
	delete e.review;
	const r = validateMotionWrite( doc( e ) );
	assert.equal( r.valid, false );
	assert.ok( r.errors.some( ( m ) => m.includes( 'custom:1' ) && m.includes( 'review' ) ), r.errors.join( '|' ) );
	assert.throws( () => assertMotionWritable( doc( e ) ), /write refused/ );
} );

test( 'a blank review field is refused', () => {
	for ( const bad of [ { draftNode: '  ', reason: 'r' }, { draftNode: 'n', reason: '' } ] ) {
		const e = good();
		e.review = bad;
		assert.equal( validateMotionWrite( doc( e ) ).valid, false, JSON.stringify( bad ) );
	}
} );

test( 'a planted unknown key is rejected', () => {
	const e = good();
	e.hover.state.values.notAField = 1;
	const r = validateMotionWrite( doc( e ) );
	assert.equal( r.valid, false );
	assert.ok( r.errors.some( ( m ) => m.includes( 'notAField' ) ), r.errors.join( '|' ) );
	const top = { ...doc( good() ), rogue: true };
	assert.equal( validateMotionWrite( top ).valid, false, 'unknown top-level key' );
} );

test( 'an out-of-range value is rejected', () => {
	const e = good();
	e.hover.state.values.opacity = 7;
	assert.equal( validateMotionWrite( doc( e ) ).valid, false, 'opacity 7' );
	const f = good();
	f.hover.state.values.duration = 99999999;
	assert.equal( validateMotionWrite( doc( f ) ).valid, false, 'duration far over the maximum' );
} );

test( 'selectors that could leave the block root or break the style block are refused', () => {
	for ( const sel of [ 'a}body{color:red', 'a</style><script>alert(1)</script>', 'a;b', 'a,body', 'a\\7d', '@import', 'a/*x*/', 'a\\\\b', 'html .a', 'BODY > div', ':root', '+ .a', '~ .a', 'a'.repeat( 201 ) ] ) {
		const e = good();
		e.selector = sel;
		const r = validateMotionWrite( doc( e ) );
		assert.equal( r.valid, false, `should refuse: ${ sel }` );
		assert.notEqual( selectorProblem( sel ), null, `selectorProblem: ${ sel }` );
	}
} );

test( 'scoped selectors pass, including a leading child combinator', () => {
	for ( const sel of [ '.a', '> .a', 'span.lede', '.a[data-x="1"]', '.a:hover > span', 'bodyguard' ] ) {
		assert.equal( selectorProblem( sel ), null, sel );
	}
} );

test( 'the allow-list fails closed: a character outside it never matches', () => {
	for ( const ch of [ '}', '{', '<', ';', '\\', '@', ',', '/', '\n' ] ) {
		assert.equal( SELECTOR_ALLOWED.test( `a${ ch }b` ), false, JSON.stringify( ch ) );
	}
} );
