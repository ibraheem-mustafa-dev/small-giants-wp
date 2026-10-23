// Proves the FR-33-12 route gate: a snapshot whose recorded MANIFEST hashes differ from the export's current MANIFEST.json,
// or that records none, fails closed with a clear message; a fresh one loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadSnapshot } from '../lib/normalise.mjs';
import { assertSnapshotFresh, freshnessProblem, isSourcePath, manifestHashes } from '../lib/snapshot-freshness.mjs';

const FILES = [
	{ path: 'Home.dc.html', sha256: 'aaa' },
	{ path: 'README.md', sha256: 'rrr' },
	{ path: 'tokens/colors.css', sha256: 'ccc' },
	{ path: 'assets/logo.svg', sha256: 'sss' },
];
const HASHES = { 'Home.dc.html': 'aaa', 'tokens/colors.css': 'ccc' };

// A site folder with a handoff/MANIFEST.json and a snapshot carrying `recorded` (undefined = no key).
function site( recorded ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fresh-' ) );
	fs.mkdirSync( path.join( dir, 'handoff' ) );
	fs.writeFileSync( path.join( dir, 'handoff', 'MANIFEST.json' ), JSON.stringify( { files: FILES } ) );
	const snap = { settings: { color: { palette: [ { slug: 'ink', color: '#141414' } ] } }, _sgsExtractor: undefined === recorded ? {} : { manifest_sha256: recorded } };
	const file = path.join( dir, 'theme-snapshot.json' );
	fs.writeFileSync( file, JSON.stringify( snap ) );
	return file;
}

test( 'the key covers drafts and tokens/*.css only, never the README or assets', () => {
	assert.deepEqual( manifestHashes( { files: FILES } ), HASHES );
	assert.equal( isSourcePath( 'tokens\\spacing.css' ), true );
	assert.equal( isSourcePath( 'README.md' ), false );
} );

test( 'a fresh snapshot loads', () => {
	const file = site( HASHES );
	assert.doesNotThrow( () => assertSnapshotFresh( file ) );
	assert.equal( loadSnapshot( file ).palette[ 0 ].slug, 'ink' );
} );

test( 'a stale snapshot fails closed and names the changed file', () => {
	const file = site( { ...HASHES, 'tokens/colors.css': 'old' } );
	assert.throws( () => loadSnapshot( file ), /is stale: its recorded hashes differ from the current MANIFEST\.json for: tokens\/colors\.css.*extract\.py/s );
} );

test( 'a snapshot with no recorded key fails closed', () => {
	assert.throws( () => loadSnapshot( site( undefined ) ), /records no _sgsExtractor\.manifest_sha256/ );
	assert.throws( () => loadSnapshot( site( {} ) ), /records no _sgsExtractor\.manifest_sha256/ );
} );

test( 'a draft added to or removed from the export is a difference', () => {
	assert.match( freshnessProblem( { 'Home.dc.html': 'aaa' }, HASHES ), /tokens\/colors\.css/ );
	assert.match( freshnessProblem( { ...HASHES, 'Gone.dc.html': 'x' }, HASHES ), /Gone\.dc\.html/ );
	assert.equal( freshnessProblem( HASHES, { ...HASHES } ), null );
} );

test( 'a site folder with no MANIFEST.json is not gated', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fresh-' ) );
	const file = path.join( dir, 'theme-snapshot.json' );
	fs.writeFileSync( file, JSON.stringify( { settings: {} } ) );
	assert.doesNotThrow( () => loadSnapshot( file ) );
} );
