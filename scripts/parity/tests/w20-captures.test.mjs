// Walker Track W W20 (GAP-CHECKLIST.md section 41). The walker wrote each surface's captures into its output folder and
// never cleared the ones an earlier run left, so a state no longer walked kept its old shot beside the current ones (a cold
// visual audit read a form surface's "resting" shots from a run a day older as current). A walk now clears the files it
// owns (lib/captures.mjs) before writing; every other file in the folder stays.
// The walk runs the real walker (full checks, headless) on two static pages with stale walker files and foreign files
// planted in its output folder.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath, pathToFileURL } from 'url';
import { walkerOwned, cachedShots, clearCaptures } from '../lib/captures.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
const PAGE = '<!doctype html><html><body style="margin:0;font-family:system-ui,sans-serif"><main><h1>Now</h1><p>Current page.</p></main></body></html>';
const STALE = [ 'draft-800-resting.png', 'live-800-resting.png', 'pair-800-resting.png', 'auto-live-800-resting.json', 'contact.md' ];
const FOREIGN = [ 'notes.md', 'census.json', 'review-800-resting.png', 'draft-resting.png' ];

let dir;
let out;
let report;
let listing;
before( async () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w20-' ) );
	out = path.join( dir, 'out' );
	fs.mkdirSync( out );
	[ ...STALE, ...FOREIGN ].forEach( ( f ) => fs.writeFileSync( path.join( out, f ), 'from an earlier run' ) );
	fs.writeFileSync( path.join( dir, 'page.html' ), PAGE );
	const url = pathToFileURL( path.join( dir, 'page.html' ) ).href;
	fs.writeFileSync( path.join( dir, 'w20.mjs' ), `export default {
	name: 'w20', widths: [ 800 ], links: false, autoScroll: false, entrances: false,
	draft: { url: ${ JSON.stringify( url ) } },
	live: { url: ${ JSON.stringify( url ) } },
	states: [ { name: 'current', settle: 100 } ],
	pairs: [ { name: 'title', draft: 'main h1', live: 'main h1', box: [], structure: false } ],
};
` );
	const walk = ( ...extra ) => promisify( execFile )( process.execPath, [ WALKER, path.join( dir, 'w20.mjs' ), '--headless', '--no-review', ...extra ], { encoding: 'utf8', timeout: 170000, maxBuffer: 64 * 1024 * 1024 } ).catch( ( e ) => e );
	const r = await walk( '--out', out );
	report = fs.existsSync( path.join( out, 'report.json' ) ) ? JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) ) : { runs: [], failed: `${ r.stdout }\n${ r.stderr }` };
	listing = fs.readdirSync( out );
	// Two walks with one --draft-cache: the second reuses the first's draft walk, shot included.
	const cache = path.join( dir, 'draft-cache.json' );
	await walk( '--out', path.join( dir, 'cached' ), '--draft-cache', cache );
	const again = await walk( '--out', path.join( dir, 'cached' ), '--draft-cache', cache );
	cachedRun = { listing: fs.readdirSync( path.join( dir, 'cached' ) ), out: `${ again.stdout }\n${ again.stderr }` };
} );
let cachedRun;
after( () => fs.rmSync( dir, { recursive: true, force: true } ) );

test( 'MUST FAIL: after a walk the output folder holds no capture an earlier run left; its own captures are there', () => {
	assert.ok( report.runs.length, report.failed );
	for ( const f of STALE ) {
		assert.ok( ! listing.includes( f ), `${ f } from an earlier run is gone` );
	}
	for ( const f of [ 'draft-800-current.png', 'live-800-current.png', 'pair-800-current.png', 'report.json', 'report.md' ] ) {
		assert.ok( listing.includes( f ), `${ f } is this walk's` );
	}
} );

test( 'negative control: files the walker does not write stay in the folder', () => {
	for ( const f of FOREIGN ) {
		assert.ok( listing.includes( f ), `${ f } is not the walker's and is kept` );
		assert.equal( fs.readFileSync( path.join( out, f ), 'utf8' ), 'from an earlier run' );
	}
} );

test( 'every capture in the folder is one the report lists', () => {
	const listed = new Set( report.runs.flatMap( ( r ) => [ r.shot, `draft-${ r.width }-${ r.state }.png`, `live-${ r.width }-${ r.state }.png` ] ) );
	assert.deepEqual( listing.filter( ( f ) => walkerOwned( f ) && f.endsWith( '.png' ) && ! listed.has( f ) ), [] );
} );

test( 'MUST FAIL: a walk that reuses a cached draft walk keeps that walk\'s draft shot and pairs it', () => {
	assert.ok( cachedRun.listing.includes( 'draft-800-current.png' ), `the cached draft shot is kept:\n${ cachedRun.out }` );
	assert.ok( cachedRun.listing.includes( 'pair-800-current.png' ), 'the pair is made from it' );
} );

test( 'MUST FAIL: the owned-name rule takes the walker\'s names only', () => {
	for ( const f of [ 'draft-1440-open.png', 'live-375-auto-scrolled.png', 'pair-768-topic-my-order.png', 'auto-draft-1440-open.json', 'auto-live-375-open.json', 'report.json', 'report.md', 'contact.md' ] ) {
		assert.ok( walkerOwned( f ), f );
	}
	for ( const f of [ 'draft-open.png', 'pair-1440.png', 'review-1440-open.png', 'my-draft-1440-open.png', 'old-pair-1440-open.png', 'x-auto-live-375-open.json', 'report.html', 'auto-1440-open.json', 'notes.md', 'draft-1440-open.json', 'xreport.json', 'report.json.bak' ] ) {
		assert.ok( ! walkerOwned( f ), f );
	}
} );

test( 'MUST FAIL: a draft shot a --draft-cache run reuses is kept; one not reused, and a folder, are not touched wrongly', () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'w20-cache-' ) );
	try {
		const reused = path.join( d, 'draft-1440-open.png' );
		[ reused, path.join( d, 'draft-768-open.png' ), path.join( d, 'live-1440-open.png' ) ].forEach( ( f ) => fs.writeFileSync( f, 'x' ) );
		fs.mkdirSync( path.join( d, 'pair-1440-dir.png' ) );
		const keep = cachedShots( [ { states: { open: { shot: reused }, gone: { shot: null } } }, null ] );
		assert.deepEqual( keep, [ path.resolve( reused ) ] );
		assert.deepEqual( clearCaptures( d, keep ).sort(), [ 'draft-768-open.png', 'live-1440-open.png' ] );
		assert.deepEqual( fs.readdirSync( d ).sort(), [ 'draft-1440-open.png', 'pair-1440-dir.png' ] );
		assert.deepEqual( clearCaptures( path.join( d, 'absent' ) ), [], 'a folder not made yet clears nothing' );
	} finally {
		fs.rmSync( d, { recursive: true, force: true } );
	}
} );
