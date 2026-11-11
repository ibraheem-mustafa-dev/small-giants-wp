// Spec 48 FR-48-39 (images) and Spec 49 section 11, lib/fill-media.mjs over lib/media/: the media a draft element draws
// at 375, 768 and 1440 writes the slot's Source (attachment id, URL, width, height, mime) per device, Alt or Decorative,
// and a figcaption writes the caption; a file the media map lacks is a named gap and writes no address; a block with no
// matching slot is untouched for wrapped media and named for the element's own; the painted-asset check names the attachment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaDecisions, resolveMedia, draftPath, paintedImageCheck, factImage, captionOf, mediaAt } from '../lib/fill-media.mjs';
import { blockMediaSlots, mediaSettings } from '../lib/media/slots.mjs';

const MAP = { sites: { 'acme-test': { files: [
	{ asset: 'sites/acme/handoff/assets/hero.png', id: 101, url: 'https://acme.test/wp-content/uploads/hero.png' },
	{ asset: 'sites/acme/assets/food/bread.jpg', id: 102, url: 'https://acme.test/wp-content/uploads/bread.jpg' },
] } } };
const SLOT = { prefix: '', context: 'content', kinds: [ 'image', 'video', 'embed', 'svg' ], source: 'source', alt: 'alt', decorative: 'decorative', caption: 'caption' };
const SLOTS = [ SLOT ];
const media = { map: MAP, site: 'acme-test', origin: 'http://127.0.0.1:4000' };
const NATURAL = { w: 1500, h: 1000 };
// One <img> the draft draws: position static, so it is plain media.
const img = ( src, alt = 'x', over = {} ) => ( { tag: 'img', src, alt, natural: NATURAL, poster: null, markup: null, own: true, element: { computed: { position: 'static' }, hasText: false }, ...over } );
const at = ( m, w = [ 1440, 768, 375 ] ) => Object.fromEntries( [ 1440, 768, 375 ].map( ( x ) => [ x, w.includes( x ) ? [ m ] : [] ] ) );
const run = ( m, over = {} ) => mediaDecisions( { slots: SLOTS, reads: at( m ), media, ...over } );
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'a mapped draft image writes the Source with attachment id, URL, size and mime, and the alt (MUST FAIL)', () => {
	const r = run( img( './assets/hero.png?v=2', ' A sunlit loaf ' ) );
	assert.deepEqual( val( r, 'source' ), { desktop: { kind: 'image', url: 'https://acme.test/wp-content/uploads/hero.png', id: 101, mime: 'image/png', width: 1500, height: 1000 } } );
	assert.equal( val( r, 'alt' ), 'A sunlit loaf' );
	assert.equal( r.unmapped.length, 0 );
} );

test( 'the draft address on its own origin and the client assets folder both map', () => {
	assert.equal( val( run( img( 'http://127.0.0.1:4000/assets/hero.png' ) ), 'source' ).desktop.id, 101 );
	assert.equal( val( run( img( 'food/bread.jpg' ) ), 'source' ).desktop.id, 102 );
} );

test( 'a different file at 375 writes a mobile Source and nothing at tablet; media hidden at 375 writes kind none (MUST FAIL)', () => {
	const r = mediaDecisions( { slots: SLOTS, media, reads: { 1440: [ img( 'assets/hero.png' ) ], 768: [ img( 'assets/hero.png' ) ], 375: [ img( 'food/bread.jpg' ) ] } } );
	const s = val( r, 'source' );
	assert.deepEqual( Object.keys( s ), [ 'desktop', 'mobile' ] );
	assert.equal( s.mobile.id, 102 );
	const hidden = mediaDecisions( { slots: SLOTS, media, reads: { 1440: [ img( 'assets/hero.png' ) ], 768: [ img( 'assets/hero.png' ) ], 375: [] } } );
	assert.deepEqual( val( hidden, 'source' ).mobile, { kind: 'none' } );
} );

