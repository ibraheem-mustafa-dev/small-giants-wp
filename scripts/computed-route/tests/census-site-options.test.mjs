// Register D5: a motion record the site build already holds as a site option (the route fade, `sgs_motion_settings` in
// sites/<client>/build/site-options.json) is handled, not an F-behaviour row. The census reads the file's record ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { surfaceRows } from '../lib/census-mechanism.mjs';
import { siteOptionRecords, censusAll } from '../census-all.mjs';
import { openDb } from '../lib/db.mjs';

const lookup = ( slug ) => ( slug ? { slug, parent_block: null } : null );
const ROUTE = 'a one-shot animation on a route trigger: the draft\'s route drives it, which no layer or setting holds yet';
const motion = ( node, value, reason = ROUTE ) => ( { property: 'motion', value, node, reason, block: 'sgs/container', slot: '', state: null } );
const census = ( unmapped, siteRecords ) => surfaceRows( { client: 'c', surface: 's', report: null, lookup, siteRecords, run: { unmapped, held: [], writes: [], confirm: [], tree: [] } } ).rows;

test( 'MUST FAIL: a route-trigger record the site options hold is held, not F-behaviour; a record they do not hold stays F-behaviour', () => {
	const rows = census( [ motion( 'n1', 'A-12' ), motion( 'n2', 'A-12' ), motion( 'n3', 'A-38' ) ], new Set( [ 'A-12' ] ) );
	assert.deepEqual( rows.map( ( r ) => [ r.draft, r.fillClass, r.reason ] ), [ [ 'A-12', 'held', 'site-option' ], [ 'A-12', 'held', 'site-option' ], [ 'A-38', 'F-behaviour', 'trigger-no-layer' ] ] );
	assert.match( rows[ 0 ].owner, /site-options\.json/ );
} );

test( 'negative control: with no site-options.json, or a record it lacks, nothing changes; a non-motion row with the same value is untouched', () => {
	for ( const none of [ undefined, new Set(), new Set( [ 'A-99' ] ) ] ) {
		assert.deepEqual( census( [ motion( 'n1', 'A-12' ) ], none ).map( ( r ) => [ r.fillClass, r.reason ] ), [ [ 'F-behaviour', 'trigger-no-layer' ] ] );
	}
	const colour = { property: 'color', value: 'A-12', node: 'n1', reason: 'no-setting: sgs/container has no setting for color', block: 'sgs/container', slot: '' };
	assert.equal( census( [ colour ], new Set( [ 'A-12' ] ) )[ 0 ].reason, 'no-setting' );
} );

test( 'MUST FAIL: siteOptionRecords reads every option\'s record ids from the client\'s build folder, and none from a missing or unreadable file', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'site-options-' ) );
	const build = path.join( dir, 'sites', 'c', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	assert.equal( siteOptionRecords( dir, 'c' ).size, 0 );
	fs.writeFileSync( path.join( build, 'site-options.json' ), JSON.stringify( { sgs_motion_settings: { records: [ 'A-12', 'A-13' ], value: {} }, other: { records: [ 'B-1' ] }, bare: { value: 1 } } ) );
	assert.deepEqual( [ ...siteOptionRecords( dir, 'c' ) ].sort(), [ 'A-12', 'A-13', 'B-1' ] );
	fs.writeFileSync( path.join( build, 'site-options.json' ), '{ not json' );
	assert.equal( siteOptionRecords( dir, 'c' ).size, 0 );
} );

test( 'MUST FAIL: the census over a client folder counts the route fade its site-options.json holds as held, and the rest as F-behaviour', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'site-options-run-' ) );
	const build = path.join( dir, 'sites', 'c', 'build' );
	const run = path.join( build, 'qa', 'fill', 's', '2026-01-01T00-00-00' );
	fs.mkdirSync( run, { recursive: true } );
	fs.writeFileSync( path.join( run, 'unmapped.json' ), JSON.stringify( [ motion( 'cr-ref-s-1', 'A-12' ), motion( 'cr-ref-s-2', 'A-38' ) ] ) );
	fs.writeFileSync( path.join( build, 'site-options.json' ), JSON.stringify( { sgs_motion_settings: { records: [ 'A-12' ], value: {} } } ) );
	assert.deepEqual( censusAll( { root: dir, clients: [ 'c' ], db: openDb() } ).classes.counts, { held: 1, 'F-behaviour': 1 } );
} );
