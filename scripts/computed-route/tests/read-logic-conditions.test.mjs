// Spec 48 FR-48-7, lib/read-logic-conditions.mjs: the meaning of a negated condition, the gaps the width reader reports, and
// the state keys the logic derives from the width. Each MUST FAIL test names the code whose removal turns it red
// (tests/fixtures/read-logic-conditions/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import { negate, widthConditions } from '../lib/read-logic-conditions.mjs';

const source = ( logic ) => ( { logic, logicLine: 1, component: 'Page', file: 'Page.dc.html', stamped: { elements: [] } } );

test( 'MUST FAIL (negate): a breakpoint token flips `is` and keeps the width condition that gives it', () => {
	const bp = { bp: 'm', is: true, when: { w: '<', n: 768 } };
	assert.deepEqual( negate( bp ), { bp: 'm', is: false, when: { w: '<', n: 768 } } );
	assert.deepEqual( negate( negate( bp ) ), bp, 'two negations give the token back' );
	assert.deepEqual( negate( { w: '>=', n: 1260 } ), { w: '<', n: 1260 } );
} );

test( 'MUST FAIL (negate): a complete all/any takes De Morgan, a partial one is not inverted', () => {
	const a = { w: '<', n: 768 };
	const b = { w: '>=', n: 320 };
	assert.deepEqual( negate( { all: [ a, b ] } ), { any: [ { w: '>=', n: 768 }, { w: '<', n: 320 } ] } );
	assert.deepEqual( negate( { any: [ a, b ] } ), { all: [ { w: '>=', n: 768 }, { w: '<', n: 320 } ] } );
	const partial = { all: [ a ], partial: true };
	assert.deepEqual( negate( partial ), { not: partial, partial: true }, 'the unread term has no inverse, so the result is partial and not De Morgan' );
} );

test( 'MUST FAIL (gaps): a width the reader cannot follow comes back as a gap row', () => {
	const got = widthConditions( { source: source( 'class A { state = { x: window.foo.bar.innerWidth > 3 ? 1 : 2 }; }' ), scIfs: [] } );
	assert.ok( got.gaps.some( ( g ) => 'breakpoint' === g.construct && /state\.x is written from a width read/.test( g.error ) ), JSON.stringify( got.gaps ) );
} );

test( 'MUST FAIL (state keys): the logic\'s state keys come back, and those derived from the width, whatever they are called', () => {
	const logic = `class A {
		state = { vp: this.band(), open: false, raw: window.innerWidth };
		band() { return window.innerWidth < 900 ? 'narrow' : 'wide'; }
	}`;
	const got = widthConditions( { source: source( logic ), scIfs: [] } );
	assert.deepEqual( [ ...got.state.keys ].sort(), [ 'open', 'raw', 'vp' ] );
	assert.deepEqual( [ ...got.state.widthKeys ].sort(), [ 'raw', 'vp' ] );
} );