test( 'a video on desktop and a photo on mobile write per-device kinds; an iframe writes an embed', () => {
	const raw = ( tag, src ) => ( { tag, src, alt: null, poster: null, natural: null, markup: null, own: true, element: { computed: { position: 'static' } } } );
	const r = mediaDecisions( { slots: SLOTS, media, reads: { 1440: [ raw( 'video', 'assets/hero.png' ) ], 768: [ raw( 'video', 'assets/hero.png' ) ], 375: [ img( 'food/bread.jpg' ) ] } } );
	assert.deepEqual( [ val( r, 'source' ).desktop.kind, val( r, 'source' ).mobile.kind ], [ 'video', 'image' ] );
	const frame = raw( 'iframe', 'https://www.youtube.com/embed/x' );
	assert.deepEqual( val( mediaDecisions( { slots: SLOTS, media, reads: at( frame ) } ), 'source' ), { desktop: { kind: 'embed', url: 'https://www.youtube.com/embed/x' } } );
} );

test( 'an empty alt writes Decorative; no alt writes neither', () => {
	assert.equal( val( run( img( 'assets/hero.png', '' ) ), 'decorative' ), true );
	assert.equal( val( run( img( 'assets/hero.png', '' ) ), 'alt' ), undefined );
	assert.match( run( img( 'assets/hero.png', null ) ).notes.join( '\n' ), /no alt/ );
} );

test( 'an absolute full-box image behind content goes to the Background slot, not the content slot', () => {
	const bg = img( 'assets/hero.png', '', { own: false, element: { computed: { position: 'absolute', inset: true }, fullBox: true, behindSiblings: true, hasSiblingContent: true, hasText: false } } );
	const slots = [ SLOT, { prefix: 'background', context: 'background', kinds: [ 'image', 'video', 'svg' ], source: 'backgroundSource', alt: 'backgroundAlt', decorative: 'backgroundDecorative', caption: null } ];
	const r = mediaDecisions( { slots, media, reads: at( bg ) } );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ).sort(), [ 'backgroundDecorative', 'backgroundSource' ] );
} );

test( 'a figcaption writes the caption, escaped (MUST FAIL)', () => {
	assert.equal( val( run( img( 'assets/hero.png', 'Loaf' ), { caption: 'Rye & spelt <fresh>' } ), 'caption' ), 'Rye &amp; spelt &lt;fresh&gt;' );
} );

test( 'a figcaption on a slot with no caption setting is a named gap', () => {
	const r = run( img( 'assets/hero.png', 'Loaf' ), { slots: [ { ...SLOT, caption: null } ], caption: 'Fresh' } );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /no caption setting/ );
} );

test( 'an unmapped image raises a named gap and writes no URL (MUST FAIL)', () => {
	const r = run( img( 'assets/missing.png', 'Gone' ) );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.unmapped.length, 1 );
	assert.equal( r.unmapped[ 0 ].property, 'image' );
	assert.equal( r.unmapped[ 0 ].value, 'assets/missing.png' );
	assert.match( r.unmapped[ 0 ].reason, /"assets\/missing\.png" is not in the media map for acme-test/ );
} );

test( 'a missing media map, an external or data address and an ambiguous name are gaps with no write', () => {
	const none = run( img( 'assets/hero.png' ), { media: { map: null, site: 'acme-test', origin: '' } } );
	assert.match( none.unmapped[ 0 ].reason, /no media map/ );
	assert.equal( none.writes.length, 0 );
	for ( const src of [ 'https://cdn.example.com/hero.png', 'data:image/png;base64,AAAA' ] ) {
		const r = run( img( src ) );
		assert.equal( r.writes.length, 0 );
		assert.match( r.unmapped[ 0 ].reason, /not a file of the draft/ );
	}
	const twin = { sites: { 'acme-test': { files: [ { asset: 'a/x/logo.png', id: 1, url: 'u1' }, { asset: 'b/x/logo.png', id: 2, url: 'u2' } ] } } };
	const amb = run( img( 'x/logo.png' ), { media: { map: twin, site: 'acme-test' } } );
	assert.equal( amb.writes.length, 0 );
	assert.match( amb.unmapped[ 0 ].reason, /different attachments/ );
	assert.match( resolveMedia( 'x/logo.png', { map: twin, site: 'acme-test' } ).reason, /different attachments/ );
} );

