// Spec 48 FR-48-39 (images), lib/fill-media.mjs: a mapped draft image writes its attachment id, URL and alt; a figcaption
// writes the caption; an image the media map lacks is a named gap and writes no address; a block with no image setting
// is untouched; the painted-asset check names the attachment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mediaDecisions, imageSlots, draftPath, paintedImageCheck, factImage, nestedImage } from '../lib/fill-media.mjs';

const MAP = { sites: { 'acme-test': { files: [
	{ asset: 'sites/acme/handoff/assets/hero.png', id: 101, url: 'https://acme.test/wp-content/uploads/hero.png' },
	{ asset: 'sites/acme/assets/food/bread.jpg', id: 102, url: 'https://acme.test/wp-content/uploads/bread.jpg' },
] } } };
const SCHEMA = { imageUrl: { type: 'string' }, imageId: { type: 'integer' }, imageAlt: { type: 'string' }, caption: { type: 'string' } };
const SLOTS = [ { alt: 'imageAlt', url: 'imageUrl' } ];
const media = { map: MAP, site: 'acme-test', origin: 'http://127.0.0.1:4000' };
const run = ( img, over = {} ) => mediaDecisions( { slots: SLOTS, schema: SCHEMA, img, media, ...over } );
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'a mapped draft image writes the attachment id, URL and alt (MUST FAIL)', () => {
	const r = run( { tag: 'img', src: './assets/hero.png?v=2', alt: ' A sunlit loaf ', caption: null } );
	assert.equal( val( r, 'imageId' ), 101 );
	assert.equal( val( r, 'imageUrl' ), 'https://acme.test/wp-content/uploads/hero.png' );
	assert.equal( val( r, 'imageAlt' ), 'A sunlit loaf' );
	assert.equal( r.unmapped.length, 0 );
} );

test( 'the draft address on its own origin and the client assets folder both map', () => {
	assert.equal( val( run( { tag: 'img', src: 'http://127.0.0.1:4000/assets/hero.png', alt: 'x' } ), 'imageId' ), 101 );
	assert.equal( val( run( { tag: 'img', src: 'food/bread.jpg', alt: 'x' } ), 'imageId' ), 102 );
} );

test( 'a figcaption writes the caption, escaped (MUST FAIL)', () => {
	const r = run( { tag: 'figure', src: 'assets/hero.png', alt: 'Loaf', caption: 'Rye & spelt <fresh>' } );
	assert.equal( val( r, 'caption' ), 'Rye &amp; spelt &lt;fresh&gt;' );
} );

test( 'a figcaption on a block with no caption setting is a named gap', () => {
	const { caption, ...noCaption } = SCHEMA;
	const r = run( { tag: 'figure', src: 'assets/hero.png', alt: 'Loaf', caption: 'Fresh' }, { schema: noCaption } );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /no caption setting/ );
} );

test( 'an unmapped image raises a named gap and writes no URL (MUST FAIL)', () => {
	const r = run( { tag: 'img', src: 'assets/missing.png', alt: 'Gone' } );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.unmapped.length, 1 );
	assert.equal( r.unmapped[ 0 ].property, 'image' );
	assert.equal( r.unmapped[ 0 ].value, 'assets/missing.png' );
	assert.match( r.unmapped[ 0 ].reason, /"assets\/missing\.png" is not in the media map for acme-test/ );
} );

test( 'a missing media map, an external or data address and an ambiguous name are gaps with no write', () => {
	const none = run( { tag: 'img', src: 'assets/hero.png', alt: 'x' }, { media: { map: null, site: 'acme-test', origin: '' } } );
	assert.match( none.unmapped[ 0 ].reason, /no media map/ );
	assert.equal( none.writes.length, 0 );
	for ( const src of [ 'https://cdn.example.com/hero.png', 'data:image/png;base64,AAAA' ] ) {
		const r = run( { tag: 'img', src, alt: 'x' } );
		assert.equal( r.writes.length, 0 );
		assert.match( r.unmapped[ 0 ].reason, /not a file of the draft/ );
	}
	const twin = { sites: { 'acme-test': { files: [ { asset: 'a/x/logo.png', id: 1, url: 'u1' }, { asset: 'b/x/logo.png', id: 2, url: 'u2' } ] } } };
	const amb = run( { tag: 'img', src: 'x/logo.png', alt: 'x' }, { media: { map: twin, site: 'acme-test' } } );
	assert.equal( amb.writes.length, 0 );
	assert.match( amb.unmapped[ 0 ].reason, /different attachments/ );
} );

test( 'a block with no image setting is untouched for a figure and named for a bare img; several settings are a gap', () => {
	const fig = run( { tag: 'figure', src: 'assets/hero.png', alt: 'x', caption: 'c' }, { slots: [] } );
	assert.deepEqual( [ fig.writes, fig.unmapped, fig.notes ], [ [], [], [] ] );
	assert.deepEqual( run( null, { slots: [] } ), { writes: [], unmapped: [], notes: [], checks: [] } );
	const bare = run( { tag: 'img', src: 'assets/hero.png', alt: 'x' }, { slots: [] } );
	assert.equal( bare.writes.length, 0 );
	assert.match( bare.unmapped[ 0 ].reason, /no image setting/ );
	const two = run( { tag: 'img', src: 'assets/hero.png', alt: 'x' }, { slots: [ ...SLOTS, { alt: 'afterAlt', url: 'afterUrl' } ] } );
	assert.equal( two.writes.length, 0 );
	assert.match( two.unmapped[ 0 ].reason, /cannot choose/ );
} );

