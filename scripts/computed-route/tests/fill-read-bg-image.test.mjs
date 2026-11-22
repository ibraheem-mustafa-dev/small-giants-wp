// The page read's media (lib/fill-read-collect.mjs, snap.media): a wordless element with no child element that paints one
// picture as its own background (a card's photo drawn with CSS, `<div style="background-image:url(card.jpg)">`) shows that
// picture as its own image with an empty alt, so Fill writes it into the media block's Source (lib/media/write.mjs) instead of
// leaving the block blank. MUST FAIL on the read before it (the element listed no media). Must NOT fire on: a gradient, two
// background layers, an element holding words, an element holding a child element, an element that holds an image and an image
// with a background (its image is the media). Mutation list: tests/fixtures/fill-read-bg-image/mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { mediaWrites } from '../lib/media/write.mjs';
import { blockMediaSlots } from '../lib/media/slots.mjs';

const PIC = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 30 20%27%3E%3Crect width=%2730%27 height=%2720%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0 } main > div { width: 300px; height: 200px; background-size: cover; background-position: center }
</style></head><body><main>
<div class="photo" style="background-image:url('card.png')"></div>
<div class="grad" style="background-image:linear-gradient(red, blue)"></div>
<div class="two" style="background-image:url('card.png'), url('other.png')"></div>
<div class="words" style="background-image:url('card.png')">Gift card</div>
<div class="kid" style="background-image:url('card.png')"><span></span></div>
<div class="img" style="background-image:url('card.png')"><img alt="Box" src="${ PIC }"></div>
<img class="self" alt="Self" src="${ PIC }" style="width:300px;height:200px;background-image:url('card.png')">
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/media', draftRef: '.photo', attributes: {} },
	{ name: 'sgs/media', draftRef: '.grad', attributes: {} },
	{ name: 'sgs/media', draftRef: '.two', attributes: {} },
	{ name: 'sgs/media', draftRef: '.words', attributes: {} },
	{ name: 'sgs/media', draftRef: '.kid', attributes: {} },
	{ name: 'sgs/media', draftRef: '.img', attributes: {} },
	{ name: 'sgs/media', draftRef: '.self', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-bg-image-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	fs.writeFileSync( path.join( dir, 'card.png' ), Buffer.from( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64' ) );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const media = ( id, w = 1440 ) => read.widths[ w ][ id ].media || [];

test( 'MUST FAIL: a wordless, childless element painting one background picture shows that picture as its own image', () => {
	const m = media( '1:' );
	assert.equal( m.length, 1, 'MUST FAIL: the photo is listed' );
	assert.deepEqual( [ m[ 0 ].tag, m[ 0 ].src.replace( /^.*\//, '' ), m[ 0 ].alt, m[ 0 ].own ], [ 'img', 'card.png', '', true ] );
	assert.equal( media( '1:', 375 ).length, 1, 'at every width it shows' );
	// What Fill writes from it: the media block's Source holds the attachment of the picture, decorative.
	const reads = Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, media( '1:', w ) ] ) );
	const out = mediaWrites( { slots: blockMediaSlots( 'sgs/media' ), reads, resolve: () => ( { hit: { id: 9, url: 'https://x.test/card.png' } } ) } );
	assert.ok( out.writes.some( ( w ) => JSON.stringify( w.value ).includes( '"id":9' ) ), 'the attachment is written into the Source' );
} );

test( 'negative control: a gradient, two layers, words, a child element and a held image are no background picture of the element', () => {
	assert.deepEqual( media( '2:' ), [], 'a gradient' );
	assert.deepEqual( media( '3:' ), [], 'two layers' );
	assert.deepEqual( media( '4:' ), [], 'an element holding words' );
	assert.deepEqual( media( '5:' ), [], 'an element holding a child element' );
	assert.deepEqual( media( '6:' ).map( ( m ) => [ m.tag, m.alt ] ), [ [ 'img', 'Box' ] ], 'the held image is the media, not the background' );
	assert.deepEqual( media( '7:' ).map( ( m ) => [ m.tag, m.alt ] ), [ [ 'img', 'Self' ] ], 'an image painting a background is its own image' );
	assert.ok( ! media( '7:' )[ 0 ].element.ownBackground && ! media( '6:' )[ 0 ].element.ownBackground, 'an <img> is no CSS background' );
} );

test( 'MUST FAIL: the picture a wordless element paints as its own background is marked as its own background', () => {
	assert.equal( media( '1:' )[ 0 ].element.ownBackground, true );
	assert.equal( media( '1:', 375 )[ 0 ].element.ownBackground, true );
} );
