// The page read's media signal (lib/fill-read.mjs, snap.intrinsic): an element is media only when it IS an img or svg,
// or a wrapper whose only rendered content is that one image and whose box the image fills. A button or card holding one
// icon is not media, so it is never given a maximum height from its rendered height.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const PNG = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 120 40%27%3E%3Crect width=%27120%27 height=%2740%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } main { padding: 8px } img { display: block }
.btn { width: 44px; height: 44px; padding: 10px; border: 0; box-sizing: border-box }
.logo { display: inline-block; line-height: 0 }
.card { width: 200px }
.words, .extra { display: inline-block; position: relative; font-size: 0; line-height: 0 }
.extra span { position: absolute; left: 0; top: 0; width: 5px; height: 5px }
</style></head><body><main>
<button class="btn"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0z"/></svg></button>
<a class="logo" href="/"><img alt="" src="${ PNG }" width="120" height="40"></a>
<img class="direct" alt="" src="${ PNG }" width="60" height="30">
<div class="card"><img alt="" src="${ PNG }" width="60" height="30"><p>Words beside the image</p></div>
<div class="words"><img alt="" src="${ PNG }" width="60" height="30">hidden words</div>
<div class="extra"><img alt="" src="${ PNG }" width="60" height="30"><span></span></div>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: '.btn', attributes: {} },
	{ name: 'sgs/container', draftRef: '.logo', attributes: {} },
	{ name: 'sgs/container', draftRef: 'img.direct', attributes: {} },
	{ name: 'sgs/container', draftRef: '.card', attributes: {} },
	{ name: 'sgs/container', draftRef: '.words', attributes: {} },
	{ name: 'sgs/container', draftRef: '.extra', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-media-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const intrinsic = ( id ) => read.widths[ 1440 ][ id ].intrinsic;

test( 'MUST FAIL: a square button holding one 1:1 icon is not media (no intrinsic ratio)', () => {
	assert.equal( intrinsic( '1:' ), null );
} );

test( 'MUST FAIL: a link holding only the image it is filled by is media; an img is media; a card with words beside the image is not', () => {
	assert.equal( intrinsic( '2:' )?.tag, 'img' );
	assert.ok( Math.abs( intrinsic( '2:' ).ratio - 3 ) < 0.01 );
	assert.ok( Math.abs( intrinsic( '3:' ).ratio - 3 ) < 0.01, 'the image\'s natural ratio' );
	assert.equal( intrinsic( '4:' ), null );
	assert.equal( intrinsic( '5:' ), null, 'a wrapper that holds words as well as the image' );
	assert.equal( intrinsic( '6:' ), null, 'a wrapper that holds another element as well as the image' );
} );
