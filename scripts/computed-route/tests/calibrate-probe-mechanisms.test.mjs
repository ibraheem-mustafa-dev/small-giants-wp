// Which vocabulary mechanisms enter a setting state that has no dedicated trigger (lib/calibrate-instances.mjs::probeMechanisms),
// and which states take the probe trigger (triggerFor). Pure: the vocabulary rows are planted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerFor, probeMechanisms } from '../lib/calibrate-instances.mjs';

const ROWS = [
	{ state: 'disabled', reach: 'force-pseudo', kind: 'pseudo-class', token: ':disabled' },
	{ state: 'disabled', reach: 'set-attribute', kind: 'attribute', token: '[disabled]' },
	{ state: 'disabled', reach: 'set-attribute', kind: 'attribute', token: '[data-state' },
	{ state: 'disabled', reach: 'toggle-class', kind: 'class', token: 'is-effect-' },
	{ state: 'disabled', reach: 'toggle-class', kind: 'media', token: 'is-small' },
	{ state: 'disabled', reach: 'measure-only', kind: 'class', token: 'is-measured' },
	{ state: 'closed', reach: 'toggle-class', kind: 'class', token: 'is-closed' },
];

test( 'MUST FAIL WITHOUT THE FILTER: a probe tries the state\'s own whole-value mechanisms in vocabulary order', () => {
	assert.deepEqual( probeMechanisms( 'disabled', ROWS ).map( ( r ) => r.token ), [ ':disabled', '[disabled]' ] );
	assert.deepEqual( probeMechanisms( 'closed', ROWS ).map( ( r ) => r.token ), [ 'is-closed' ] );
	assert.deepEqual( probeMechanisms( 'no-such-state', ROWS ), [], 'negative control: no vocabulary row, no mechanism' );
} );

test( 'calibration gives the probe to states with no dedicated trigger, keeps the dedicated ones', () => {
	assert.equal( triggerFor( 'disabled' ), 'probe' );
	assert.equal( triggerFor( 'closed' ), 'probe' );
	assert.equal( triggerFor( 'hover' ), 'hover' );
	assert.equal( triggerFor( 'open' ), 'open' );
	assert.equal( triggerFor( 'no-such-state' ), undefined );
	assert.equal( triggerFor( null ), null );
} );
