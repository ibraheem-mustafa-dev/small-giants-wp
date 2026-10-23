// Spec 48 FR-48-58, lib/media-upload.mjs against an in-memory WordPress: the first run uploads every image once and
// maps it; a second run uploads nothing; a deleted attachment or a stored file that changed is uploaded again; an SVG
// the sanitiser rewrote is marked for review; a dry run uploads nothing; a painted size URL maps back to its asset; a stock preview the draft paints is downloaded once, uploaded as `stock: true`, listed for review and followed from its painted URL.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { mediaAssets, paintedAsset, sha256, siteCredentials, uploadMedia } from '../lib/media-upload.mjs';
import { downloadStock, MAX_STOCK_BYTES, stockImages, stockKey, stockReview } from '../lib/media-stock.mjs';

// Writes an export asset and records its fingerprint in the export's MANIFEST.json, as a real export does.
function ship( repo, name, body ) {
	const dir = path.join( repo, 'sites/acme/handoff' );
	fs.mkdirSync( path.join( dir, 'assets' ), { recursive: true } );
	fs.writeFileSync( path.join( dir, 'assets', name ), body );
	const file = path.join( dir, 'MANIFEST.json' );
	const m = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { files: [] };
	m.files = [ ...m.files.filter( ( f ) => f.path !== `assets/${ name }` ), { path: `assets/${ name }`, bytes: Buffer.byteLength( body ), sha256: sha256( Buffer.from( body ) ) } ];
	fs.writeFileSync( file, JSON.stringify( m ) );
}

function fixtureRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'media-upload-' ) );
	const put = ( rel, body ) => {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), body );
	};
	ship( repo, 'hero.png', 'PNG-hero' );
	ship( repo, 'logo.svg', '<svg viewBox="0 0 10 10"><script>x</script></svg>' );
	put( 'sites/acme/assets/food/bread.jpg', 'JPG-bread' );
	put( 'sites/acme/assets/notes/brief.md', '# not an image' );
	put( '.claude/secrets/acme-test.env', 'WP_URL_ACMETEST=https://acme.test/\nWP_USER_ACMETEST=Claude\nWP_APP_PWD_ACMETEST="abcd efgh"\n' );
	return repo;
}

// A WordPress that stores uploads and strips <script> from an SVG, as svg-upload.php does.
function fakeWordPress() {
	const media = new Map();
	let next = 100;
	const calls = { uploads: 0 };
	const json = ( status, body ) => ( { status, json: async () => body, text: async () => JSON.stringify( body ), arrayBuffer: async () => new ArrayBuffer( 0 ) } );
	const fetchImpl = async ( url, init = {} ) => {
		if ( url.endsWith( '/wp-json/wp/v2/media' ) && 'POST' === init.method ) {
			assert.equal( init.headers.Authorization, `Basic ${ Buffer.from( 'Claude:abcdefgh' ).toString( 'base64' ) }` );
			calls.uploads++;
			const name = /filename="([^"]+)"/.exec( init.headers[ 'Content-Disposition' ] )[ 1 ];
			const body = 'image/svg+xml' === init.headers[ 'Content-Type' ] ? Buffer.from( String( init.body ).replace( /<script>.*?<\/script>/, '' ) ) : Buffer.from( init.body );
			const id = next++;
			media.set( id, { id, source_url: `https://acme.test/wp-content/uploads/2026/10/${ name }`, body } );
			return json( 201, { id, source_url: media.get( id ).source_url } );
		}
		const one = /\/wp-json\/wp\/v2\/media\/(\d+)/.exec( url );
		if ( one ) {
			const m = media.get( Number( one[ 1 ] ) );
			return m ? json( 200, { id: m.id, source_url: m.source_url } ) : json( 404, { code: 'rest_post_invalid_id' } );
		}
		const file = [ ...media.values() ].find( ( m ) => m.source_url === url );
		return file ? { status: 200, arrayBuffer: async () => file.body } : { status: 404, arrayBuffer: async () => new ArrayBuffer( 0 ) };
	};
	return { media, calls, fetchImpl };
}

