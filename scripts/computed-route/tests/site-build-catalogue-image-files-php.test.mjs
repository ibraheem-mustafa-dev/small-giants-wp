// Spec 48 FR-48-92: the catalogue step never reuses an attachment whose file is not on disk (a row copied from a mirror that
// lacks the uploads), and a product whose thumbnail or gallery points only at such attachments counts as having no image
// there (lib/site-build-catalogue-php.mjs::$sgs_attachment, lib/site-build-catalogue.mjs). The step's read and write PHP runs
// under php against the stand-in WooCommerce (tests/fixtures/catalogue/php-shop.mjs), through runCatalogue.
// Tests marked MUST FAIL fail on the catalogue step before the rule. Needs `php` on PATH.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { catalogueImages, PHOTO_TO_COME, planCatalogue, readCatalogueState } from '../lib/site-build-catalogue.mjs';
import { run, seed, setup, shop } from './fixtures/catalogue/php-shop.mjs';

const JAR = 'sites/demo/handoff/assets/jar.svg';
const SIDE = 'sites/demo/handoff/assets/jar-side.svg';
const writeCatalogue = ( repo, cat ) => fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( cat, null, 2 ) }\n` );
// An attachment row of the seeded store: `meta` is its post meta, `file` false when its file is not on disk.
function attach( st, id, meta, file = true ) {
	st.posts[ id ] = { type: 'attachment', parent: 0, status: 'inherit', name: `att${ id }`, slug: `att${ id }`, sku: '', price: '', thumb: 0, gallery: [], attrs: {}, defaults: {}, vattrs: {}, meta };
	if ( ! file ) {
		st.files[ id ] = false;
	}
}
const attachments = ( st ) => Object.entries( st.posts ).filter( ( [ , p ] ) => p && 'attachment' === p.type ).map( ( [ id ] ) => Number( id ) );
const jarState = ( repo, catalogue, s ) => readCatalogueState( s.runPhp, catalogue, catalogueImages( repo, catalogue ) );

test( 'MUST FAIL: an attachment row with no file is not matched: the read finds no image for it and the plan notes the skipped attachment', () => {
	const { repo, catalogue } = setup();
	const imgs = catalogueImages( repo, catalogue );
	const st = seed();
	attach( st, 60, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/10/jar.svg' }, false );
	const s = shop( st );
	const state = jarState( repo, catalogue, s );
	assert.equal( state.images[ JAR ], 0, 'the fileless attachment is not the image' );
	assert.deepEqual( state.imagesNoFile[ JAR ], [ 60 ] );
	const plan = planCatalogue( catalogue, state );
	assert.ok( plan.notes.some( ( n ) => /^image sites\/demo\/handoff\/assets\/jar\.svg: attachment 60 on this site has no file, skipped/.test( n ) ), plan.notes.join( '\n' ) );
} );

test( 'MUST FAIL: a product with no image and a fileless attachment of the draft image gets the image made again, not the fileless attachment; a fresh read plans 0', () => {
	const { repo, catalogue } = setup();
	const imgs = catalogueImages( repo, catalogue );
	const st = seed( { extra: { thumb: 0, gallery: [] } } );
	attach( st, 60, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/10/jar.svg' }, false );
	const s = shop( st );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /image sites\/demo\/handoff\/assets\/jar\.svg: attachment 60 has no file, skipped/.test( l ) ), done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /image uploaded jar\.svg/.test( l ) ), 'the image is uploaded again' );
	const after = s.state();
	assert.notEqual( after.posts[ 50 ].thumb, 60 );
	assert.ok( after.posts[ 50 ].thumb > 0 && 'string' === typeof after.files[ after.posts[ 50 ].thumb ], 'the thumbnail is the new attachment, which has its file' );
	assert.equal( after.posts[ 60 ].meta._sgs_draft_asset, imgs[ JAR ].sha, 'the old row is left as it is' );
	assert.ok( done.out.some( ( l ) => /a fresh read plans 0/.test( l ) ) );
} );

test( 'MUST FAIL: a product whose thumbnail and gallery attachments have no file gets the draft image and gallery in their place', () => {
	const { repo, catalogue } = setup();
	const st = seed( { extra: { thumb: 61, gallery: [ 62 ] } } );
	attach( st, 61, { _wp_attached_file: '2026/10/other.png' }, false );
	attach( st, 62, { _wp_attached_file: '2026/10/other-side.png' }, false );
	const s = shop( st );
	const dry = run( repo, s.runPhp, false );
	assert.match( dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) ), /lacks .*image \(its attachment 61 has no file\), gallery of 2/ );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const after = s.state();
	const thumb = after.posts[ 50 ].thumb;
	assert.ok( thumb && 61 !== thumb && 'string' === typeof after.files[ thumb ], 'a new attachment with a file is the thumbnail' );
	assert.equal( after.posts[ thumb ].meta._sgs_draft_asset, catalogueImages( repo, catalogue )[ JAR ].sha, 'it is the draft image' );
	const gallery = after.posts[ 50 ].gallery;
	assert.ok( gallery.length > 0 && gallery.every( ( g ) => 62 !== g && 'string' === typeof after.files[ g ] ), 'the gallery is made again from the draft' );
	assert.ok( done.out.some( ( l ) => /a fresh read plans 0/.test( l ) ) );
} );

test( 'MUST FAIL: of two attachments for one image, the one whose file exists is the image, and nothing is uploaded', () => {
	const { repo, catalogue } = setup();
	const imgs = catalogueImages( repo, catalogue );
	const st = seed();
	attach( st, 60, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/10/jar.svg' }, false );
	attach( st, 63, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/11/jar.svg' } );
	const s = shop( st );
	const state = jarState( repo, catalogue, s );
	assert.equal( state.images[ JAR ], 63 );
	assert.deepEqual( state.imagesNoFile[ JAR ], [ 60 ] );
	const before = attachments( s.state() );
	run( repo, s.runPhp, true );
	const made = attachments( s.state() ).filter( ( id ) => ! before.includes( id ) && s.state().posts[ id ].meta._wp_attached_file.endsWith( 'jar.svg' ) );
	assert.deepEqual( made, [], 'the image is not uploaded again' );
} );

test( 'MUST FAIL: an address image whose attachment has no file is fetched again, and one whose file exists is reused', () => {
	const { repo, catalogue } = setup();
	const url = 'https://img.test/jar.jpg';
	const cat = { ...catalogue, products: [ { ...catalogue.products[ 0 ], image: { url }, gallery: [] } ] };
	writeCatalogue( repo, cat );
	const st = seed( { extra: { thumb: 0, gallery: [] } } );
	attach( st, 60, { _sgs_draft_image_source: url, _wp_attached_file: '2026/10/jar.jpg' }, false );
	const s = shop( st );
	assert.equal( jarState( repo, cat, s ).images[ url ], 0 );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /image fetched https:\/\/img\.test\/jar\.jpg/.test( l ) ), done.out.join( '\n' ) );
	const after = s.state();
	assert.notEqual( after.posts[ 50 ].thumb, 60 );
	// The new attachment carries the address, so a fresh read finds it (the fileless row stays and is skipped).
	assert.equal( after.posts[ after.posts[ 50 ].thumb ].meta._sgs_draft_image_source, url );
	assert.equal( jarState( repo, cat, s ).images[ url ], after.posts[ 50 ].thumb );
	// With its file present the attachment is the image.
	const ok = seed( { extra: { thumb: 0, gallery: [] } } );
	attach( ok, 60, { _sgs_draft_image_source: url, _wp_attached_file: '2026/10/jar.jpg' } );
	const s2 = shop( ok );
	run( repo, s2.runPhp, true );
	assert.equal( s2.state().posts[ 50 ].thumb, 60 );
} );

test( 'MUST FAIL: a product carrying a photo-to-come attachment with no file gets the photo-to-come image made again, marked as such', () => {
	const { repo, catalogue } = setup();
	const bare = { ...catalogue, products: [ { ...catalogue.products[ 0 ], image: null, gallery: [] } ] };
	writeCatalogue( repo, bare );
	const imgs = catalogueImages( repo, bare );
	const st = seed( { extra: { thumb: 70, gallery: [], meta: { _sgs_draft_product: 'jar', _sgs_rrp: '', _sgs_photo_to_come: '1' } } } );
	attach( st, 70, { _sgs_draft_asset: imgs[ PHOTO_TO_COME ].sha, _wp_attached_file: '2026/10/photo-to-come.png' }, false );
	const s = shop( st );
	const state = readCatalogueState( s.runPhp, bare, imgs );
	assert.equal( state.images[ PHOTO_TO_COME ], 0 );
	assert.equal( state.products[ 0 ].image, 0, 'the fileless photo-to-come is no image' );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const after = s.state();
	const thumb = after.posts[ 50 ].thumb;
	assert.ok( 70 !== thumb && 'string' === typeof after.files[ thumb ] );
	assert.equal( after.posts[ thumb ].meta._wp_attached_file.endsWith( 'photo-to-come.png' ), true );
	assert.equal( after.posts[ 50 ].meta._sgs_photo_to_come, '1' );
	assert.ok( done.out.some( ( l ) => /a fresh read plans 0/.test( l ) ) );
} );

test( 'an attachment whose file exists is the image: found by its draft asset or file name, nothing noted', () => {
	const { repo, catalogue } = setup();
	const imgs = catalogueImages( repo, catalogue );
	const st = seed();
	attach( st, 60, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/10/jar.svg' } );
	attach( st, 61, { _wp_attached_file: '2026/10/jar-side.svg' } );
	const s = shop( st );
	const state = jarState( repo, catalogue, s );
	assert.equal( state.images[ JAR ], 60 );
	assert.equal( state.images[ SIDE ], 61, 'found by its file name' );
	assert.deepEqual( Object.keys( state.imagesNoFile ), [] );
	assert.ok( ! planCatalogue( catalogue, state ).notes.some( ( n ) => /has no file|have no file/.test( n ) ) );
} );

test( 'a product whose thumbnail and gallery files exist keeps them: nothing is replaced and no image is made', () => {
	const { repo, catalogue } = setup();
	const imgs = catalogueImages( repo, catalogue );
	const st = seed( { extra: { thumb: 64, gallery: [ 65 ] } } );
	attach( st, 64, { _wp_attached_file: '2026/10/own.png' } );
	attach( st, 65, { _wp_attached_file: '2026/10/own-side.png' } );
	attach( st, 60, { _sgs_draft_asset: imgs[ JAR ].sha, _wp_attached_file: '2026/10/jar.svg' } );
	const s = shop( st );
	const state = jarState( repo, catalogue, s );
	assert.deepEqual( [ state.products[ 0 ].image, state.products[ 0 ].imageNoFile, state.products[ 0 ].gallery ], [ 64, 0, 1 ] );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const after = s.state();
	assert.deepEqual( [ after.posts[ 50 ].thumb, after.posts[ 50 ].gallery ], [ 64, [ 65 ] ] );
	assert.ok( ! done.out.some( ( l ) => /image uploaded|image fetched|has no file/.test( l ) ), done.out.join( '\n' ) );
} );
