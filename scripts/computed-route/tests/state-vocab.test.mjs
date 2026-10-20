// The state vocabulary as intake and calibration read it (Spec 48 FR-48-81, FP-1): from the framework DB's `states`
// table, never a list in code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { forceable, pseudoTrigger, stateRows } from '../lib/state-vocab.mjs';

test( 'MUST FAIL with the old seven-state list: every pseudo-class Chromium forces is forceable, none it cannot is', () => {
	const f = forceable();
	for ( const p of [ 'hover', 'active', 'focus', 'focus-visible', 'focus-within', 'target', 'checked', 'disabled', 'open', 'invalid' ] ) {
		assert.ok( f.includes( p ), `${ p } is forceable` );
	}
	for ( const p of [ 'visited', 'popover-open', 'modal', 'empty' ] ) {
		assert.ok( ! f.includes( p ), `${ p } is not forced through DevTools` );
	}
} );

test( 'the motion inventory trigger follows the vocabulary: press for :active, hover and focus, state otherwise', () => {
	assert.equal( pseudoTrigger( 'hover' ), 'hover' );
	assert.equal( pseudoTrigger( 'focus-visible' ), 'focus' );
	assert.equal( pseudoTrigger( 'focus-within' ), 'focus' );
	assert.equal( pseudoTrigger( 'active' ), 'press' );
	assert.equal( pseudoTrigger( 'checked' ), 'state' );
	assert.equal( pseudoTrigger( 'not-a-pseudo' ), 'state' );
	const prefixed = [ { kind: 'pseudo-class', token: ':focus-visible', state: 'active', family: 'press' }, { kind: 'pseudo-class', token: ':focus', state: 'focus', family: 'pointer-keyboard' } ];
	assert.equal( pseudoTrigger( 'focus', prefixed ), 'focus', 'a name matches its own row, never a longer one it prefixes' );
} );

test( 'the rows are the seeded vocabulary, in file order', () => {
	const file = JSON.parse( readFileSync( new URL( '../../../plugins/sgs-blocks/scripts/data/states.json', import.meta.url ), 'utf8' ) ).states;
	assert.deepEqual( stateRows().map( ( r ) => r.token ), file.map( ( r ) => r.token ), 'reseed the DB if states.json changed' );
} );

test( 'negative control: a vocabulary without the force-pseudo rows forces nothing', () => {
	assert.deepEqual( forceable( stateRows().filter( ( r ) => 'force-pseudo' !== r.reach ) ), [] );
	assert.equal( pseudoTrigger( 'active', [] ), 'state' );
} );
