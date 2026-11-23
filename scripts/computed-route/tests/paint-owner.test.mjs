// Proves the paint ownership rule (lib/cache.mjs::paintOwner, read by readPaint, paintSkip and paintStale): a paint file is its folder's. writePaint stamps the folder's site (`paintFolder`); an unstamped file whose
// recorded site is a scratch copy no targets file names any more belongs to the folder it sits in; a file recorded on a
// site the targets files name, or stamped for another folder, is still refused. On 2026-11-15 two scratch copies of a
// mirror calibrated into its test site's folder; once their targets entries were removed every one of those paints was
// refused and Fill ran with no default paint for those blocks. Fixture folders only; no site, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPaint, writePaint, paintSkip, paintStale, paintOwner, paintSite, writeSlotMap } from '../lib/cache.mjs';
import { READ_KEY } from '../lib/calibrate-props.mjs';

// A scratch copy name no targets file names (lib/site-targets.mjs::SCRATCH_NAME).
const GONE = 'local-mediatest-fixturegone';
const el = ( colour ) => ( { '': { 1440: { color: colour } } } );
const fresh = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-owner-' ) );

// A paint file as calibration wrote it before the stamp: in `folder`, recording `site`, with no `paintFolder`.
function unstamped( dir, folder, site, colour = 'red', extra = {} ) {
	fs.mkdirSync( path.join( dir, folder ), { recursive: true } );
	fs.writeFileSync( path.join( dir, folder, 'heading.paint.json' ), JSON.stringify( { block: 'sgs/heading', site, paintKey: 'pk', readKey: READ_KEY, elements: el( colour ), ...extra } ) );
	writeSlotMap( dir, 'sgs/heading', { block: 'sgs/heading', site, slotKey: 'k', readKey: READ_KEY, settings: {} } );
}

test( 'MUST FAIL: an unstamped paint a removed scratch copy wrote into a mirror\'s test-site folder is read for the mirror and for the test site', () => {
	const dir = fresh();
	unstamped( dir, 'mamas-test', GONE );
	assert.equal( paintSite( GONE ), GONE, 'the fixture name must be one no targets file names' );
	assert.equal( readPaint( dir, 'local-mamas', 'sgs/heading' )?.elements[ '' ][ 1440 ].color, 'red', 'the mirror reads its folder\'s paint' );
	assert.equal( readPaint( dir, 'mamas-test', 'sgs/heading' )?.elements[ '' ][ 1440 ].color, 'red', 'the test site reads its own folder\'s paint' );
	assert.match( paintSkip( dir, 'sgs/heading', 'local-mamas', 'pk' ) ?? '', /current/, 'calibrate keeps it rather than re-measuring a paint it cannot see' );
	assert.equal( paintStale( dir, 'sgs/heading', 'local-mamas', 'other' ), true );
} );

test( 'negative control: an unstamped paint recorded on a named site that resolves elsewhere is still refused in this folder', () => {
	const dir = fresh();
	unstamped( dir, 'mamas-test', 'sandybrown' );
	assert.equal( readPaint( dir, 'local-mamas', 'sgs/heading' ), null );
	// A recorded site the targets files name keeps its own folder even when it is a scratch-copy name.
	const targets = { 'local-mediatest-named': { mirrorOf: 'sandybrown' }, 'local-mamas': { mirrorOf: 'mamas-test' } };
	assert.equal( paintOwner( { site: 'local-mediatest-named' }, 'mamas-test', targets ), 'sandybrown' );
	assert.equal( paintOwner( { site: 'local-mamas' }, 'mamas-test', targets ), 'mamas-test' );
	// A name that is not a scratch copy is never adopted by its folder.
	assert.equal( paintOwner( { site: 'local-gone-mirror' }, 'mamas-test', targets ), 'local-gone-mirror' );
} );

test( 'a scratch copy whose targets entry names the test site (mirrorOf) reads the removed copy\'s paint in that folder', () => {
	const targets = { 'local-mediatest-live': { mirrorOf: 'mamas-test', scratchOf: 'local-mamas' } };
	assert.equal( paintSite( 'local-mediatest-live', targets ), 'mamas-test' );
	assert.equal( paintOwner( { site: GONE }, paintSite( 'local-mediatest-live', targets ), targets ), 'mamas-test' );
} );

test( 'writePaint stamps the folder\'s site, and a stamped file copied into another folder is refused there', () => {
	const dir = fresh();
	writeSlotMap( dir, 'sgs/heading', { block: 'sgs/heading', site: 'local-mamas', slotKey: 'k', readKey: READ_KEY, settings: {} } );
	writePaint( dir, 'local-mamas', 'sgs/heading', { block: 'sgs/heading', site: GONE, paintKey: 'pk', readKey: READ_KEY, elements: el( 'blue' ) } );
	const file = path.join( dir, 'mamas-test', 'heading.paint.json' );
	assert.equal( JSON.parse( fs.readFileSync( file, 'utf8' ) ).paintFolder, 'mamas-test' );
	assert.equal( readPaint( dir, 'local-mamas', 'sgs/heading' ).elements[ '' ][ 1440 ].color, 'blue' );
	// The stamp wins over the folder: the same scratch-copy file stamped for another folder is not this folder's.
	fs.mkdirSync( path.join( dir, 'eye-care-clone-test' ), { recursive: true } );
	fs.copyFileSync( file, path.join( dir, 'eye-care-clone-test', 'heading.paint.json' ) );
	assert.equal( readPaint( dir, 'eye-care-clone-test', 'sgs/heading' ), null );
	assert.equal( paintOwner( { site: GONE, paintFolder: 'sandybrown' }, 'mamas-test', {} ), 'sandybrown' );
} );