test( 'mediaAssets lists the export and client images, never notes; siteCredentials reads the site\'s keys', () => {
	const repo = fixtureRepo();
	assert.deepEqual( mediaAssets( repo, 'acme' ), [ 'sites/acme/assets/food/bread.jpg', 'sites/acme/handoff/assets/hero.png', 'sites/acme/handoff/assets/logo.svg' ] );
	assert.equal( siteCredentials( repo, 'acme-test' ).url, 'https://acme.test' );
	assert.throws( () => siteCredentials( repo, 'other-site' ), /no secrets file/ );
} );

test( 'MUST FAIL: the first run uploads each image once, a second uploads nothing, a deleted or changed attachment uploads again', async () => {
	const repo = fixtureRepo();
	const wp = fakeWordPress();
	const creds = siteCredentials( repo, 'acme-test' );
	const run = ( map ) => uploadMedia( { repo, client: 'acme', site: 'acme-test', map, creds, fetchImpl: wp.fetchImpl, apply: true } );
	const first = await run( { sites: {} } );
	assert.equal( first.uploaded.length, 3 );
	assert.deepEqual( first.map.sites[ 'acme-test' ].files.map( ( f ) => [ f.asset, f.id, f.stock ] ), [ [ 'sites/acme/assets/food/bread.jpg', 100, false ], [ 'sites/acme/handoff/assets/hero.png', 101, false ], [ 'sites/acme/handoff/assets/logo.svg', 102, false ] ] );
	assert.equal( first.map.sites[ 'acme-test' ].files[ 1 ].sha256, sha256( Buffer.from( 'PNG-hero' ) ) );
	const second = await run( first.map );
	assert.deepEqual( [ second.uploaded.length, second.skipped.length, wp.calls.uploads ], [ 0, 3, 3 ] );
	wp.media.delete( 101 );
	const third = await run( second.map );
	assert.deepEqual( third.uploaded, [ 'sites/acme/handoff/assets/hero.png' ] );
	wp.media.get( 100 ).body = Buffer.from( 'replaced on the server' );
	assert.deepEqual( ( await run( third.map ) ).uploaded, [ 'sites/acme/assets/food/bread.jpg' ] );
} );

test( 'MUST FAIL: two files with the same bytes share one attachment, on the first run and on a rerun', async () => {
	const repo = fixtureRepo();
	ship( repo, 'hero-copy.png', 'PNG-hero' );
	const wp = fakeWordPress();
	const creds = siteCredentials( repo, 'acme-test' );
	const first = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds, fetchImpl: wp.fetchImpl, apply: true } );
	const ids = ( r ) => Object.fromEntries( r.map.sites[ 'acme-test' ].files.map( ( f ) => [ path.basename( f.asset ), f.id ] ) );
	assert.equal( wp.calls.uploads, 3, 'hero-copy.png is not uploaded a second time' );
	assert.equal( ids( first )[ 'hero-copy.png' ], ids( first )[ 'hero.png' ] );
	const again = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: first.map, creds, fetchImpl: wp.fetchImpl, apply: true } );
	assert.deepEqual( [ wp.calls.uploads, again.map.sites[ 'acme-test' ].files.length ], [ 3, 4 ] );
	assert.deepEqual( again.map.sites[ 'acme-test' ].files.map( ( f ) => f.asset ), first.map.sites[ 'acme-test' ].files.map( ( f ) => f.asset ), 'every asset keeps its own row' );
} );

test( 'MUST FAIL: an SVG the upload sanitiser changed is marked for review; a raster image never is', async () => {
	const repo = fixtureRepo();
	const wp = fakeWordPress();
	const r = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds: siteCredentials( repo, 'acme-test' ), fetchImpl: wp.fetchImpl, apply: true } );
	assert.deepEqual( r.sanitised, [ 'sites/acme/handoff/assets/logo.svg' ] );
	assert.equal( r.map.sites[ 'acme-test' ].files.filter( ( f ) => f.sanitised ).length, 1 );
} );

