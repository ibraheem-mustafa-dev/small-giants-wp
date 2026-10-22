// The state reader's selector walk, run without a browser on a stub document: a state nested inside `:not()` is never
// entered, and an `:is()` list inside `:not()` or `:has()` is never split into alternatives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { stateCombos, readableRows } from '../lib/fill-state-read.mjs';

const VOCAB = JSON.parse( readFileSync( new URL( '../../../plugins/sgs-blocks/scripts/data/states.json', import.meta.url ), 'utf8' ) ).states;
const ROWS = readableRows( VOCAB ).map( ( r, i ) => ( { ...r, i } ) );

const stubElement = () => ( {
	matches: () => true,
	closest: () => null,
	hasAttribute: () => false,
	setAttribute() {},
	getAttribute: () => null,
} );

const combosOf = ( selector ) => {
	globalThis.matchMedia = () => ( { matches: true } );
	globalThis.getComputedStyle = () => ( { getPropertyValue: () => '' } );
	globalThis.document = {
		styleSheets: [ { cssRules: [ { selectorText: selector, style: { length: 0 } } ] } ],
		querySelector: stubElement,
	};
	const out = stateCombos( [ [ { id: 't', finder: '.x' } ], ROWS, '() => null', 'data-x' ] );
	return ( out.t ?? [] ).map( ( c ) => [ c.selector, c.tokens.map( ( t ) => t.text ) ] );
};

test( 'a state nested deeper inside :not() is not entered', () => {
	assert.deepEqual( combosOf( '.btn:not(:is(:hover, :focus))' ), [] );
} );

test( 'a state inside :not() still counts when the :not() is not an ancestor of it', () => {
	assert.deepEqual( combosOf( '.a:not(.b):hover' ), [ [ '.a:not(.b):hover', [ ':hover' ] ] ] );
} );

test( ':is() inside :not() is not split into alternatives', () => {
	assert.deepEqual( combosOf( '.card:not(:is(.x, .y)):hover' ), [ [ '.card:not(:is(.x, .y)):hover', [ ':hover' ] ] ] );
} );

test( ':is() at the top level is still split into alternatives', () => {
	assert.deepEqual( combosOf( '.card:is(:hover, :focus)' ), [
		[ '.card:is(:hover)', [ ':hover' ] ],
		[ '.card:is(:focus)', [ ':focus' ] ],
	] );
} );
