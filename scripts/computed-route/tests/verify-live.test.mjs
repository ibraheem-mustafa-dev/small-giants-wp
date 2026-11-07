// Proves the verify.json writer: a mirror-host row is built-not-pushed and never makes a key done, a sampled 1-of-N row is
// sampled and never done, a failed row keeps it not done, and the CLI refuses a mirror host and a missing commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { buildRows, isMirrorHost, rowsFromFindings, rowStatus } from '../lib/verify-live.mjs';
import { liveStatus } from '../lib/delivery-map.mjs';
import { REPO } from '../lib/capabilities.mjs';

const CLI = path.join( REPO, 'scripts', 'computed-route', 'verify-live.mjs' );
const m = ( over = {} ) => ( { record: 'A-1', target: 'hero', state: 'load', ok: true, measured: 'm', want: 'w', ...over } );
const opts = { commit: 'abc', hasCommit: ( c ) => 'abc' === c, evidence: 'e.json', now: new Date( '2026-11-07T10:00:00Z' ) };
const stateOf = ( rows ) => liveStatus( 'animation:A-1', { rows } ).state;

test( 'mirror hosts are recognised and a test host is not one', () => {
	for ( const h of [ 'http://localhost:8083/', '127.0.0.1', 'http://192.168.1.4', 'local-indus', 'site.local' ] ) {
		assert.equal( isMirrorHost( h ), true, h );
	}
	assert.equal( isMirrorHost( 'https://lavender-dinosaur-183533.hostingersite.com/' ), false );
} );

test( 'a test-site row at a real commit is done', () => {
	const rows = buildRows( [ m() ], { ...opts, host: 'https://t.example.com', testHosts: new Set( [ 't.example.com' ] ) } );
	assert.equal( rows[ 0 ].status, 'done' );
	assert.equal( rows[ 0 ].host, 't.example.com' );
	assert.equal( rows[ 0 ].measured_at, '2026-11-07T10:00:00.000Z' );
	assert.equal( stateOf( rows ), 'done' );
} );

test( 'negative control: a mirror-host row cannot make a key done', () => {
	const rows = buildRows( [ m() ], { ...opts, host: 'http://localhost:8083/' } );
	assert.equal( rows[ 0 ].status, 'built-not-pushed' );
	assert.equal( rows[ 0 ].ok, true );
	assert.equal( stateOf( rows ), 'built-not-pushed' );
	assert.notEqual( stateOf( rows ), 'done' );
} );

test( 'negative control: a sampled 1-of-N row is sampled, not done, and one full row does not rescue it', () => {
	const host = 'https://t.example.com';
	const sampled = buildRows( [ m( { sample: { n: 1, of: 6 } } ) ], { ...opts, host } );
	assert.equal( stateOf( sampled ), 'sampled' );
	const full = buildRows( [ m( { target: 'other', sample: { n: 6, of: 6 } } ) ], { ...opts, host } );
	assert.equal( stateOf( [ ...sampled, ...full ] ), 'sampled' );
	assert.equal( stateOf( full ), 'done' );
} );

test( 'a failed row keeps the key not done even beside ok rows', () => {
	const rows = buildRows( [ m(), m( { target: 'b', ok: false } ) ], { ...opts, host: 'https://t.example.com' } );
	assert.equal( stateOf( rows ), 'not done' );
	assert.equal( rowStatus( { ok: false, host: 'https://t.example.com' } ).status, 'failed' );
} );

test( 'a row without status (apply.mjs) still counts by ok; a hand-edited ok:false sampled row is not done', () => {
	assert.equal( stateOf( [ { record: 'A-1', target: 't', state: 'load', ok: true } ] ), 'done' );
	assert.equal( stateOf( [ { record: 'A-1', target: 't', state: 'load', ok: false, status: 'sampled' } ] ), 'not done' );
} );

test( 'a live row refuses an unknown host, a missing commit and a commit the repo lacks', () => {
	assert.throws( () => buildRows( [ m() ], { ...opts, host: 'https://other.example.com', testHosts: new Set( [ 't.example.com' ] ) } ), /not a test site/ );
	assert.throws( () => buildRows( [ m() ], { ...opts, host: 'https://t.example.com', commit: null } ), /deployed commit/ );
	assert.throws( () => buildRows( [ m() ], { ...opts, host: 'https://t.example.com', commit: 'zzz' } ), /deployed commit/ );
	assert.throws( () => buildRows( [ m() ], { ...opts, host: '' } ), /host/ );
} );

test( 'detector findings become rows only when they name a record', () => {
	const r = rowsFromFindings( { C1: { findings: [ { record: 'A-1', key: 'hero hover', severity: 'fail', live: 'none', draft: 'band' }, { severity: 'fail' } ] } } );
	assert.equal( r.rows.length, 1 );
	assert.equal( r.skipped, 1 );
	assert.equal( r.rows[ 0 ].ok, false );
} );

test( 'CLI refuses a mirror host without --allow-mirror and writes built-not-pushed with it', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'verify-live-' ) );
	const rows = path.join( dir, 'rows.json' );
	fs.writeFileSync( rows, JSON.stringify( { rows: [ m() ] } ) );
	const out = path.join( dir, 'verify.json' );
	const base = [ CLI, 'indus-foods', '--site', 'http://localhost:8083/', '--measurements', rows, '--out', out ];
	const refused = spawnSync( 'node', base, { encoding: 'utf8' } );
	assert.equal( refused.status, 2 );
	assert.match( refused.stderr, /mirror/ );
	assert.equal( fs.existsSync( out ), false );
	const ok = spawnSync( 'node', [ ...base, '--allow-mirror' ], { encoding: 'utf8' } );
	assert.equal( ok.status, 0, ok.stderr );
	assert.equal( JSON.parse( fs.readFileSync( out, 'utf8' ) ).rows[ 0 ].status, 'built-not-pushed' );
} );

test( 'CLI refuses a test host that is not the client\'s', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'verify-live-' ) );
	const rows = path.join( dir, 'rows.json' );
	fs.writeFileSync( rows, JSON.stringify( [ m() ] ) );
	const r = spawnSync( 'node', [ CLI, 'indus-foods', '--site', 'https://nowhere.example.com', '--measurements', rows, '--commit', 'HEAD', '--out', path.join( dir, 'v.json' ) ], { encoding: 'utf8' } );
	assert.equal( r.status, 2 );
	assert.match( r.stderr, /not a test site|deployed commit/ );
} );
