// The header after the window has scrolled (lib/fill-read-scrolled.mjs::scrolledProbe, run per read width by
// lib/fill-read.mjs::readDraft for the `scrolledIds` targets), in a real browser: a pinned header whose script shrinks it and
// changes its blur once the page is past 40px, a header the scroll changes nothing about, and a page too short to scroll.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const page = ( body, script = '' ) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } header { position: sticky; top: 0; padding: 30px 20px; background: #faf8f5; transition: padding .35s, backdrop-filter .35s } header.shrunk { padding: 10px 20px } header.blur { backdrop-filter: blur(12px) } .tall { height: 3000px }
</style></head><body>${ body }<script>${ script }</script></body></html>`;
const SHRINKS = `addEventListener('scroll', () => { const s = scrollY > 40; document.querySelector('header').classList.toggle('shrunk', s); document.querySelector('header').classList.toggle('blur', s); });`;
const TREE = [ { name: 'sgs/site-header', draftRef: 'header', attributes: {} } ];
const dirs = [];
const servers = [];
const read = async ( html ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-scrolled-' ) );
	dirs.push( dir );
	fs.writeFileSync( path.join( dir, 'index.html' ), html );
	const served = await serveDraft( dir );
	servers.push( served );
	return readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false, scrolledIds: [ '0:' ] } );
};
let shrinking;
let still;
let short;
before( async () => {
	shrinking = await read( page( '<header>Shop</header><div class="tall"></div>', SHRINKS ) );
	still = await read( page( '<header>Shop</header><div class="tall"></div>' ) );
	short = await read( page( '<header>Shop</header><p>short</p>', SHRINKS ) );
} );
after( async () => {
	await Promise.all( servers.map( ( s ) => s.close() ) );
} );

test( 'MUST FAIL: the header is read at rest and once scrolled at every read width: its height, its backdrop blur and the distance at which it changes', () => {
	for ( const width of [ 375, 768, 1440 ] ) {
		const got = shrinking.scrolled[ width ][ '0:' ];
		assert.ok( got, `read at ${ width }` );
		assert.equal( got.rest.backdropFilter, 'none' );
		assert.match( got.scrolled.backdropFilter, /blur\(12px\)/ );
		assert.ok( got.rest.height - got.scrolled.height >= 20, `shrinks by 40px of padding less its line: ${ got.rest.height } to ${ got.scrolled.height }` );
		assert.equal( got.at, 40, 'the scroll listener flips at scrollY > 40, so 40 still reads as rest' );
	}
} );

test( 'negative control: a header the scroll changes nothing about reads the same twice and has no distance', () => {
	const got = still.scrolled[ 1440 ][ '0:' ];
	assert.deepEqual( got.rest, got.scrolled );
	assert.equal( got.at, null );
} );

test( 'negative control: a page too short to scroll has no scrolled read', () => {
	assert.equal( short.scrolled[ 1440 ][ '0:' ], null );
} );

test( 'negative control: with no scrolledIds the draft is not scrolled and nothing is read', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-scrolled-none-' ) );
	dirs.push( dir );
	fs.writeFileSync( path.join( dir, 'index.html' ), page( '<header>Shop</header><div class="tall"></div>', SHRINKS ) );
	const served = await serveDraft( dir );
	servers.push( served );
	const r = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
	assert.deepEqual( r.scrolled, {} );
} );

test( 'negative control: only the scrolledIds targets are scrolled and read, not every target of the draft', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-scrolled-two-' ) );
	dirs.push( dir );
	fs.writeFileSync( path.join( dir, 'index.html' ), page( '<header>Shop</header><div class="tall"></div>', SHRINKS ) );
	const served = await serveDraft( dir );
	servers.push( served );
	const tree = [ ...TREE, { name: 'sgs/container', draftRef: '.tall', attributes: {} } ];
	const r = await readDraft( { url: served.url, nodes: skeletonNodes( tree ), headless: true, sweep: false, scrolledIds: [ '0:' ] } );
	assert.deepEqual( Object.keys( r.scrolled[ 1440 ] ), [ '0:' ] );
} );
