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

// The deploy key (§3.2): webpack's module number depends on the build folder, so two builds of one commit must hash
// alike, while any real change to the bundle must not.
import { normaliseBundle } from '../calibrate.mjs';

const bundle = ( id, attr ) => `var e={${ id }(){const e="${ attr }";}},t={};function r(n){return e[n]()}r(${ id }),document.x;`;

test( 'two builds of one commit (module 2310 and 6469) normalise to the same text', () => {
	assert.equal( normaliseBundle( './view.js', bundle( 2310, 'data-a' ) ), normaliseBundle( './view.js', bundle( 6469, 'data-a' ) ) );
	assert.equal( normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'abc');" ), normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'def');" ) );
} );

test( 'MUST FAIL TO MATCH: a real code change still differs after normalising', () => {
	assert.notEqual( normaliseBundle( './view.js', bundle( 2310, 'data-a' ) ), normaliseBundle( './view.js', bundle( 6469, 'data-b' ) ) );
	assert.notEqual( normaliseBundle( './view.asset.php', "array('dependencies' => array('a'), 'version' => 'x')" ), normaliseBundle( './view.asset.php', "array('dependencies' => array('b'), 'version' => 'x')" ) );
} );
