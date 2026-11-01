// Spec 48 §3.2: lib/cache-dir.mjs::routeCacheDir takes the environment variable first, then the first non-empty line of
// cache-dir.local, then the route's own cache folder; another repo (a test's temporary one) ignores both overrides; and the
// resolver creates nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { routeCacheDir, readCacheDirFile, CACHE_ENV } from '../lib/cache-dir.mjs';

const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cache-dir-' ) );

test( 'the environment variable wins and resolves to an absolute path', () => {
	const dir = tmp();
	assert.equal( routeCacheDir( undefined, { [ CACHE_ENV ]: dir } ), path.resolve( dir ) );
	assert.ok( path.isAbsolute( routeCacheDir( undefined, { [ CACHE_ENV ]: dir } ) ) );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'an empty or blank environment variable is ignored', () => {
	assert.equal( routeCacheDir( undefined, { [ CACHE_ENV ]: '   ' } ), routeCacheDir( undefined, {} ) );
} );

test( 'the override file: first non-empty line, BOM and CRLF removed; a missing file is null', () => {
	const dir = tmp();
	const file = path.join( dir, 'cache-dir.local' );
	assert.equal( readCacheDirFile( file ), null );
	fs.writeFileSync( file, '\uFEFF\r\n  E:\some-cache  \r\nsecond line\r\n' );
	assert.equal( readCacheDirFile( file ), 'E:\some-cache' );
	fs.writeFileSync( file, '\n\n' );
	assert.equal( readCacheDirFile( file ), null );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'another repo gets its own cache folder, whatever the overrides say, and nothing is created', () => {
	const repo = tmp();
	const env = { [ CACHE_ENV ]: path.join( repo, 'elsewhere' ) };
	assert.equal( routeCacheDir( repo, env ), path.join( repo, 'scripts', 'computed-route', 'cache' ) );
	assert.deepEqual( fs.readdirSync( repo ), [], 'the resolver wrote nothing' );
	fs.rmSync( repo, { recursive: true, force: true } );
} );
