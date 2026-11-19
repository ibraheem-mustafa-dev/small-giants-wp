// A discovered enum value answers a paint row only when it changes no layout mode (lib/resolve.mjs::resolveDiscovered). Help's topic chips
// are an option picker whose `pillStyle` value `tile` draws the draft's cocoa pill border and also turns the options into a
// one-column grid: the pill border row was answered `pillStyle: tile` and the chips stacked in one column (2026-11-19). The
// calibration below has the shape the option picker's discovery records. Pure functions only.
// Mutation list: tests/discovered-paint-layout.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscovered } from '../lib/resolve.mjs';

const THREE = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );
const PILL = '.o > .p';
const cal = {
	elements: { [ PILL ]: every( { 'border-top-color': 'rgba(0, 0, 0, 0)', display: 'flex' } ), '.o': every( { display: 'flex' } ) },
	discovered: { pillStyle: {
		'border-top-color': { slots: [ PILL ], values: { tile: every( 'rgb(58, 42, 34)' ), filled: every( 'rgb(1, 2, 3)' ) } },
		display: { slots: [ '.o' ], values: { tile: every( 'grid' ) } },
	} },
};
const row = ( prop, value ) => resolveDiscovered( { slot: PILL, prop, perWidth: every( value ), siblings: {} }, cal );

test( 'MUST FAIL: a border colour row is not answered by the value that also turns the options into a grid', () => {
	assert.equal( row( 'border-top-color', 'rgb(58, 42, 34)' ), null, 'tile changes the layout, so it never answers a border colour' );
} );

test( 'negative controls: a value with no layout effect still answers a paint row, and a layout row is still answered by the layout value', () => {
	assert.deepEqual( row( 'border-top-color', 'rgb(1, 2, 3)' ).writes, [ { attr: 'pillStyle', value: 'filled', merge: 'replace' } ] );
	const layout = resolveDiscovered( { slot: '.o', prop: 'display', perWidth: every( 'grid' ), siblings: {} }, cal );
	assert.deepEqual( layout.writes, [ { attr: 'pillStyle', value: 'tile', merge: 'replace' } ] );
} );