test( 'MUST FAIL: a dry run uploads nothing and lists every unmapped image', async () => {
	const repo = fixtureRepo();
	const wp = fakeWordPress();
	const r = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds: siteCredentials( repo, 'acme-test' ), fetchImpl: wp.fetchImpl } );
	assert.deepEqual( [ wp.calls.uploads, r.wouldUpload.length, r.uploaded.length ], [ 0, 3, 0 ] );
} );

test( 'MUST FAIL: paintedAsset maps an attachment URL and its sizes back to the asset, and nothing else', () => {
	const map = { sites: { 'acme-test': { files: [ { asset: 'sites/acme/handoff/assets/hero.png', id: 101, url: 'https://acme.test/wp-content/uploads/2026/10/hero.png' } ] } } };
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/wp-content/uploads/2026/10/hero-300x200.png?ver=1' ).id, 101 );
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/wp-content/uploads/2026/10/hero-scaled.png' ).id, 101 );
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/wp-content/uploads/2026/10/hero-2.png' ), null );
	assert.equal( paintedAsset( map, 'other-site', 'https://acme.test/wp-content/uploads/2026/10/hero.png' ), null );
} );

test( 'MUST FAIL: an upload that fails part-way still returns the map of what did upload', async () => {
	const repo = fixtureRepo();
	const wp = fakeWordPress();
	const failing = async ( url, init = {} ) => ( 'POST' === init.method && /filename="hero\.png"/.test( init.headers[ 'Content-Disposition' ] ) ? { status: 500, text: async () => 'boom' } : wp.fetchImpl( url, init ) );
	const err = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds: siteCredentials( repo, 'acme-test' ), fetchImpl: failing, apply: true } ).catch( ( e ) => e );
	assert.match( err.message, /hero\.png answered 500/ );
	assert.deepEqual( err.map.sites[ 'acme-test' ].files.map( ( f ) => path.basename( f.asset ) ), [ 'bread.jpg' ], 'bread.jpg uploaded before the failure and is kept' );
} );

test( 'MUST FAIL: paintedAsset takes the exact URL before a size-stripped one', () => {
	const map = { sites: { 'acme-test': { files: [
		{ asset: 'hero.png', id: 1, url: 'https://acme.test/u/hero.png' },
		{ asset: 'hero-1200x600.png', id: 2, url: 'https://acme.test/u/hero-1200x600.png' },
	] } } };
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/u/hero-1200x600.png' ).id, 2 );
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/u/hero-300x150.png' ).id, 1 );
} );

test( 'MUST FAIL: a non-ASCII file name uploads with an ASCII fallback and its UTF-8 name; only a matching quote pair is stripped from a secret', async () => {
	const repo = fixtureRepo();
	ship( repo, 'crème-brûlée.png', 'PNG-creme' );
	let header = null;
	const wp = fakeWordPress();
	const spy = ( url, init = {} ) => {
		if ( 'POST' === init.method && init.headers[ 'Content-Disposition' ].includes( 'cr_me' ) ) {
			header = init.headers[ 'Content-Disposition' ];
		}
		return wp.fetchImpl( url, init );
	};
	await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds: siteCredentials( repo, 'acme-test' ), fetchImpl: spy, apply: true } );
	assert.equal( header, 'attachment; filename="cr_me-br_l_e.png"; filename*=UTF-8\'\'cr%C3%A8me-br%C3%BBl%C3%A9e.png' );
	fs.writeFileSync( path.join( repo, '.claude/secrets/acme-test.env' ), 'WP_URL_ACMETEST=https://acme.test\nWP_USER_ACMETEST=Claude\nWP_APP_PWD_ACMETEST=abc"\n' );
	assert.equal( siteCredentials( repo, 'acme-test' ).auth, `Basic ${ Buffer.from( 'Claude:abc"' ).toString( 'base64' ) }`, 'an unpaired quote is part of the secret' );
} );

