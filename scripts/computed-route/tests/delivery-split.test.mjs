// Proves the delivered / partial / missing split of a record's live rows (lib/verify-live.mjs::deliveryOf) and that
// delivery-map --status prints it with a count line read from verify.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { deliveryOf } from '../lib/verify-live.mjs';
import { liveStatus } from '../lib/delivery-map.mjs';
import { REPO } from '../lib/capabilities.mjs';

const row = ( over = {} ) => ( { record: 'A-01', target: 'el', state: 'rest', ok: true, measured: 1, want: 1, status: 'done', ...over } );

test( 'every row ok on the live site is delivered', () => {
	assert.equal( deliveryOf( [ row(), row( { state: 'hover' } ) ] ).delivery, 'delivered' );
} );

test( 'some rows ok and some failed is partial and names what differs', () => {
	const d = deliveryOf( [ row(), row( { state: 'hover', ok: false, status: 'failed', measured: 'none', want: 'transform' } ) ] );
	assert.equal( d.delivery, 'partial' );
	assert.match( d.why, /hover/ );
} );

test( 'no row ok, or no row at all, is missing', () => {
	assert.equal( deliveryOf( [ row( { ok: false, status: 'failed' } ) ] ).delivery, 'missing' );
	assert.equal( deliveryOf( [] ).delivery, 'missing' );
} );

test( 'negative control: a mirror-only row is never delivered', () => {
	assert.notEqual( deliveryOf( [ row( { status: 'built-not-pushed' } ) ] ).delivery, 'delivered' );
} );

test( 'liveStatus carries the delivery of the key', () => {
	assert.equal( liveStatus( 'animation:A-01', { rows: [ row(), row( { ok: false, status: 'failed' } ) ] } ).delivery, 'partial' );
	assert.equal( liveStatus( 'animation:A-02', { rows: [ row() ] } ).delivery, 'missing' );
} );

test( '--status prints a delivered / partial / missing count line from a verify.json', () => {
	const f = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'dsplit-' ) ), 'verify.json' );
	fs.writeFileSync( f, JSON.stringify( { rows: [ row( { record: 'A-01' } ), row( { record: 'A-02' } ), row( { record: 'A-02', state: 'hover', ok: false, status: 'failed' } ) ] } ) );
	const r = spawnSync( process.execPath, [ path.join( REPO, 'scripts', 'computed-route', 'delivery-map.mjs' ), 'indus-foods', '--status', '--verify', f ], { encoding: 'utf8', cwd: REPO } );
	assert.match( r.stdout, /^animation:A-01: done \[delivered\]/m );
	assert.match( r.stdout, /^animation:A-02: not done \[partial\]/m );
	assert.match( r.stdout, /^live delivery: delivered \d+, partial \d+, missing \d+ of \d+ animation records/m );
} );