test( 'a block with no media slot is untouched for wrapped media and named for its own element; two content slots are a gap', () => {
	const wrapped = run( img( 'assets/hero.png', 'x', { own: false } ), { slots: [] } );
	assert.deepEqual( [ wrapped.writes, wrapped.unmapped, wrapped.notes ], [ [], [], [] ] );
	assert.deepEqual( mediaDecisions( { slots: [], reads: { 1440: [], 768: [], 375: [] }, media } ), { writes: [], unmapped: [], notes: [], checks: [] } );
	const bare = run( img( 'assets/hero.png' ), { slots: [] } );
	assert.equal( bare.writes.length, 0 );
	assert.match( bare.unmapped[ 0 ].reason, /no content media setting/ );
	const two = run( img( 'assets/hero.png' ), { slots: [ SLOT, { ...SLOT, prefix: 'after', source: 'afterSource' } ] } );
	assert.equal( two.writes.length, 0 );
	assert.match( two.unmapped[ 0 ].reason, /cannot choose/ );
} );

test( 'two media of one role showing at one width are a gap', () => {
	const r = mediaDecisions( { slots: SLOTS, media, reads: { 1440: [ img( 'assets/hero.png' ), img( 'food/bread.jpg' ) ], 768: [], 375: [] } } );
	assert.equal( r.writes.length, 0 );
	assert.match( r.unmapped[ 0 ].reason, /2 media elements show at 1440px/ );
} );

test( 'a setting that already holds a value is kept and a difference is a note', () => {
	const r = run( img( 'assets/hero.png', '' ), { attributes: { source: { desktop: { kind: 'image', id: 5, url: 'https://other/x.png' } } } } );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'decorative' ] );
	assert.match( r.notes.join( '\n' ), /source holds/ );
} );

test( 'the slots come from supports.sgs.mediaElements: sgs/media has one content slot, sgs/hero a split and a background slot', () => {
	assert.deepEqual( blockMediaSlots( 'sgs/media' ).map( ( s ) => [ s.source, s.alt, s.decorative, s.caption ] ), [ [ 'source', 'alt', 'decorative', 'caption' ] ] );
	assert.deepEqual( blockMediaSlots( 'sgs/hero' ).map( ( s ) => [ s.context, s.source ] ), [ [ 'content', 'splitSource' ], [ 'background', 'backgroundSource' ] ] );
	assert.deepEqual( blockMediaSlots( 'sgs/text' ), [] );
	assert.ok( mediaSettings( 'sgs/hero' ).includes( 'backgroundSource' ) );
	assert.equal( mediaSettings( 'sgs/card-grid' ).length, 0, 'an item slot is written by the list writer, not the media writer' );
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
	const r = run( img( 'assets/hero.png', null ), { fact: { alt: 'A sunlit loaf', ratio: 1.5, asset: 'assets/hero.png' } } );
	assert.equal( val( r, 'alt' ), 'A sunlit loaf' );
	assert.deepEqual( r.checks.map( ( c ) => [ c.attr, c.id, c.ratio, c.alt ] ), [ [ 'source', 101, 1.5, 'A sunlit loaf' ] ] );
	assert.equal( run( img( 'assets/missing.png' ) ).checks.length, 0, 'an unmapped image has nothing to check' );
} );

