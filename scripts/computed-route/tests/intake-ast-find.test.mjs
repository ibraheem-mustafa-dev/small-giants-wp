// lib/intake-ast-eval.mjs: `find` keeps only the elements its predicate does not rule out, as `filter` does, with the
// predicate's parameters and the enclosing call's arguments bound (a page helper `page( key )` reading
// `list.find( ( s ) => s.key === key ).label` gives that key's label, never every label in the list).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLogic } from '../lib/intake-ast.mjs';
import { evalDeep } from '../lib/intake-ast-eval.mjs';

const lastValues = ( code ) => {
	const idx = parseLogic( code );
	const decl = idx.all.filter( ( n ) => 'VariableDeclarator' === n.type ).pop();
	return evalDeep( idx, decl.init ).values;
};

const LIST = "const items = [ { key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' } ];";

test( 'MUST FAIL: find with a predicate bound through a helper call gives the matching element only', () => {
	const code = `${ LIST } const page = ( key ) => ( { crumb: items.find( ( s ) => s.key === key ).label } ); const x = page( 'b' ).crumb;`;
	assert.deepEqual( lastValues( code ), [ 'Beta' ] );
} );

test( 'MUST FAIL: find with a literal predicate gives the matching element only', () => {
	assert.deepEqual( lastValues( `${ LIST } const x = items.find( ( s ) => s.key === 'c' ).label;` ), [ 'Gamma' ] );
} );

test( 'negative control: a predicate the evaluator cannot judge keeps every element (nothing dropped on a guess)', () => {
	const values = lastValues( `${ LIST } const x = items.find( ( s ) => s.key === window.pick ).label;` );
	assert.deepEqual( [ ...values ].sort(), [ 'Alpha', 'Beta', 'Gamma' ] );
} );
