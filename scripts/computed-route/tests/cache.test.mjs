// Proves FR-48-2 / §3.2: a calibration has two outputs. The slot map is one library-wide file per block, replaced on
// another site only with --recalibrate; the default paint is one file per site and block (cache/<site>/<block>.paint.json),
// keyed by paintKey. A run on one site never reads or overwrites another site's default paint, and a paint whose
// paintKey no longer matches is stale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { splitCalibration, writeSlotMap, writePaint, readPaint, readSlotMap, loadCalibration, slotMapSkip, paintSkip, paintStale, paintFile, paintSite } from '../lib/cache.mjs';
import { calibrationFor } from '../solve.mjs';
import { splitCache, placeMirrorPaint } from '../split-cache.mjs';

const el = ( colour ) => ( { '': { 375: { color: colour }, 768: { color: colour }, 1440: { color: colour } } } );
const measured = ( site, colour, slotKey = 'k1' ) => ( { block: 'sgs/heading', site, slotKey, paintKey: `${ slotKey }-snap-${ site }`, playwrightVersion: '1', browserVersion: '2', measured: 'now', settings: { fontSize: { slot: '', property: 'font-size' } }, elements: el( colour ), dead: [] } );
const fresh = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-cache2-' ) );
// What a calibrate.mjs run on `site` writes into `dir`, under the same rules: each output only when due.
function run( dir, site, colour, { recalibrate = false, slotKey = 'k1' } = {} ) {
	const file = measured( site, colour, slotKey );
	const { slotMap, paint } = splitCalibration( file );
	slotMapSkip( dir, 'sgs/heading', site, slotKey, recalibrate ) || writeSlotMap( dir, 'sgs/heading', slotMap );
	paintSkip( dir, 'sgs/heading', site, file.paintKey, recalibrate ) || writePaint( dir, site, 'sgs/heading', paint );
}

test( 'the slot map holds no default paint and the paint file holds nothing but paint', () => {
	const { slotMap, paint } = splitCalibration( measured( 'a', 'red' ) );
	assert.ok( ! ( 'elements' in slotMap ) && ! ( 'paintKey' in slotMap ) );
	assert.deepEqual( Object.keys( slotMap.settings ), [ 'fontSize' ] );
	assert.deepEqual( Object.keys( paint ).sort(), [ 'block', 'browserVersion', 'elements', 'measured', 'paintKey', 'playwrightVersion', 'site', 'slotKey' ] );
} );

test( 'a run on site B leaves site A paint file byte-identical and writes B own', () => {
	const dir = fresh();
	run( dir, 'site-a', 'red' );
	const before = fs.readFileSync( paintFile( dir, 'site-a', 'sgs/heading' ) );
	run( dir, 'site-b', 'blue' );
	assert.ok( before.equals( fs.readFileSync( paintFile( dir, 'site-a', 'sgs/heading' ) ) ) );
	assert.equal( readPaint( dir, 'site-b', 'sgs/heading' ).elements[ '' ][ 1440 ].color, 'blue' );
} );

test( 'a slot map measured on A is not replaced by B without --recalibrate, and is with it', () => {
	const dir = fresh();
	run( dir, 'site-a', 'red' );
	run( dir, 'site-b', 'blue' );
	assert.equal( readSlotMap( dir, 'sgs/heading' ).site, 'site-a' );
	assert.match( slotMapSkip( dir, 'sgs/heading', 'site-b', 'k1' ), /calibrated on site-a/ );
	run( dir, 'site-b', 'blue', { recalibrate: true } );
	assert.equal( readSlotMap( dir, 'sgs/heading' ).site, 'site-b' );
} );

test( 'a paint file with a stale paintKey is reported stale and re-measured; a current one is kept', () => {
	const dir = fresh();
	run( dir, 'site-a', 'red' );
	assert.equal( paintStale( dir, 'sgs/heading', 'site-a', 'k1-snap-site-a' ), false );
	assert.match( paintSkip( dir, 'sgs/heading', 'site-a', 'k1-snap-site-a' ), /current/ );
	assert.equal( paintStale( dir, 'sgs/heading', 'site-a', 'k1-snap-CHANGED' ), true );
	assert.equal( paintSkip( dir, 'sgs/heading', 'site-a', 'k1-snap-CHANGED' ), null );
	assert.equal( paintSkip( dir, 'sgs/heading', 'site-b', 'k1-snap-site-a' ), null, 'another site current paint never counts for this one' );
} );