test( 'MUST FAIL: factImage reads the placeholder (never a {{ }} hole) and the file\'s ratio by template key; captionOf and mediaAt take the own element of the node, else the single descendant slot', () => {
	const facts = { elements: { 'Page/7': { alt: { source: 'image-slot', placeholder: ' Loaf ', hole: false, id: null }, assets: [ { path: 'assets/hero.png', ratio: 1.5 } ] }, 'Page/8': { alt: { source: 'image-slot', placeholder: '{{ a }}', hole: true, id: null }, assets: [] } } };
	assert.deepEqual( factImage( facts, 'Root/7#0', 'Page' ), { alt: 'Loaf', ratio: 1.5, asset: 'assets/hero.png' } );
	assert.equal( factImage( facts, 'Root/8#0', 'Page' ).alt, null );
	assert.equal( factImage( facts, 'Root/9#0', 'Page' ), null );
	assert.equal( captionOf( { '': { img: { caption: 'Own' } }, '.a': { img: { caption: 'Inner' } } } ), 'Own' );
	assert.equal( captionOf( { '': { img: null }, '.inner': { img: { caption: 'Inner' } } } ), 'Inner' );
	assert.equal( captionOf( { '': {}, '.a': { img: { caption: 'A' } }, '.b': { img: { caption: 'B' } } } ), null );
	const m = { tag: 'img', src: 'a.png' };
	assert.deepEqual( mediaAt( { '': { media: [ m ] }, '.a': { media: [ m ] } } ), [ m ], 'the own element lists its descendants' );
	assert.deepEqual( mediaAt( { '': { missing: true }, '.a': { media: [ m ] } } ), [ m ] );
	assert.deepEqual( mediaAt( { '': { missing: true } } ), [] );
} );

// A stock preview the draft paints from a stock host is uploaded as a `stock: true` entry keyed by its address without
// the query (lib/media-upload.mjs::uploadMedia); Fill maps the painted address to it.
const STOCK_MAP = { sites: { 'acme-test': { files: [
	...MAP.sites[ 'acme-test' ].files,
	{ asset: 'https://images.unsplash.com/photo-1501-abc', source: 'https://images.unsplash.com/photo-1501-abc?w=1600&q=80', id: 201, url: 'https://acme.test/wp-content/uploads/stock-1501-abc.jpg', stock: true },
	{ asset: 'https://images.unsplash.com/photo-1502-def', id: 202, url: 'https://acme.test/wp-content/uploads/stock-1502-def.jpg', stock: false },
] } } };

test( 'MUST FAIL: a stock preview the draft paints maps to its stock entry whatever width the draft asks for', () => {
	const r = run( img( 'https://images.unsplash.com/photo-1501-abc?w=1200&q=70&auto=format&fit=crop', null, { tag: 'image-slot' } ), { media: { ...media, map: STOCK_MAP }, fact: { alt: 'Spices in bowls', ratio: null, asset: null } } );
	assert.equal( val( r, 'source' ).desktop.id, 201 );
	assert.equal( val( r, 'source' ).desktop.url, 'https://acme.test/wp-content/uploads/stock-1501-abc.jpg' );
	assert.equal( val( r, 'alt' ), 'Spices in bowls' );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.checks.map( ( c ) => [ c.id, c.asset ] ), [ [ 201, 'https://images.unsplash.com/photo-1501-abc' ] ] );
} );

test( 'MUST FAIL: a stock address the map lacks, or holds only as a non-stock entry, is a named gap; another host stays not a draft file', () => {
	const missing = run( img( 'https://images.unsplash.com/photo-1999-zzz?w=800' ), { media: { ...media, map: STOCK_MAP } } );
	assert.equal( missing.writes.length, 0 );
	assert.match( missing.unmapped[ 0 ].reason, /the stock preview "https:\/\/images\.unsplash\.com\/photo-1999-zzz" is not in the media map for acme-test/ );
	const notStock = run( img( 'https://images.unsplash.com/photo-1502-def?w=800' ), { media: { ...media, map: STOCK_MAP } } );
	assert.equal( notStock.writes.length, 0, 'only a stock: true entry stands for a stock preview' );
	const elsewhere = run( img( 'https://cdn.example.com/photo-1501-abc' ), { media: { ...media, map: STOCK_MAP } } );
	assert.match( elsewhere.unmapped[ 0 ].reason, /not a file of the draft/ );
	const noMap = run( img( 'https://images.unsplash.com/photo-1501-abc?w=800' ), { media: { ...media, map: null } } );
	assert.match( noMap.unmapped[ 0 ].reason, /no media map: .*"https:\/\/images\.unsplash\.com\/photo-1501-abc"/ );
} );
