import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conservation, conservationRun, groupFailures, longhandsOf, readRowsOf } from '../lib/census-conservation.mjs';
import { readSetFile } from '../lib/census-reads.mjs';

const ROOT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

const read = ( property, value, over = {} ) => ( { draft: '{"tpl":"Root/45#0"}', node: 'cr-ref-header-15', block: 'sgs/nav-bar-menu', slot: '.link', property, width: 1440, value, ...over } );
const write = ( prop, over = {} ) => ( { node: 'cr-ref-header-15', slot: '.link', prop, attr: 'x', widths: [ 1440 ], how: 'single', ...over } );
const verdict = ( reads, report = {}, unmapped = [] ) => conservation( { reads, report: { writes: [], confirm: [], alreadyHeld: [], ledger: [], ...report }, unmapped } );

test( 'MUST FAIL: a declared value with no write, held or unwritten row is a failure carrying draft id, block, part, property, value and width', () => {
	const out = verdict( [ read( 'letter-spacing', '-0.01em' ) ], { writes: [ write( 'font-size' ) ] } );
	assert.equal( out.failures.length, 1 );
	assert.deepEqual( out.failures[ 0 ], { draft: '{"tpl":"Root/45#0"}', block: 'sgs/nav-bar-menu', node: 'cr-ref-header-15', slot: '.link', property: 'letter-spacing', value: '-0.01em', width: 1440, state: 'rest' } );
} );

test( 'MUST FAIL: a written, a held and an unwritten row each conserve their read', () => {
	const reads = [ read( 'color', 'red' ), read( 'font-size', '17px' ), read( 'display', 'block' ) ];
	const out = verdict( reads, { writes: [ write( 'color' ) ], alreadyHeld: [ { node: 'cr-ref-header-15', slot: '.link', property: 'font-size', state: null, reason: 'inherited' } ] }, [ { node: 'cr-ref-header-15', slot: '.link', property: 'display', reason: 'no-setting: x' } ] );
	assert.equal( out.conserved, 3 );
	assert.deepEqual( out.failures, [] );
} );

test( 'MUST FAIL: two widths are not merged (a write at 1440 does not answer the read at 375)', () => {
	const out = verdict( [ read( 'color', 'red', { width: 375 } ), read( 'color', 'red', { width: 1440 } ) ], { writes: [ write( 'color' ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.width ), [ 375 ] );
} );

test( 'MUST FAIL: a confirm record answers its own width only', () => {
	const out = verdict( [ read( 'color', 'red', { width: 375 } ), read( 'color', 'red', { width: 768 } ) ], { confirm: [ { node: 'cr-ref-header-15', slot: '.link', property: 'color', width: 768, state: 'default' } ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.width ), [ 375 ] );
} );

test( 'MUST FAIL: a state write or state held row never answers a rest read', () => {
	const out = verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { state: 'hover' } ) ], alreadyHeld: [ { node: 'cr-ref-header-15', slot: '.link', property: 'color', state: 'hover', reason: 'covered' } ] } );
	assert.equal( out.failures.length, 1 );
} );

test( 'MUST FAIL: the same property on another part or another node does not answer', () => {
	const out = verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { slot: '.other' } ), write( 'color', { node: 'cr-ref-header-16' } ) ] } );
	assert.equal( out.failures.length, 1 );
} );

