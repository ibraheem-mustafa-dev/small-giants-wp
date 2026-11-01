// tools/cache-path-survey.mjs: the detector finds every hard-coded route-cache path, is quiet on the resolver's calls, and
// `--check` exits 1 on a planted hit and 0 on a clean tree. MUST FAIL: a planted JS base join, a planted Python path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hitsIn, selfTest } from '../tools/cache-path-survey.mjs';

const TOOL = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'tools', 'cache-path-survey.mjs' );
const run = ( root ) => spawnSync( process.execPath, [ TOOL, '--check', '--root', root ], { encoding: 'utf8' } );

test( 'the built-in self-test passes', () => {
	assert.deepEqual( selfTest(), [] );
} );

test( 'a planted hit is reported and --check exits 1; a clean tree exits 0', () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'cache-survey-' ) );
	fs.mkdirSync( path.join( root, 'scripts' ), { recursive: true } );
	fs.writeFileSync( path.join( root, 'scripts', 'ok.mjs' ), "const CACHE = routeCacheDir( REPO );\n" );
	assert.equal( run( root ).status, 0 );
	fs.writeFileSync( path.join( root, 'scripts', 'bad.mjs' ), "const CACHE = path.join( HERE, 'cache' );\n" );
	fs.writeFileSync( path.join( root, 'scripts', 'bad.py' ), 'CACHE = REPO / "scripts" / "computed-route" / "cache"\n' );
	const r = run( root );
	assert.equal( r.status, 1 );
	assert.match( r.stdout, /bad\.mjs:1 \[js-base-cache\]/ );
	assert.match( r.stdout, /bad\.py:1 \[py-path-segments\]/ );
	fs.rmSync( root, { recursive: true, force: true } );
} );

test( 'a marked line and a comment are not hits', () => {
	assert.equal( hitsIn( "const a = 'x/scripts/computed-route/cache'; // cache-path-ok: a label" ).length, 0 );
	assert.equal( hitsIn( "// path.join( HERE, 'cache' )" ).length, 0 );
} );