test( 'a setting that already holds a value is kept and a difference is a note; an empty alt writes none', () => {
	const r = run( { tag: 'img', src: 'assets/hero.png', alt: '' }, { attributes: { imageUrl: 'https://other/x.png', imageId: 101 } } );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.notes.length, 2 );
	assert.match( r.notes.join( '\n' ), /imageUrl holds "https:\/\/other\/x\.png"/ );
	assert.match( r.notes.join( '\n' ), /empty alt/ );
} );

test( 'the id setting is the URL setting with Url changed to Id, kept only when the block declares it', () => {
	const { imageId, ...noId } = SCHEMA;
	assert.equal( val( run( { tag: 'img', src: 'assets/hero.png', alt: 'x' }, { schema: noId } ), 'imageId' ), undefined );
	const logo = mediaDecisions( { slots: [ { alt: 'alt', url: 'logoUrl' } ], schema: { logoUrl: {}, logoId: {}, alt: {} }, img: { tag: 'img', src: 'assets/hero.png', alt: 'Logo' }, media } );
	assert.equal( val( logo, 'logoId' ), 101 );
	assert.equal( val( logo, 'alt' ), 'Logo' );
} );

test( 'imageSlots reads the alt and URL settings from the DB image-alt rows only', () => {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, role TEXT, alt_companion_attr TEXT )' );
	db.exec( "INSERT INTO block_attributes VALUES ( 'sgs/media', 'imageAlt', 'image-alt', 'imageUrl' ), ( 'sgs/media', 'imageUrl', 'image-object', NULL ), ( 'sgs/text', 'content', 'text-content', NULL )" );
	assert.deepEqual( imageSlots( db, 'sgs/media' ), [ { alt: 'imageAlt', url: 'imageUrl' } ] );
	assert.deepEqual( imageSlots( db, 'sgs/text' ), [] );
} );

test( 'draftPath keeps a draft file and refuses another origin', () => {
	assert.equal( draftPath( '../assets/a%20b.png#x', '' ), 'assets/a b.png' );
	assert.equal( draftPath( 'https://cdn.example.com/a.png', 'http://127.0.0.1:4000' ), null );
	assert.equal( draftPath( '', '' ), null );
} );

test( 'the painted-asset check passes the mapped attachment (a WordPress size too) and names a wrong or unknown one (MUST FAIL)', () => {
	const ok = paintedImageCheck( { map: MAP, site: 'acme-test', painted: 'https://acme.test/wp-content/uploads/hero-300x200.png', id: 101 } );
	assert.equal( ok.ok, true );
	const wrong = paintedImageCheck( { map: MAP, site: 'acme-test', painted: 'https://acme.test/wp-content/uploads/bread.jpg', id: 101 } );
	assert.equal( wrong.ok, false );
	assert.match( wrong.reason, /attachment 102.*wrote attachment 101/ );
	assert.equal( paintedImageCheck( { map: MAP, site: 'acme-test', painted: 'https://elsewhere/x.png', id: 101 } ).ok, false );
} );

test( 'MUST FAIL: the image check names the attachment, and a stated ratio the painted image does not have fails', () => {
	const ok = paintedImageCheck( { map: MAP, site: 'acme-test', painted: 'https://acme.test/wp-content/uploads/hero.png', id: 101, ratio: 1.5, natural: { w: 1500, h: 1000 } } );
	assert.equal( ok.ok, true );
	const squashed = paintedImageCheck( { map: MAP, site: 'acme-test', painted: 'https://acme.test/wp-content/uploads/hero.png', id: 101, ratio: 1.5, natural: { w: 1000, h: 1000 } } );
	assert.equal( squashed.ok, false );
	assert.match( squashed.reason, /states ratio 1\.500/ );
} );

test( 'MUST FAIL: the alt falls back to the fact record\'s placeholder, and every mapped image raises a live-check row', () => {
	const r = run( { tag: 'img', src: 'assets/hero.png', alt: null }, { fact: { alt: 'A sunlit loaf', ratio: 1.5, asset: 'assets/hero.png' } } );
	assert.equal( val( r, 'imageAlt' ), 'A sunlit loaf' );
	assert.deepEqual( r.checks.map( ( c ) => [ c.attr, c.id, c.ratio, c.alt ] ), [ [ 'imageUrl', 101, 1.5, 'A sunlit loaf' ] ] );
	assert.equal( run( { tag: 'img', src: 'assets/missing.png', alt: 'x' } ).checks.length, 0, 'an unmapped image has nothing to check' );
} );

test( 'MUST FAIL: factImage reads the placeholder (never a {{ }} hole) and the file\'s ratio by template key; nestedImage takes a single descendant slot', () => {
	const facts = { elements: { 'Page/7': { alt: { source: 'image-slot', placeholder: ' Loaf ', hole: false, id: null }, assets: [ { path: 'assets/hero.png', ratio: 1.5 } ] }, 'Page/8': { alt: { source: 'image-slot', placeholder: '{{ a }}', hole: true, id: null }, assets: [] } } };
	assert.deepEqual( factImage( facts, 'Root/7#0', 'Page' ), { alt: 'Loaf', ratio: 1.5, asset: 'assets/hero.png' } );
	assert.equal( factImage( facts, 'Root/8#0', 'Page' ).alt, null );
	assert.equal( factImage( facts, 'Root/9#0', 'Page' ), null );
	const img = { tag: 'div', src: 'a.png', alt: 'x' };
	assert.equal( nestedImage( { '': { img: null }, '.inner': { img } } ).slot, '.inner' );
	assert.equal( nestedImage( { '': {}, '.a': { img }, '.b': { img } } ), null );
} );
