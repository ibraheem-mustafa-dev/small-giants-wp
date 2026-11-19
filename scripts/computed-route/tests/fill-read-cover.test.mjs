// A picture laid behind an element's content through a covering absolute wrapper (a hero's parallax wrapper, sized past the hero, around the
// photo) is read with that wrapper's placement (lib/fill-read-collect.mjs, the page read's media list), so the media writer places it at the
// block's Background slot (lib/media/absorb.mjs::placement) and a hero draws it as its background picture. Before this the picture read as a
// static image inside a wrapper and went to the split media slot (Eye Care Home's hero, 2026-11-19 run). Real browser over a planted draft.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { placement } from '../lib/media/absorb.mjs';
import { mediaDecisions } from '../lib/fill-media.mjs';
import { blockMediaSlots } from '../lib/media/slots.mjs';

const IMG = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 120 40%27%3E%3Crect width=%27120%27 height=%2740%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } img { display: block }
.hero { position: relative; height: 400px; overflow: hidden }
.wrap { position: absolute; inset: -9% 0 }
.wrap img { width: 100%; height: 100%; object-fit: cover }
.content { position: absolute; left: 0; right: 0; bottom: 0 }
.split { display: flex; height: 400px }
.split .col { width: 50% }
.split .pic { width: 50% }
.capt { position: absolute; inset: 0 }
.flow { position: relative; height: 200px }
.full { height: 200px }
</style></head><body>
<section class="hero"><div class="wrap"><img alt="" src="${ IMG }"></div><div class="content"><h1>Shades</h1><p>Words over the photo</p></div></section>
<section class="split"><div class="col"><h1>Split</h1><p>Words beside the photo</p></div><div class="pic"><img alt="" src="${ IMG }"></div></section>
<section class="hero"><div class="wrap capt"><img alt="" src="${ IMG }"><p>A caption inside the wrapper</p></div><div class="content"><p>More words</p></div></section>
<section class="flow"><div class="full"><img alt="" src="${ IMG }"></div><div class="content"><p>Words</p></div></section>
</body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'body', attributes: {}, innerBlocks: [
	{ name: 'sgs/hero', draftRef: 'section.hero:nth-of-type(1)', attributes: {} },
	{ name: 'sgs/hero', draftRef: 'section.split', attributes: {} },
	{ name: 'sgs/hero', draftRef: 'section:nth-of-type(3)', attributes: {} },
	{ name: 'sgs/hero', draftRef: 'section.flow', attributes: {} },
] } ];

let served;
let read;
let nodes;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-cover-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	nodes = skeletonNodes( TREE );
	read = await readDraft( { url: served.url, nodes, headless: true, sweep: false } );
} );
after( () => served?.close() );
const mediaOf = ( i ) => read.widths[ 1440 ][ nodes[ i ].targets.find( ( t ) => '' === t.slot ).id ].media || [];

test( 'MUST FAIL: a picture under a covering absolute wrapper reads as laid behind the content, and goes to the Background slot', () => {
	const [ m ] = mediaOf( 1 );
	assert.equal( placement( m.element ), 'background', JSON.stringify( m.element ) );
	const slots = blockMediaSlots( 'sgs/hero' );
	const map = { sites: { x: { files: [ { asset: 'a.png', id: 5, url: 'http://x/a.png' } ] } } };
	const r = mediaDecisions( { slots, reads: { 1440: [ { ...m, src: 'a.png' } ], 768: [], 375: [] }, media: { map, site: 'x', origin: '' } } );
	assert.ok( r.writes.some( ( w ) => 'backgroundSource' === w.attr ), JSON.stringify( r ) );
	assert.ok( ! r.writes.some( ( w ) => 'splitSource' === w.attr ) );
} );

// Negative controls: a picture in a column, and one under a wrapper that holds words, keep their own placement.
test( 'a picture in a column beside the content is plain media, and a covering wrapper with words of its own is not a backdrop', () => {
	assert.equal( placement( mediaOf( 2 )[ 0 ].element ), 'media', 'the split section\'s picture' );
	assert.equal( placement( mediaOf( 3 )[ 0 ].element ), 'media', 'a wrapper holding a caption is content' );
	assert.equal( placement( mediaOf( 4 )[ 0 ].element ), 'media', 'an in-flow wrapper as large as the element is no layer behind it' );
} );
