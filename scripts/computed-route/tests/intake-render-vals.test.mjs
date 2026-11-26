// Spec 48 FR-48-7, lib/intake-render-vals.mjs: the value node of a renderVals key, read through `Object.assign(...)` returns
// and spread helpers, with a ternary's test kept. The fixtures are the real Eye Care draft (committed under sites/).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitDraft, parseLogic } from '../lib/intake-ast.mjs';
import { renderValNode } from '../lib/intake-render-vals.mjs';
import { elementsOf, propRefs, resolveRefs, oneString, ref } from '../lib/intake-ast-eval.mjs';
import { rootData } from '../lib/fill-list-items.mjs';
import { widthConditions } from '../lib/read-logic-conditions.mjs';
import { shownAt, hiddenRanges } from '../lib/fill-width-gate.mjs';

const draft = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html' );
const cut = splitDraft( fs.readFileSync( draft, 'utf8' ) );
const idx = parseLogic( cut.logic, cut.logicLine );
const source = { logic: cut.logic, logicLine: cut.logicLine, component: 'Page', file: draft, stamped: { elements: [] } };

test( 'MUST FAIL (valueOfKey): a key written in the object an `Object.assign(accountVals, {...})` return merges in is found', () => {
	assert.ok( renderValNode( idx, 'navFull' ), 'navFull sits in the merged object literal' );
	assert.ok( renderValNode( idx, 'coGuest' ), 'coGuest sits in the first merge argument, a local const' );
} );

test( 'MUST FAIL (return order): the first return that holds a key decides it, and inside one Object.assign merge the last writer does', () => {
	const logic = 'class Component {\n  renderVals() {\n    if ( this.state.compact ) {\n      return { gate: \'first\', only: \'a\' };\n    }\n    return Object.assign( { gate: \'second\', merged: \'one\' }, { merged: \'two\' } );\n  }\n}';
	const two = parseLogic( logic, 1 );
	assert.equal( renderValNode( two, 'gate' ).value, 'first', 'an early return is read before a later one' );
	assert.equal( renderValNode( two, 'merged' ).value, 'two', 'the later argument of one merge wins' );
	assert.equal( renderValNode( two, 'only' ).value, 'a' );
	assert.equal( renderValNode( two, 'absent' ), null );
} );

test( 'MUST FAIL (reassigned field): a field set in the constructor and again in update() reads its latest object, so the width ternary beats the stale initial value; separate returns stay first first', () => {
	const logic = 'class Component {\n  constructor() { this.vals = { show: \'none\', old: 1 }; }\n  update() { this.vals = { show: this.state.w >= 100 ? \'flex\' : \'none\' }; }\n  renderVals() {\n    if ( this.state.compact ) {\n      return { gate: \'first\' };\n    }\n    return this.vals;\n  }\n}';
	const two = parseLogic( logic, 1 );
	assert.equal( renderValNode( two, 'show' ).type, 'ConditionalExpression', 'the latest assignment wins inside one return expression' );
	assert.equal( renderValNode( two, 'old' ).value, 1, 'a key only the earlier assignment holds is still found' );
	const split = parseLogic( 'class Component {\n  constructor() { this.vals = { show: \'none\' }; }\n  update() { this.vals = { show: this.state.w >= 100 ? \'flex\' : \'none\' }; }\n  renderVals() {\n    if ( this.state.compact ) {\n      return this.vals;\n    }\n    return { show: \'later\' };\n  }\n}', 1 );
	assert.equal( renderValNode( split, 'show' ).type, 'ConditionalExpression', 'the first return that holds the key decides, across separate returns' );
} );

test( 'MUST FAIL (ternary test): the node keeps the ternary, not its branches', () => {
	assert.equal( renderValNode( idx, 'phoneDisplay' ).type, 'ConditionalExpression' );
} );

test( 'MUST FAIL (width conditions): Eye Care\'s width keys read as width conditions', () => {
	const scIfs = [ 'navFull', 'navCompact', 'phoneDisplay' ].map( ( k ) => ( { key: k, n: 0, value: `{{ ${ k } }}` } ) );
	const got = widthConditions( { source, scIfs } );
	assert.deepEqual( got.conditions.navFull.width, { w: '>=', n: 1060 } );
	assert.deepEqual( got.conditions.navCompact.width, { w: '<', n: 1060 } );
} );

test( 'MUST FAIL (guard): every renderVals key the draft\'s sc-ifs name resolves to a node', () => {
	const text = fs.readFileSync( draft, 'utf8' );
	const keys = [ ...text.matchAll( /<sc-if value="\{\{\s*!?\s*([A-Za-z_]\w*)\s*\}\}"/g ) ].map( ( m ) => m[ 1 ] );
	const unresolved = [ ...new Set( keys ) ].filter( ( k ) => ! renderValNode( idx, k ) );
	assert.ok( keys.length > 20, 'the draft has sc-ifs' );
	// Names an sc-for binds (a loop variable) are no renderVals key.
	const loopVars = new Set( [ ...text.matchAll( /<sc-for[^>]*\bas="(\w+)"/g ) ].map( ( m ) => m[ 1 ] ) );
	assert.deepEqual( unresolved.filter( ( k ) => ! loopVars.has( k ) ), [] );
} );

test( 'MUST FAIL (class alias statics): `const C = Component; C.FAQS.map(...)` reads every answer of the FAQ', () => {
	const faqs = elementsOf( idx, propRefs( idx, rootData( idx ), 'faqs' )[ 0 ] );
	assert.equal( faqs.length, 8, 'the draft\'s FAQS holds eight entries' );
	const answers = faqs.map( ( el ) => propRefs( idx, [ el ], 'a' ).map( ( r ) => oneString( idx, r.node, r.env ) ).find( ( v ) => null !== v ) ?? null );
	assert.equal( answers.filter( ( a ) => a && a.length > 10 ).length, 8, JSON.stringify( answers ).slice( 0, 200 ) );
} );

test( 'MUST FAIL (display gate): an element whose own `display` the logic picks by width reads as shown from that width (the phone button, 1160)', () => {
	const got = widthConditions( { source, scIfs: [], displays: [ { key: 'Eye Care Birmingham/33', value: '{{ phoneDisplay }}' } ] } );
	assert.deepEqual( got.conditions[ 'Eye Care Birmingham/33:display' ].width, { w: '>=', n: 1160 } );
} );

test( 'MUST FAIL (one visibility rule): the phone button inside the navFull sc-if is hidden below 1160 (the own display gate narrows the sc-if\'s 1060), not below 1060', () => {
	const facts = { elements: {
		'Eye Care Birmingham/30': { template: { membership: { scIf: [] } }, logic: { width: { w: '>=', n: 1060 } } },
		'Eye Care Birmingham/33': { template: { membership: { scIf: [ { key: 'Eye Care Birmingham/30', value: '{{ navFull }}' } ] } }, logic: { displayWidth: { w: '>=', n: 1160 } } },
	} };
	const at = shownAt( facts, 'Eye Care Birmingham/33' );
	assert.deepEqual( hiddenRanges( at.shown ).hidden, [ [ 0, 1160 ] ] );
} );