test( 'MUST FAIL: an export asset whose bytes differ from, or are missing in, the export MANIFEST.json is refused; the client images need no entry', async () => {
	const repo = fixtureRepo();
	const run = () => uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds: siteCredentials( repo, 'acme-test' ), fetchImpl: fakeWordPress().fetchImpl, apply: true } );
	assert.equal( ( await run() ).uploaded.length, 3, 'sites/acme/assets/food/bread.jpg has no manifest entry and still uploads' );
	fs.writeFileSync( path.join( repo, 'sites/acme/handoff/assets/hero.png' ), 'PNG-hero edited by hand' );
	assert.match( ( await run().catch( ( e ) => e ) ).message, /hero\.png differs from the export's MANIFEST\.json/ );
	ship( repo, 'hero.png', 'PNG-hero' );
	fs.writeFileSync( path.join( repo, 'sites/acme/handoff/assets/stray.png' ), 'PNG-stray' );
	assert.match( ( await run().catch( ( e ) => e ) ).message, /stray\.png is not in the export's MANIFEST\.json/ );
} );

test( 'MUST FAIL: one failed liveness read does not re-upload a live attachment; two do', async () => {
	const repo = fixtureRepo();
	const wp = fakeWordPress();
	const creds = siteCredentials( repo, 'acme-test' );
	const first = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: { sites: {} }, creds, fetchImpl: wp.fetchImpl, apply: true } );
	let misses = 0;
	const flaky = ( n ) => async ( url, init = {} ) => ( /\/media\/101\?/.test( url ) && misses++ < n ? { status: 503, json: async () => ( {} ) } : wp.fetchImpl( url, init ) );
	const once = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: first.map, creds, fetchImpl: flaky( 1 ), apply: true } );
	assert.deepEqual( [ once.uploaded.length, wp.calls.uploads ], [ 0, 3 ], 'a single failed read keeps hero.png' );
	misses = 0;
	const twice = await uploadMedia( { repo, client: 'acme', site: 'acme-test', map: first.map, creds, fetchImpl: flaky( 2 ), apply: true } );
	assert.deepEqual( twice.uploaded, [ 'sites/acme/handoff/assets/hero.png' ] );
} );

// A draft that paints stock images three ways: a literal with a query (two sizes of one photo), a literal with no query,
// and a URL built from photo IDs; plus a credit link and a non-stock host that are not images to keep.
function draftWithStock( repo ) {
	const dir = path.join( repo, 'sites/acme/handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'Home.dc.html' ), [
		'<img src="https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa?w=2200&q=82&auto=format&fit=crop" srcset="https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa?w=400 1x">',
		'<img src="https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa?w=800&amp;q=80">',
		'<a href="https://unsplash.com/photos/1111111111111-aaaaaaaaaaaa">credit</a>',
		'<img src="https://cdn.example.org/photo-9999999999999-ffffffffffff">',
		'<script>const hero = { a: \'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb\' };',
		'const P = [\'3333333333333-cccccccccccc\'];',
		'img.src = \'https://images.unsplash.com/photo-\' + P[0] + \'?w=400\';</script>',
		'<img src="https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb?w=5000">',
	].join( '\n' ) );
}

// The in-memory WordPress plus an image host that serves each stock photo (its bytes derive from its path).
function withStockHost( wp, { type = 'image/jpeg', same = false } = {} ) {
	const calls = { downloads: [] };
	const fetchImpl = async ( url, init = {} ) => {
		if ( url.startsWith( 'https://images.unsplash.com/' ) ) {
			calls.downloads.push( url );
			const body = Buffer.from( same ? 'SAME-PHOTO' : `PHOTO:${ new URL( url ).pathname }` );
			return { status: 200, url, headers: { get: ( k ) => ( { 'content-type': type, 'content-length': String( body.length ) } )[ k ] }, arrayBuffer: async () => body };
		}
		return wp.fetchImpl( url, init );
	};
	return { calls, fetchImpl };
}

