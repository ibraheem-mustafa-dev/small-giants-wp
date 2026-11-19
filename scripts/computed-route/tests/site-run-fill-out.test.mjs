// Proves that a site run whose --stages leaves out fill builds the surface's newest Fill (fillOutDir): a build retried with
// --stages build,apply after a time-out read a new, empty stamped folder and failed "cannot read tree" (2026-11-19, Indus
// footer). A run that Fills still writes a fresh folder. Nothing runs a site: the folder listing is passed in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fillOutDir } from '../site-run.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const source = fs.readFileSync( path.join( ROUTE, 'site-run.mjs' ), 'utf8' );
const root = path.join( 'build', 'qa', 'fill', 'footer' );
// Three earlier runs: the newest holds no filled.tree.json (its Fill failed), the middle one does, and a stray folder is no run.
const listing = [ '2026-11-19T10-51-13', '2026-11-19T09-00-00', '2026-11-19T11-03-28', 'notes' ];
const filled = new Set( [ '2026-11-19T10-51-13', '2026-11-19T09-00-00', 'notes' ].map( ( d ) => path.join( root, d, 'filled.tree.json' ) ) );
const fake = { list: () => listing, exists: ( f ) => filled.has( f ) };

test( 'MUST FAIL: a run without fill reads the newest stamped folder that holds a filled tree', () => {
	assert.equal( fillOutDir( { fillRoot: root, fills: false, fresh: '2026-11-19T11-30-00', ...fake } ), path.join( root, '2026-11-19T10-51-13' ) );
} );

test( 'negative control: a run that Fills writes the fresh folder, whatever earlier Fills exist', () => {
	assert.equal( fillOutDir( { fillRoot: root, fills: true, fresh: '2026-11-19T11-30-00', ...fake } ), path.join( root, '2026-11-19T11-30-00' ) );
} );

test( 'a run without fill and no earlier Fill gets null, so the build names the missing tree', () => {
	assert.equal( fillOutDir( { fillRoot: root, fills: false, fresh: 'x', list: () => [], exists: () => false } ), null );
	assert.equal( fillOutDir( { fillRoot: root, fills: false, fresh: 'x', list: () => [ 'notes' ], exists: () => true } ), null, 'a folder that is no run stamp is never read' );
} );

test( 'MUST FAIL: the run wires fillOutDir with whether fill is among its stages', () => {
	assert.match( source, /const out = fillOutDir\( \{ fillRoot, fills: stages\.includes\( 'fill' \), fresh: stamp\(\) \} \)/ );
} );

test( 'MUST FAIL: a run without build makes no build tree, so a recorded shell that no longer matches cannot fail it', () => {
	assert.ok( source.includes( "\t\tif ( ! stages.includes( 'build' ) ) {\n\t\t\ttree = null;\n\t\t} else if ( slug ) {" ) );
} );
