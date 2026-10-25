// tools/no-setting-count.mjs: the newest run per surface, `no-setting` rows only, each row to the first signature its own
// fields match, the rest to "other". The fixture client holds an older and a newer run for one surface, a newer
// folder with no unmapped.json, and a surface with no usable run.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { SIGNATURES, countClient, countRows, signatureOf } from '../tools/no-setting-count.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, 'fixtures', 'no-setting-count', 'root' );
const run = ( opts = {} ) => countClient( { root: ROOT, client: 'alpha', ...opts } );

test( 'MUST FAIL the newest run holding an unmapped.json is read, and only no-setting rows are counted', () => {
	const r = run();
	assert.deepEqual( r.surfaces, { about: { run: '2026-10-02T00-00-00', total: 2 }, home: { run: '2026-10-02T00-00-00', total: 21 } } );
	assert.equal( r.total, 23 );
} );

test( 'MUST FAIL every named signature is matched by its own row and the rest are "other"', () => {
	const r = run( { surfaces: [ 'home' ] } );
	const unmatched = [];
	for ( const s of SIGNATURES ) {
		if ( 1 !== r.bySignature[ s.name ] ) {
			unmatched.push( `${ s.name }=${ r.bySignature[ s.name ] }` );
		}
	}
	assert.deepEqual( unmatched, [] );
	assert.equal( r.bySignature.other, 1 );
	assert.equal( Object.values( r.bySignature ).reduce( ( a, b ) => a + b, 0 ), r.total );
} );

test( 'MUST FAIL the first matching signature wins an overlapping row', () => {
	const row = ( block, property, value, reason = 'no-setting' ) => ( { block, property, value, state: null, reason } );
	assert.equal( signatureOf( row( 'sgs/label', 'column-gap', '8px' ) ), 'label-dot-never-emitted' );
	assert.equal( signatureOf( row( 'sgs/heading', 'transition-duration', '0s' ) ), 'zero-duration-read-as-design' );
	assert.equal( signatureOf( row( 'sgs/heading', 'transition-duration', '0.3s' ) ), 'transition-timing-reported-twice' );
	assert.equal( signatureOf( row( 'sgs/container', 'transition-property', 'x' ) ), 'transition-timing-reported-twice' );
	assert.equal( signatureOf( row( 'sgs/container', 'transition-delay', '1s' ) ), 'transition-timing-reported-twice' );
	assert.equal( signatureOf( row( 'sgs/container', 'position', 'relative', 'no-setting: the default paint is measured' ) ), 'other' );
} );

test( 'MUST FAIL a row that is not no-setting is never counted, and a refused-motion row is listed apart', () => {
	const r = run();
	assert.equal( r.total, 23 );
	assert.equal( r.motionRefusals, 1 );
} );

test( 'MUST FAIL --runs names the run, and a surface without that run is skipped', () => {
	const r = run( { stamp: '2026-10-01T00-00-00' } );
	assert.deepEqual( Object.keys( r.surfaces ), [ 'home' ] );
	assert.equal( r.total, 1 );
} );

test( 'the command prints the total, and --json prints the same counts', () => {
	const args = [ path.join( HERE, '..', 'tools', 'no-setting-count.mjs' ), 'alpha', '--root', ROOT ];
	const text = spawnSync( process.execPath, args, { encoding: 'utf8' } );
	assert.equal( text.status, 0 );
	assert.match( text.stdout, /^no-setting rows: 23 across 2 surfaces/ );
	assert.equal( JSON.parse( spawnSync( process.execPath, [ ...args, '--json' ], { encoding: 'utf8' } ).stdout ).total, 23 );
	assert.equal( spawnSync( process.execPath, [ args[ 0 ] ], { encoding: 'utf8' } ).status, 2 );
} );

test( 'MUST FAIL a held-default row is its own line, in no signature, and still part of the total', () => {
	const row = ( extra ) => ( { block: 'sgs/container', property: 'box-shadow', value: 'x', state: 'hover', reason: 'no-setting: sgs/container has no setting for box-shadow', ...extra } );
	const r = countRows( [ row( {} ), row( { code: 'held:default' } ), row( { reason: 'no-setting: y; held (default): the block paints it' } ), row( { code: 'held:inert' } ) ] );
	assert.equal( r.total, 4 );
	assert.equal( r.heldDefault, 2 );
	assert.equal( r.bySignature[ 'container-hover-shadow' ], 2, 'the held-default rows are in no signature; an inert hold stays in its signature' );
	assert.equal( Object.values( r.bySignature ).reduce( ( a, b ) => a + b, 0 ) + r.heldDefault, r.total );
} );

test( 'MUST FAIL the command prints the held-default line', () => {
	const out = spawnSync( process.execPath, [ path.join( HERE, '..', 'tools', 'no-setting-count.mjs' ), 'alpha', '--root', ROOT ], { encoding: 'utf8' } ).stdout;
	assert.match( out, /^\s+\d+  held-default \(judged live\)$/m );
} );
