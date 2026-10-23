import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dropsReport, newestChecked, runStatus } from '../lib/census-drops-report.mjs';

const row = ( property, over = {} ) => ( { draft: '{"tpl":"Root/1#0"}', node: 'cr-ref-s-1', block: 'sgs/icon', slot: '', property, width: 1440, value: '5px', ...over } );

// A run folder of client c, surface s: one write (color) and the given declared reads; reads null = a run saved before the check.
function run( name, reads, report = {} ) {
	const dir = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'drops-' ) ), name );
	fs.mkdirSync( dir );
	fs.writeFileSync( path.join( dir, 'fill-report.json' ), JSON.stringify( { client: 'c', surface: 's', writes: [ { node: 'cr-ref-s-1', slot: '', prop: 'color', widths: [ 1440 ], how: 'single' } ], ...report } ) );
	fs.writeFileSync( path.join( dir, 'unmapped.json' ), '[]' );
	reads && fs.writeFileSync( path.join( dir, 'reads.json' ), JSON.stringify( { version: 1, client: 'c', surface: 's', rows: reads } ) );
	return dir;
}

test( 'MUST FAIL: a run with no fill-report.json is incomplete, one with no reads.json is no-read-set, neither is checked', () => {
	const empty = fs.mkdtempSync( path.join( os.tmpdir(), 'drops-' ) );
	assert.equal( runStatus( empty ).status, 'incomplete' );
	const noUnmapped = run( 'a', [ row( 'color' ) ] );
	fs.unlinkSync( path.join( noUnmapped, 'unmapped.json' ) );
	assert.equal( runStatus( noUnmapped ).status, 'incomplete' );
	const noReport = run( 'b', [ row( 'color' ) ] );
	fs.unlinkSync( path.join( noReport, 'fill-report.json' ) );
	assert.equal( runStatus( noReport ).status, 'incomplete' );
	assert.equal( runStatus( run( 'old', null ) ).status, 'no-read-set' );
	const checked = runStatus( run( 'new', [ row( 'color' ), row( 'gap' ) ] ) );
	assert.deepEqual( [ checked.status, checked.reads, checked.dropped ], [ 'checked', 2, 1 ] );
} );

test( 'MUST FAIL: the newest checked run of each surface is the one reported, by name order', () => {
	const runs = [ runStatus( run( '2026-10-22', [ row( 'gap' ) ] ) ), runStatus( run( '2026-10-23', [ row( 'color' ) ] ) ), runStatus( run( '2026-10-24', null ) ) ];
	const newest = newestChecked( runs );
	assert.equal( newest.length, 1 );
	assert.equal( newest[ 0 ][ 1 ].name, '2026-10-23' );
} );

test( 'MUST FAIL: the report lists every run folder and, for the newest checked run, each dropped row under its block', () => {
	const md = dropsReport( [ run( '2026-10-22', null ), run( '2026-10-23', [ row( 'letter-spacing', { value: '-0.01em' } ), row( 'color' ), row( 'gap', { block: 'sgs/button', width: 375 } ) ] ) ], '2026-10-23' );
	assert.match( md, /\| 2026-10-22 \| c \/ s \| no-read-set \|/ );
	assert.match( md, /\| 2026-10-23 \| c \/ s \| checked \| 3 \| 2 \|/ );
	assert.match( md, /## c\/s: 2026-10-23\n\n2 of 3 declared reads dropped \(1 conserved, 0 CSS-wide/ );
	assert.match( md, /### sgs\/button \(1\)/ );
	assert.match( md, /### sgs\/icon \(1\)/ );
	assert.match( md, /\| letter-spacing \| \{"tpl":"Root\/1#0"\} \| cr-ref-s-1 \| \(root\) \| 1440 \| -0\.01em \|/ );
	assert.doesNotMatch( md, /\| color \| \{"tpl"/ );
	const two = dropsReport( [ run( '2026-10-23', [ row( 'gap', { width: 375 } ), row( 'gap', { width: 768 } ), row( 'gap', { width: 1440 } ) ] ) ], 'd' );
	assert.equal( ( two.match( /\| gap \|/g ) || [] ).length, 3 );
} );

test( 'MUST FAIL: a pipe in a value cannot break the table', () => {
	const md = dropsReport( [ run( '2026-10-23', [ row( 'content', { value: 'a|b' } ) ] ) ], 'd' );
	assert.match( md, /\| a\\\|b \|/ );
} );
