// Spec 48 FR-48-7, lib/intake-render-vals.mjs: the value node of a renderVals key, read through `Object.assign(...)` returns
// and spread helpers, with a ternary's test kept. The fixtures are the real Eye Care draft (committed under sites/).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitDraft, parseLogic } from '../lib/intake-ast.mjs';
import { renderValNode } from '../lib/intake-render-vals.mjs';
import { widthConditions } from '../lib/read-logic-conditions.mjs';

const draft = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html' );
const cut = splitDraft( fs.readFileSync( draft, 'utf8' ) );
const idx = parseLogic( cut.logic, cut.logicLine );
const source = { logic: cut.logic, logicLine: cut.logicLine, component: 'Page', file: draft, stamped: { elements: [] } };

test( 'MUST FAIL (valueOfKey): a key written in the object an `Object.assign(accountVals, {...})` return merges in is found', () => {
	assert.ok( renderValNode( idx, 'navFull' ), 'navFull sits in the merged object literal' );
	assert.ok( renderValNode( idx, 'coGuest' ), 'coGuest sits in the first merge argument, a local const' );
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