test( 'a slot map whose slotKey is current is kept on its own site; a changed key is re-measured', () => {
	const dir = fresh();
	run( dir, 'site-a', 'red' );
	assert.match( slotMapSkip( dir, 'sgs/heading', 'site-a', 'k1' ), /current/ );
	assert.equal( slotMapSkip( dir, 'sgs/heading', 'site-a', 'k2' ), null );
} );

test( 'MUST FAIL TO SHARE: a reader asked for site B paint never returns A', () => {
	const dir = fresh();
	run( dir, 'site-a', 'red' );
	assert.equal( readPaint( dir, 'site-b', 'sgs/heading' ), null );
	const cal = loadCalibration( dir, 'sgs/heading', 'site-b' );
	assert.deepEqual( cal.elements, {} );
	assert.match( cal.paintMissing, /site-b/ );
	assert.deepEqual( calibrationFor( 'sgs/heading', 'site-b', dir ).elements, {} );
	assert.equal( calibrationFor( 'sgs/heading', 'site-a', dir ).elements[ '' ][ 1440 ].color, 'red' );
	// A paint file copied into B's folder but naming A is not B's.
	fs.mkdirSync( path.join( dir, 'site-b' ), { recursive: true } );
	fs.copyFileSync( paintFile( dir, 'site-a', 'sgs/heading' ), paintFile( dir, 'site-b', 'sgs/heading' ) );
	assert.equal( readPaint( dir, 'site-b', 'sgs/heading' ), null );
	assert.throws( () => paintFile( dir, '../site-a', 'sgs/heading' ) );
} );

test( 'split-cache moves a combined file into slot map and paint, and a second run changes nothing', () => {
	const dir = fresh();
	fs.writeFileSync( path.join( dir, 'heading.json' ), JSON.stringify( measured( 'site-a', 'red' ) ) );
	fs.writeFileSync( path.join( dir, 'heading.tree.json' ), '[]' );
	assert.deepEqual( splitCache( dir, { dryRun: true } ).split, [ 'heading.json' ] );
	assert.ok( ! fs.existsSync( path.join( dir, 'site-a' ) ), 'a dry run writes nothing' );
	assert.deepEqual( splitCache( dir ).split, [ 'heading.json' ] );
	const files = [ 'heading.json', 'site-a/heading.paint.json' ];
	const snap = files.map( ( f ) => fs.readFileSync( path.join( dir, f ) ) );
	assert.deepEqual( splitCache( dir ).split, [] );
	assert.deepEqual( files.map( ( f ) => fs.readFileSync( path.join( dir, f ) ) ), snap );
	assert.equal( readPaint( dir, 'site-a', 'sgs/heading' ).elements[ '' ][ 1440 ].color, 'red' );
} );

test( 'a mirror shares its test site’s paint (mirrorOf), and an unrelated site still gets none', () => {
	const dir = fresh();
	run( dir, 'local-eye-care', 'red' );
	assert.equal( paintSite( 'local-eye-care' ), 'eye-care-test' );
	assert.ok( fs.existsSync( path.join( dir, 'eye-care-test', 'heading.paint.json' ) ), 'the mirror writes into its test site’s folder' );
	assert.equal( readPaint( dir, 'eye-care-test', 'sgs/heading' ).elements[ '' ][ 1440 ].color, 'red' );
	assert.equal( readPaint( dir, 'sandybrown', 'sgs/heading' ), null );
} );

test( 'placeMirrorPaint moves a mirror folder into its test site’s, keeping the newer measurement, and is idempotent', () => {
	const dir = fresh();
	const write = ( site, measured, color ) => {
		fs.mkdirSync( path.join( dir, site ), { recursive: true } );
		fs.writeFileSync( path.join( dir, site, 'heading.paint.json' ), JSON.stringify( { block: 'sgs/heading', site, measured, elements: { '': { 1440: { color } } } } ) );
	};
	write( 'local-eye-care', '2026-10-05', 'new' );
	write( 'eye-care-test', '2026-10-01', 'old' );
	assert.deepEqual( placeMirrorPaint( dir ).moved, [ 'local-eye-care/heading.paint.json' ] );
	assert.ok( ! fs.existsSync( path.join( dir, 'local-eye-care' ) ) );
	assert.equal( readPaint( dir, 'eye-care-test', 'sgs/heading' ).elements[ '' ][ 1440 ].color, 'new' );
	assert.deepEqual( placeMirrorPaint( dir ), { moved: [], dropped: [] } );
} );
