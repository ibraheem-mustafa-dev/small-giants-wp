// Proves the delivery map's done status is read live: a `*.shell.json` does not crash the tree reader, a record with
// several targets is done only when every bound block carries the layer, and with no verify.json no animation key is
// reported done (lib/delivery-map.mjs top comment: the verify.json shape).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { animationEvidence, clientTrees, liveStatus } from '../lib/delivery-map.mjs';
import { recordElementKeys } from '../lib/delivery-bind.mjs';
import { REPO } from '../lib/capabilities.mjs';

const CLI = path.join( REPO, 'scripts', 'computed-route', 'delivery-map.mjs' );
const status = ( ...args ) => spawnSync( 'node', [ CLI, 'indus-foods', '--status', ...args ], { encoding: 'utf8', maxBuffer: 1 << 26 } );
const lines = ( out ) => out.split( /\r?\n/ ).filter( ( l ) => /^animation:[^ ]+: (not read live|done|not done) /.test( l ) );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'delivery-live-' ) );

test( 'a shell.json under build/trees does not crash the tree reader and its chain is read', () => {
	const root = tmp();
	const dir = path.join( root, 'sites', 'x', 'build', 'trees', 'template' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'a.shell.json' ), JSON.stringify( { chain: [ { name: 'sgs/container', attributes: {} } ], surfaces: { home: [ { name: 'sgs/group', attributes: {} } ] } } ) );
	fs.writeFileSync( path.join( dir, 'a.json' ), JSON.stringify( [ { name: 'sgs/hero', attributes: {} } ] ) );
	assert.equal( clientTrees( 'x', root ).length, 3 );
} );

test( 'a record with two targets is not done when only one bound block carries the layer', () => {
	const record = { id: 'A-X', element: { dc: 'D', template_tpl_id: [ '1', '2' ] } };
	const [ k1, k2 ] = recordElementKeys( record );
	const layer = new Set( [ 'fade' ] );
	const node = ( keys, effects ) => ( { name: 'sgs/container', attributes: {}, keys: [ keys ], effects, flags: new Set() } );
	const needsOf = () => ( { effects: [ 'fade' ], flags: [] } );
	assert.equal( animationEvidence( record, { nodes: [ node( k1, layer ), node( k2, new Set() ) ] }, [], needsOf ).ok, false );
	assert.equal( animationEvidence( record, { nodes: [ node( k1, layer ), node( k2, layer ) ] }, [], needsOf ).ok, true );
} );

test( 'status runs on indus-foods without a crash and A-16 is not reported done', () => {
	const r = status();
	assert.doesNotMatch( r.stderr, /TypeError|at walk/ );
	assert.ok( lines( r.stdout ).length > 0, 'animation lines printed' );
	assert.doesNotMatch( r.stdout, /^animation:A-16: done/m );
} );

test( 'negative control: with no verify.json no animation key is reported done', () => {
	const r = status( '--verify', path.join( tmp(), 'absent.json' ) );
	const l = lines( r.stdout );
	assert.ok( l.length > 0 );
	assert.ok( l.every( ( x ) => x.includes( ': not read live ' ) ), l.find( ( x ) => ! x.includes( 'not read live' ) ) );
} );

test( 'a fixture verify.json flips exactly one key to done and an ok:false row keeps another not done', () => {
	const keys = lines( status( '--verify', path.join( tmp(), 'absent.json' ) ).stdout ).map( ( x ) => x.split( ': ' )[ 0 ] );
	const [ good, bad ] = [ 'animation:A-16' === keys[ 0 ] ? keys[ 1 ] : keys[ 0 ], 'animation:A-16' ];
	const file = path.join( tmp(), 'verify.json' );
	const row = ( key, ok ) => ( { record: key.replace( 'animation:', '' ), target: 't', state: 'load', ok, measured: 'm', want: 'w' } );
	fs.writeFileSync( file, JSON.stringify( { generated: new Date().toISOString(), rows: [ row( good, true ), row( good, true ), row( bad, true ), row( bad, false ) ] } ) );
	const l = lines( status( '--verify', file ).stdout );
	assert.deepEqual( l.filter( ( x ) => x.includes( ": done " ) ).map( ( x ) => x.split( ': ' )[ 0 ] ), [ good ] );
	assert.match( l.find( ( x ) => x.startsWith( `${ bad }:` ) ), /: not done / );
	assert.equal( liveStatus( bad, null ).state, 'not read live' );
} );
