// A route run aimed at a site with --site works on that site, never the mirror the surface entry in surfaces.json records
// (on 2026-11-19 a site run on a scratch copy of local-indus read the hand-finished mirror's records because the propose
// stage read the surface entry's site), and reads its blocks' default look from the client, whatever the site: the paint
// gate's advice names the client's site look command. Checks the messages and the wiring; runs no route command and
// contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertPaints } from '../lib/paint-gate.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const src = ( f ) => fs.readFileSync( path.join( ROUTE, f ), 'utf8' );

test( 'the paint gate names the client and its site look command in its advice', () => {
	assert.throws( () => assertPaints( { blocks: [ 'sgs/hero' ], calFor: () => ( { paintMissing: true } ), client: 'c', what: 'fill home', log: () => {} } ), /no default look for c \(sgs\/hero\)[\s\S]*site_look\.py --snapshot sites\/c\/theme-snapshot\.json --site c / );
} );

test( 'MUST FAIL: site-run passes its own --site to the propose stage and to Fill', () => {
	assert.match( src( 'site-run.mjs' ), /proposeSurface\( \{ client, surface: key, allowMissingPaint, site, runLedger: ledger \} \)/ );
	assert.match( src( 'site-run.mjs' ), /'--site', site, '--allow-external'/ );
} );

test( 'MUST FAIL: the propose stage and Fill work on the run\'s site before the surface entry\'s, and read the client\'s look', () => {
	assert.match( src( 'skeleton.mjs' ), /const site = runSite \?\? readSurface\( repo, client, surface \)\.site;/ );
	assert.match( src( 'skeleton.mjs' ), /assertSkeletonPaints\( \{ skeleton: r\.skeleton, client,/ );
	assert.match( src( 'fill.mjs' ), /const calFor = calibrationLoader\( o\.client, o\.cache \);/ );
	assert.match( src( 'fill.mjs' ), /const site = o\.site \|\| entry\.site;/ );
	assert.match( src( 'fill.mjs' ), /assertPaints\( \{ blocks: treeBlocks\( skeleton \), calFor, client: o\.client,/ );
	assert.match( src( 'fill.mjs' ), /site: flag\( '--site' \),/ );
} );
