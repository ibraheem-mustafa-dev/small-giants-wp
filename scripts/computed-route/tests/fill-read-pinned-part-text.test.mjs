// A node's text look is never read from another read element pinned out of flow inside its element (lib/fill-read-collect.mjs::
// collectMany adds each one positioned absolute or fixed to `textOthers`): on a phone the bag button hides its label, so its first visible text was the white count pinned on its corner, and Fill wrote the whole trigger white below
// 768px (the icon drawn in currentColor vanished on the paper header; the Eye Care header, 2026-11-21). MUST FAIL on the
// read before it. Negative controls: a part in flow still gives the element its look, a pinned part reads its own colour,
// and a pinned element no job reads is not skipped. Served local draft, no site. Mutation list:
// tests/fill-read-pinned-part-text.mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const COUNT = 'display:inline-flex;min-width:20px;height:20px;border-radius:999px;background:rgb(156, 139, 120);color:rgb(255, 255, 255);font-size:11px';
const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><main style="color:rgb(0, 0, 0)">
<button class="bag" style="position:relative;border:1px solid rgb(20, 20, 20);font-size:12.5px"><span style="display:none">Bag</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 8h14l-1 12H6z"></path></svg><span class="count" style="position:absolute;top:-6px;right:-6px;${ COUNT }">0</span></button>
<button class="flow" style="position:relative;color:rgb(0, 0, 0)"><span style="display:none">Bag</span><span class="count" style="${ COUNT }">0</span></button>
<button class="stray" style="position:relative;color:rgb(0, 0, 0)"><span class="tag" style="position:absolute;top:0;right:0;color:rgb(255, 255, 255)">New</span></button>
</main></body></html>`;
const BADGE = '.sgs-cart__trigger > .sgs-cart__badge';
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/cart', draftRef: '.bag', draftSlots: { [ BADGE ]: '.bag .count' }, attributes: {} },
	{ name: 'sgs/cart', draftRef: '.flow', draftSlots: { [ BADGE ]: '.flow .count' }, attributes: {} },
	{ name: 'sgs/button', draftRef: '.stray', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-pinned-part-text-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const style = ( id, p ) => read.widths[ 1440 ][ id ].styles[ p ];
const idOf = ( owner, slot ) => `${ owner }:${ slot }`;

test( 'MUST FAIL: an element whose label is hidden reads its own colour and size, not the pinned count\'s', () => {
	assert.equal( style( idOf( 1, '' ), 'color' ), 'rgb(0, 0, 0)', 'MUST FAIL: the pinned count\'s white' );
	assert.equal( style( idOf( 1, '' ), 'font-size' ), '12.5px', 'MUST FAIL: the pinned count\'s 11px' );
} );

test( 'negative controls: the pinned part reads its own look, an in-flow part still gives the look, another pinned element is not this rule\'s', () => {
	assert.equal( style( idOf( 1, BADGE ), 'color' ), 'rgb(255, 255, 255)' );
	assert.equal( style( idOf( 2, '' ), 'color' ), 'rgb(255, 255, 255)', 'an in-flow part is the element\'s first text' );
	assert.equal( style( idOf( 3, '' ), 'color' ), 'rgb(255, 255, 255)', 'a pinned element no job reads is still its text' );
} );
