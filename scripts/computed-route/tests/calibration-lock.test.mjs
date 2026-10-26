// One calibration per calibration page, and one measurement of a block's library-wide slot map at a time
// (lib/calibration-lock.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acquireCalibrationLock, calibrationLockPath, acquireSlotMapLock, slotMapLockPath } from '../lib/calibration-lock.mjs';

const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-cal-lock-' ) );

test( 'MUST FAIL (2026-10-07, mega-group read a nav-bar-menu root): a second calibration on the same site refuses while the first runs', () => {
	const dir = tmp();
	const first = acquireCalibrationLock( 'local-eye-care', { dir, pid: 101, blocks: [ 'sgs/nav-bar-menu' ], isAlive: () => true } );
	assert.throws( () => acquireCalibrationLock( 'local-eye-care', { dir, pid: 202, blocks: [ 'sgs/mega-group' ], isAlive: () => true } ), /another calibration is using local-eye-care's calibration page \(pid 101, sgs\/nav-bar-menu/ );
	first.release();
} );

test( 'positive control: after release, on another site, or over a dead owner, the lock is taken', () => {
	const dir = tmp();
	const first = acquireCalibrationLock( 'local-eye-care', { dir, pid: 101, isAlive: () => true } );
	assert.ok( acquireCalibrationLock( 'local-sandybrown', { dir, pid: 202, isAlive: () => true } ), 'another site has its own page' );
	first.release();
	first.release();
	const second = acquireCalibrationLock( 'local-eye-care', { dir, pid: 202, isAlive: () => true } );
	assert.equal( JSON.parse( fs.readFileSync( second.file, 'utf8' ) ).pid, 202 );
	// A crashed run (its process gone) never blocks the next one.
	const third = acquireCalibrationLock( 'local-eye-care', { dir, pid: 303, isAlive: () => false } );
	assert.equal( JSON.parse( fs.readFileSync( third.file, 'utf8' ) ).pid, 303 );
	// A stale owner's release does not remove the lock that replaced it.
	second.release();
	assert.ok( fs.existsSync( calibrationLockPath( 'local-eye-care', dir ) ) );
} );

test( 'a lock file still being written counts as held while fresh, and is taken once stale', () => {
	const dir = tmp();
	const file = calibrationLockPath( 'eye-care-test', dir );
	fs.writeFileSync( file, '' );
	const at = fs.statSync( file ).mtimeMs;
	assert.throws( () => acquireCalibrationLock( 'eye-care-test', { dir, pid: 1, now: () => at + 1000 } ), /a lock still being written/ );
	assert.ok( acquireCalibrationLock( 'eye-care-test', { dir, pid: 1, now: () => at + 120000 } ) );
} );

test( 'MUST FAIL (two mirrors re-measured one shared slot map): a second run measuring the same block\'s slot map refuses, whatever its site', () => {
	const dir = tmp();
	const first = acquireSlotMapLock( 'sgs/buybox', { dir, site: 'local-one', pid: 101, isAlive: () => true } );
	assert.equal( first.file, slotMapLockPath( 'sgs/buybox', dir ) );
	assert.equal( path.basename( first.file ), 'buybox.slotmap.lock', 'beside the slot map cache/buybox.json' );
	assert.throws( () => acquireSlotMapLock( 'sgs/buybox', { dir, site: 'local-two', pid: 202, isAlive: () => true } ), /another calibration is measuring sgs\/buybox's slot map \(pid 101 on local-one/ );
	first.release();
} );

test( 'positive control: another block, a released lock or a dead owner lets the slot map be measured', () => {
	const dir = tmp();
	const first = acquireSlotMapLock( 'sgs/buybox', { dir, site: 'local-one', pid: 101, isAlive: () => true } );
	assert.ok( acquireSlotMapLock( 'sgs/cart', { dir, site: 'local-two', pid: 202, isAlive: () => true } ), 'another block has its own slot map' );
	first.release();
	assert.equal( fs.existsSync( first.file ), false, 'release removes the lock' );
	const second = acquireSlotMapLock( 'sgs/buybox', { dir, site: 'local-two', pid: 202, isAlive: () => true } );
	assert.equal( JSON.parse( fs.readFileSync( second.file, 'utf8' ) ).pid, 202 );
	const third = acquireSlotMapLock( 'sgs/buybox', { dir, site: 'local-three', pid: 303, isAlive: () => false } );
	assert.equal( JSON.parse( fs.readFileSync( third.file, 'utf8' ) ).pid, 303, 'a crashed run never blocks the next' );
	second.release();
	assert.ok( fs.existsSync( third.file ), 'a stale owner\'s release leaves the lock that replaced it' );
} );
