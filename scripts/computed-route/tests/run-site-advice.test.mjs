// A route run aimed at a site with --site names that site in every paint-gate message it prints, never the mirror the surface
// entry in surfaces.json records: on 2026-11-19 a site run on a scratch copy of local-indus printed "calibrate.mjs --site
// local-indus" (the hand-finished mirror) because the propose stage read the surface entry's site. Checks the messages and the
// wiring; runs no route command and contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertPaints } from '../lib/paint-gate.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const src = ( f ) => fs.readFileSync( path.join( ROUTE, f ), 'utf8' );

test( 'the paint gate names the site it is given in its advice', () => {
	assert.throws( () => assertPaints( { blocks: [ 'sgs/hero' ], calFor: () => ( { paintMissing: true } ), site: 'local-mediatest-x', client: 'c', what: 'fill home', log: () => {} } ), /calibrate\.mjs --site local-mediatest-x / );
} );

test( 'MUST FAIL: site-run passes its own --site to the propose stage and to Fill', () => {
	assert.match( src( 'site-run.mjs' ), /proposeSurface\( \{ client, surface: key, allowMissingPaint, site, runLedger: ledger \} \)/ );
	assert.match( src( 'site-run.mjs' ), /'--site', site, '--allow-external'/ );
} );

test( 'MUST FAIL: the propose stage and Fill gate paint on the run\'s site before the surface entry\'s', () => {
	assert.match( src( 'skeleton.mjs' ), /const site = runSite \?\? readSurface\( repo, client, surface \)\.site;/ );
	assert.match( src( 'skeleton.mjs' ), /assertSkeletonPaints\( \{ skeleton: r\.skeleton, site, client,/ );
	assert.match( src( 'fill.mjs' ), /const site = o\.site \|\| entry\.site;\n[^\n]*\n?\s*const calFor = calibrationLoader\( site, o\.cache \);/ );
	assert.match( src( 'fill.mjs' ), /assertPaints\( \{ blocks: treeBlocks\( skeleton \), calFor, site, client: o\.client,/ );
	assert.match( src( 'fill.mjs' ), /site: flag\( '--site' \),/ );
} );