test( 'MUST FAIL: a shorthand write answers the longhands it sets, and only those', () => {
	const out = verdict( [ read( 'border-top-left-radius', '4px' ), read( 'border-top-width', '1px' ), read( 'margin-top', '2px' ) ], { writes: [ write( 'border-radius' ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.property ).sort(), [ 'border-top-width', 'margin-top' ] );
	assert.ok( longhandsOf( 'border' ).includes( 'border-top-width' ) );
	assert.ok( ! longhandsOf( 'border-radius' ).includes( 'border-top-width' ) );
} );

test( 'MUST FAIL: a CSS-wide keyword is excluded and counted, a real value beside it is not', () => {
	const out = verdict( [ read( 'background-size', 'initial' ), read( 'background-size', 'cover', { slot: '.b' } ) ] );
	assert.equal( out.excluded.cssWide, 1 );
	assert.equal( out.failures.length, 1 );
	assert.equal( out.failures[ 0 ].value, 'cover' );
} );

test( 'MUST FAIL: a motion write answers the transition longhands of its own element and nothing else', () => {
	const out = verdict( [ read( 'transition-duration', '0.2s' ), read( 'transition-duration', '0.2s', { slot: '.other' } ), read( 'color', 'red' ) ], { writes: [ write( '', { how: 'fill-timing' } ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => `${ f.slot } ${ f.property }` ).sort(), [ '.link color', '.other transition-duration' ] );
} );

test( 'MUST FAIL: failures group by block then property', () => {
	const g = groupFailures( [ read( 'a', '1' ), read( 'a', '2', { width: 375 } ), read( 'b', '1' ), read( 'a', '1', { block: 'sgs/button' } ) ] );
	assert.deepEqual( g.map( ( x ) => `${ x.block } ${ x.property } ${ x.count }` ), [ 'sgs/button a 1', 'sgs/nav-bar-menu a 2', 'sgs/nav-bar-menu b 1' ] );
} );

test( 'MUST FAIL: a malformed read set is an explicit failure with its reason', () => {
	assert.throws( () => readRowsOf( { version: 2, rows: [] } ), /not a read set/ );
	assert.throws( () => readRowsOf( { version: 1, rows: [ { ...read( 'a', '1' ), width: 'x' } ] } ), /numeric width/ );
	assert.throws( () => readRowsOf( { version: 1, rows: [ { ...read( 'a', '1' ), slot: undefined } ] } ), /no slot/ );
	assert.throws( () => readRowsOf( { version: 1, rows: [ { ...read( 'a', '1' ), value: null } ] } ), /no value/ );
} );

test( 'readSetFile makes one row per declared longhand per width a part was found at', () => {
	const nodes = [ { name: 'sgs/nav-bar-menu', targets: [ { id: '0:.link', finder: { tpl: 'Root/45#0' } } ] } ];
	const reads = { declared: { 375: { '0:.link': { color: 'red' } }, 1440: { '0:.link': { color: 'red', 'letter-spacing': '-0.01em' } } }, widths: { 375: { '0:.link': { missing: true } }, 1440: { '0:.link': {} } } };
	const file = readSetFile( { client: 'c', surface: 's', reads, nodes, refs: [ 'cr-ref-s-0' ] } );
	assert.deepEqual( file.rows.map( ( r ) => `${ r.width } ${ r.property } ${ r.draft }` ), [ '1440 color {"tpl":"Root/45#0"}', '1440 letter-spacing {"tpl":"Root/45#0"}' ] );
	assert.equal( readRowsOf( file ).length, 2 );
} );

function plant( reads ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'conserve-' ) );
	const report = { client: 'c', surface: 's', writes: [ write( 'color' ) ], alreadyHeld: [], confirm: [], ledger: [] };
	fs.writeFileSync( path.join( dir, 'fill-report.json' ), JSON.stringify( report ) );
	fs.writeFileSync( path.join( dir, 'unmapped.json' ), '[]' );
	reads && fs.writeFileSync( path.join( dir, 'reads.json' ), JSON.stringify( { version: 1, client: 'c', surface: 's', rows: reads } ) );
	return dir;
}
const check = ( dir ) => spawnSync( process.execPath, [ path.join( ROOT, 'census.mjs' ), dir, '--check' ], { encoding: 'utf8' } );

test( 'MUST FAIL: census.mjs --check exits 1 on a dropped declared value and lists its row', () => {
	const bad = check( plant( [ read( 'color', 'red' ), read( 'letter-spacing', '-0.01em' ) ] ) );
	assert.equal( bad.status, 1, bad.stdout + bad.stderr );
	assert.match( bad.stdout, /CONSERVATION: 1 of 2 declared reads dropped/ );
	assert.match( bad.stdout, /sgs\/nav-bar-menu letter-spacing/ );
	assert.match( bad.stdout, /Root\/45#0/ );
	assert.match( bad.stdout, /-0\.01em/ );
	const ok = check( plant( [ read( 'color', 'red' ) ] ) );
	assert.equal( ok.status, 0, ok.stdout + ok.stderr );
	assert.match( ok.stdout, /CONSERVATION: 1 declared reads, 1 conserved, 0 dropped/ );
} );

test( 'MUST FAIL: a run with no read set is reported as such and fails --check, never clean', () => {
	const dir = plant( null );
	assert.equal( conservationRun( dir ).status, 'no-read-set' );
	const bad = check( dir );
	assert.equal( bad.status, 1 );
	assert.match( bad.stdout, /CONSERVATION: not checked/ );
} );

test( 'MUST FAIL: a read set of another surface is refused', () => {
	const dir = plant( [ read( 'color', 'red' ) ] );
	const f = path.join( dir, 'reads.json' );
	fs.writeFileSync( f, JSON.stringify( { ...JSON.parse( fs.readFileSync( f, 'utf8' ) ), surface: 'footer' } ) );
	assert.throws( () => conservationRun( dir ), /read set of c\/footer/ );
} );

test( 'MUST FAIL: --json carries the conservation result', () => {
	const r = spawnSync( process.execPath, [ path.join( ROOT, 'census.mjs' ), plant( [ read( 'letter-spacing', '-0.01em' ) ] ), '--json' ], { encoding: 'utf8' } );
	assert.equal( JSON.parse( r.stdout ).conservation.failures[ 0 ].property, 'letter-spacing' );
} );
