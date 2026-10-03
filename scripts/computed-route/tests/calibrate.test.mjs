// Proves FR-47-2's state rule (§3.2): a setting with a css_state is calibrated only through a known trigger; a state
// with none is reported, never calibrated as if it were rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerFor, STATE_TRIGGERS } from '../lib/calibrate.mjs';

test( 'each setting state the database uses has its trigger', () => {
	assert.equal( triggerFor( null ), null );
	assert.equal( triggerFor( 'hover' ), 'hover' );
	assert.equal( triggerFor( 'scrolled' ), 'scroll' );
	assert.equal( triggerFor( 'open' ), 'fixture' );
	assert.equal( triggerFor( 'current' ), 'fixture' );
} );

test( 'MUST FAIL TO CALIBRATE: a state with no trigger is undefined, never rest', () => {
	assert.equal( triggerFor( 'focus' ), undefined );
	assert.equal( triggerFor( 'shrunk' ), undefined );
	assert.ok( ! Object.hasOwn( STATE_TRIGGERS, 'focus' ) );
} );
