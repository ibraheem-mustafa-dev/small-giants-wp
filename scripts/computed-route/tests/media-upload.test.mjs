// Spec 48 FR-48-58, lib/media-upload.mjs against an in-memory WordPress: the first run uploads every image once and
// maps it; a second run uploads nothing; a deleted attachment or a stored file that changed is uploaded again; an SVG
// the sanitiser rewrote is marked for review; a dry run uploads nothing; a painted size URL maps back to its asset.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { mediaAssets, paintedAsset, sha256, siteCredentials, uploadMedia } from '../lib/media-upload.mjs';

function fixtureRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'media-upload-' ) );
	const put = ( rel, body ) => {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), body );
	};
	put( 'sites/acme/handoff/assets/hero.png', 'PNG-hero' );
	put( 'sites/acme/handoff/assets/logo.svg', '<svg viewBox="0 0 10 10"><script>x</script></svg>' );
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
