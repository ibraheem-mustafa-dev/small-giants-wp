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

// One library-wide cache (§3.2): a block calibrated on one site is never replaced by a run on another site unless the
// run asks for it.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { skipReason, cachedSite } from '../lib/cache.mjs';

const cacheFile = ( site ) => {
	const f = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'cr-cache-' ) ), 'heading.json' );
	fs.writeFileSync( f, JSON.stringify( { block: 'sgs/heading', site } ) );
	return f;
};

test( 'a block with no file, or a file from the same site, may be written', () => {
	assert.equal( skipReason( path.join( os.tmpdir(), 'cr-cache-none', 'heading.json' ), 'sandybrown' ), null );
	assert.equal( skipReason( cacheFile( 'sandybrown' ), 'sandybrown' ), null );
	assert.equal( skipReason( cacheFile( 'eye-care-test' ), 'sandybrown', true ), null );
} );

test( 'MUST FAIL TO REPLACE: a sandybrown run never replaces an eye-care-test file without --recalibrate', () => {
	const f = cacheFile( 'eye-care-test' );
	assert.match( skipReason( f, 'sandybrown' ), /calibrated on eye-care-test/ );
	assert.equal( cachedSite( f ), 'eye-care-test' );
} );

// The deploy key reads local text files with LF endings (§3.2): the deploy builds from a clean LF checkout, so a CRLF
// working copy of the same code must key alike, while a code change must not.
import { localBlockHash } from '../calibrate.mjs';

const buildDir = ( php ) => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-key-' ) );
	fs.writeFileSync( path.join( d, 'render.php' ), php );
	fs.writeFileSync( path.join( d, 'block.json' ), '{"name":"sgs/x"}\n' );
	return d;
};

test( 'a CRLF render.php keys the same as its LF copy', () => {
	assert.equal( localBlockHash( buildDir( '<?php\r\necho 1;\r\n' ) ), localBlockHash( buildDir( '<?php\necho 1;\n' ) ) );
} );

test( 'MUST FAIL TO MATCH: a code change in render.php changes the key, whatever its line endings', () => {
	assert.notEqual( localBlockHash( buildDir( '<?php\r\necho 2;\r\n' ) ), localBlockHash( buildDir( '<?php\necho 1;\n' ) ) );
} );