const runStock = ( repo, map, fetchImpl, apply = true ) => uploadMedia( { repo, client: 'acme', site: 'acme-test', map, creds: siteCredentials( repo, 'acme-test' ), fetchImpl, apply } );
const stockRows = ( r ) => r.map.sites[ 'acme-test' ].files.filter( ( f ) => f.stock );

test( 'MUST FAIL: stockImages finds each stock photo the draft paints once, whatever its size, and nothing else', () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const found = stockImages( repo, 'acme' );
	assert.deepEqual( found.map( ( f ) => [ f.key, f.width ] ), [
		[ 'https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa', 2200 ],
		[ 'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb', 5000 ],
		[ 'https://images.unsplash.com/photo-3333333333333-cccccccccccc', 0 ],
	] );
	assert.deepEqual( found[ 0 ].paintedAt, [ 'Home.dc.html:1', 'Home.dc.html:2' ] );
	assert.equal( stockKey( 'https://unsplash.com/photos/1111111111111-aaaaaaaaaaaa' ), null );
	assert.equal( stockKey( 'http://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa' ), null );
} );

test( 'MUST FAIL: each stock photo uploads once as stock:true with its source and downloaded hash; a rerun downloads and uploads nothing', async () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const wp = fakeWordPress();
	const host = withStockHost( wp );
	const first = await runStock( repo, { sites: {} }, host.fetchImpl );
	assert.equal( first.uploaded.length, 6, '3 local images and 3 stock previews' );
	const rows = stockRows( first );
	assert.deepEqual( rows.map( ( f ) => f.asset ), [ 'https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-3333333333333-cccccccccccc' ] );
	assert.equal( rows[ 0 ].source, 'https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa?w=2200&q=80&auto=format&fit=crop' );
	assert.equal( rows[ 1 ].source, 'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb?w=2400&q=80&auto=format&fit=crop', 'a width over the cap is capped' );
	assert.equal( rows[ 2 ].source, 'https://images.unsplash.com/photo-3333333333333-cccccccccccc?w=1600&q=80&auto=format&fit=crop', 'a photo painted with no width gets the default' );
	assert.equal( rows[ 0 ].sha256, sha256( Buffer.from( 'PHOTO:/photo-1111111111111-aaaaaaaaaaaa' ) ) );
	assert.ok( rows.every( ( f ) => f.id && f.url.includes( '/wp-content/uploads/' ) && f.paintedAt.length ) );
	assert.equal( first.map.sites[ 'acme-test' ].files.filter( ( f ) => ! f.stock ).length, 3, 'local rows stay stock:false' );
	const [ downloads, uploads ] = [ host.calls.downloads.length, wp.calls.uploads ];
	const again = await runStock( repo, first.map, host.fetchImpl );
	assert.deepEqual( [ again.uploaded.length, again.skipped.length, host.calls.downloads.length, wp.calls.uploads ], [ 0, 6, downloads, uploads ] );
	wp.media.delete( rows[ 1 ].id );
	assert.deepEqual( ( await runStock( repo, again.map, host.fetchImpl ) ).uploaded, [ rows[ 1 ].asset ] );
} );

test( 'MUST FAIL: a stock dry run downloads and uploads nothing and lists every stock preview', async () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const wp = fakeWordPress();
	const host = withStockHost( wp );
	const r = await runStock( repo, { sites: {} }, host.fetchImpl, false );
	assert.deepEqual( [ host.calls.downloads.length, wp.calls.uploads, r.stockFound.length, r.wouldUpload.filter( ( a ) => a.startsWith( 'https://' ) ).length ], [ 0, 0, 3, 3 ] );
} );

