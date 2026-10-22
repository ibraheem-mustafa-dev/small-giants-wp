// Regressions for the intake library's parsing and evaluation helpers: one case per reproduced bug-hunt finding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { harnessOptions } from '../lib/intake-harness.mjs';
import { markupUsage } from '../lib/intake-usage.mjs';
import { deadFieldVerdict } from '../lib/intake-defects-deadfield.mjs';
import { fontUrlFamilies } from '../lib/intake-head.mjs';
import { cssDecls } from '../lib/intake-census-logic.mjs';
import { matchSelector } from '../lib/intake-inventory-css.mjs';
import { crossCheck } from '../lib/intake-pagemap-surfaces.mjs';
import { parseHoursText } from '../lib/intake-siteinfo-shape.mjs';
import { parseLogic, readBinding, fnBinding, callsOf } from '../lib/intake-ast.mjs';
import { evalDeep } from '../lib/intake-ast-eval.mjs';
import { deadCodeWhy } from '../lib/intake-defects-static.mjs';

const strings = ( code ) => {
	const idx = parseLogic( code );
	const decl = idx.all.filter( ( n ) => 'VariableDeclarator' === n.type ).pop();
	return evalDeep( idx, decl.init ).values;
};

test( 'harnessOptions refuses stepMs 0, which would never advance virtual time', () => {
	assert.throws( () => harnessOptions( { stepMs: 0 } ), /stepMs/ );
	assert.equal( harnessOptions( { stepMs: 1 } ).stepMs, 1 );
} );

test( 'markupUsage keeps an outer svg open after a nested svg closes', () => {
	const t = new Map();
	markupUsage( '<svg><svg></svg><a/></svg>', t, 'd', new Set( [ 'svg:a', 'svg:svg', 'html:a' ] ) );
	assert.ok( t.has( 'svg:a' ), [ ...t.keys() ].join() );
	assert.ok( ! t.has( 'html:a' ), [ ...t.keys() ].join() );
} );

test( 'a falsy numeric or string field initialiser counts as an unset guard field', () => {
	for ( const init of [ '0', "''" ] ) {
		const logic = `class Component { _el = ${ init }; go() { if ( this._el ) { this._el.animate( [], 1 ); } } }`;
		const v = deadFieldVerdict( { logic }, logic.indexOf( '.animate(' ), { rows: [] } );
		assert.match( String( v?.note ), /this\._el, which nothing writes/, init );
	}
} );

test( 'fontUrlFamilies reads a css2 tuple shorter than its axis list', () => {
	const f = fontUrlFamilies( 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@1' );
	assert.equal( f[ 0 ].family, 'Inter' );
} );

test( 'cssDecls drops a declaration with no colon', () => {
	assert.deepEqual( cssDecls( 'color: red; transitions' ), [ [ 'color', 'red' ] ] );
} );

const el = ( n, tag, attrs ) => ( { n, tag, attrs, inHelmet: false } );
const ELS = [ el( 1, 'div', [ [ 'class', 'a b' ], [ 'data-x', 'p q' ] ] ), el( 2, 'ul', [] ), el( 3, 'li', [ [ 'class', 'k' ] ] ) ];

test( 'matchSelector keeps combinator characters inside brackets and parentheses', () => {
	assert.deepEqual( matchSelector( ELS, '[class~="a"]' ).tpl, [ 1 ] );
	assert.deepEqual( matchSelector( ELS, '[data-x="p q"]' ).tpl, [ 1 ] );
	assert.deepEqual( matchSelector( ELS, 'ul li.k' ).tpl, [ 3 ] );
	assert.deepEqual( matchSelector( ELS, 'ul > li:nth-child(2n+1)' ).tpl, [ 3 ] );
} );

test( 'matchSelector: the universal selector matches every element', () => {
	assert.deepEqual( matchSelector( ELS, '*' ).tpl, [ 1, 2, 3 ] );
} );

test( 'crossCheck normalises a capitalised choice-flow kind', () => {
	const code = [ { kind: 'choice-flow', label: 'Quiz', dc: 'Home', draftId: 'Home', route: null } ];
	for ( const kind of [ 'Choice Flow', 'Quiz' ] ) {
		const r = crossCheck( code, { records: [ { id: 'h1', kind, name: 'Quiz', dc: 'Home' } ] } );
		assert.equal( r.gaps.length, 0, kind );
		assert.equal( r.surfaces.length, 1, kind );
	}
} );

test( 'parseHoursText reads 9-5pm as 09:00 to 17:00', () => {
	assert.deepEqual( parseHoursText( 'Mon-Fri 9-5pm' ).monday, [ [ 540, 1020 ] ] );
} );

test( 'evaluator: numeric object keys, later spreads and array indexes', () => {
	assert.deepEqual( strings( "const o = { 0: 'z' }; const r = o[ 0 ];" ), [ 'z' ] );
	assert.deepEqual( strings( "const r = { a: 'x', ...{ a: 'y' } }.a;" ), [ 'y' ] );
	assert.deepEqual( strings( "const a = [ c ? 'p' : 'q', 'r' ]; const r = a[ 1 ];" ), [ 'r' ] );
} );

test( 'callsOf: a function under a computed key does not bind every plain call', () => {
	const idx = parseLogic( "const o = { [k]: ( x ) => x }; foo( 'hello' );" );
	const fn = idx.all.find( ( n ) => 'ArrowFunctionExpression' === n.type );
	assert.deepEqual( callsOf( idx, fnBinding( idx, fn ) ), [] );
} );

test( 'readBinding returns plain text for a value holding two bindings', () => {
	assert.doesNotThrow( () => readBinding( '{{ a }} {{ b }}' ) );
	assert.ok( readBinding( '{{ a }} {{ b }}' ).text );
	assert.ok( readBinding( '{{ a }}' ).expr );
} );

test( 'constant folding uses JS loose equality and honours inner redeclarations', () => {
	const dead = ( cond ) => {
		const logic = `class Component { constructor() { this.go = this.go.bind( this ); } go() { if ( ${ cond } ) { return; } this.live(); } }`;
		return deadCodeWhy( { logic }, logic.indexOf( 'this.live' ), { rows: [] } );
	};
	assert.equal( dead( "null == 'null'" ), null );
	assert.match( String( dead( '0 == false' ) ), /constant guard/, 'loose equality of 0 and false is true' );
	const shadow = 'class Component { constructor() { this.go = this.go.bind( this ); } go() { const off = true; { let off = x(); if ( off ) { return; } this.live(); } } }';
	assert.equal( deadCodeWhy( { logic: shadow }, shadow.indexOf( 'this.live' ), { rows: [] } ), null );
} );