test( 'MUST FAIL: a stock download that is not https, not an image, over the size cap or redirected off https is refused', async () => {
	const answer = ( over ) => async ( url ) => ( { status: 200, url, headers: { get: ( k ) => ( { 'content-type': 'image/jpeg', ...over.headers } )[ k ] }, arrayBuffer: async () => over.body || Buffer.from( 'x' ), ...over.res } );
	const photo = 'https://images.unsplash.com/photo-1';
	await assert.rejects( downloadStock( answer( { res: { url: photo } } ), 'http://images.unsplash.com/photo-1' ), /is not https/ );
	await assert.rejects( downloadStock( answer( { headers: { 'content-type': 'text/html' } } ), photo ), /not an image type/ );
	await assert.rejects( downloadStock( answer( { headers: { 'content-type': 'image/svg+xml' } } ), photo ), /not an image type/ );
	await assert.rejects( downloadStock( answer( { headers: { 'content-length': String( MAX_STOCK_BYTES + 1 ) } } ), photo ), /over the .* cap/ );
	await assert.rejects( downloadStock( answer( { body: Buffer.alloc( MAX_STOCK_BYTES + 1 ) } ), photo ), /over the .* cap/ );
	await assert.rejects( downloadStock( answer( { res: { url: 'http://elsewhere.test/a.jpg' } } ), photo ), /redirected to http:\/\/elsewhere\.test\/a\.jpg, which is not https/ );
	assert.equal( ( await downloadStock( answer( {} ), photo ) ).ext, '.jpg' );
} );

test( 'MUST FAIL: a stock photo that does not download is reported and the run still uploads the rest', async () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const host = withStockHost( fakeWordPress() );
	const flaky = ( url, init ) => ( url.includes( 'photo-2222222222222' ) ? Promise.resolve( { status: 404, headers: { get: () => null } } ) : host.fetchImpl( url, init ) );
	const r = await runStock( repo, { sites: {} }, flaky );
	assert.deepEqual( r.failed.map( ( f ) => f.asset ), [ 'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb' ] );
	assert.match( r.failed[ 0 ].reason, /answered 404/ );
	assert.equal( stockRows( r ).length, 2 );
} );

test( 'MUST FAIL: two stock photos with the same bytes share one attachment', async () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const wp = fakeWordPress();
	const r = await runStock( repo, { sites: {} }, withStockHost( wp, { same: true } ).fetchImpl );
	assert.equal( new Set( stockRows( r ).map( ( f ) => f.id ) ).size, 1 );
	assert.equal( wp.calls.uploads, 4, '3 local images and one stock upload' );
	assert.equal( stockRows( r ).length, 3, 'each photo keeps its own row' );
} );

test( 'MUST FAIL: paintedAsset follows a painted stock URL, with any query, to its stock entry', () => {
	const map = { sites: { 'acme-test': { files: [
		{ asset: 'https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa', id: 7, stock: true, url: 'https://acme.test/wp-content/uploads/2026/10/stock-1111111111111-aaaaaaaaaaaa.jpg' },
		{ asset: 'sites/acme/assets/x.png', id: 8, stock: false, url: 'https://acme.test/wp-content/uploads/2026/10/x.png' },
	] } } };
	assert.equal( paintedAsset( map, 'acme-test', 'https://images.unsplash.com/photo-1111111111111-aaaaaaaaaaaa?w=2200&q=82&auto=format&fit=crop' ).id, 7 );
	assert.equal( paintedAsset( map, 'acme-test', 'https://acme.test/wp-content/uploads/2026/10/stock-1111111111111-aaaaaaaaaaaa-300x200.jpg' ).id, 7 );
	assert.equal( paintedAsset( map, 'acme-test', 'https://images.unsplash.com/photo-2222222222222-bbbbbbbbbbbb?w=10' ), null );
} );

test( 'MUST FAIL: the stock review lists each stock image with where it is painted and its attachment, and no local image', async () => {
	const repo = fixtureRepo();
	draftWithStock( repo );
	const r = await runStock( repo, { sites: {} }, withStockHost( fakeWordPress() ).fetchImpl );
	const md = stockReview( 'acme', r.map );
	assert.match( md, /\| https:\/\/images\.unsplash\.com\/photo-1111111111111-aaaaaaaaaaaa \| Home\.dc\.html:1<br>Home\.dc\.html:2 \| \d+ \|/ );
	assert.equal( ( md.match( /^\| https:/gm ) || [] ).length, 3 );
	assert.ok( ! md.includes( 'bread.jpg' ) );
} );
