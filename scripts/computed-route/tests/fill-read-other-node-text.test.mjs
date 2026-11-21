// A node's text look is never read from text inside another node's element (lib/fill-read-collect.mjs::collectMany passes the
// other nodes' root finders to the walker's collectPair as `textOthers`): a menu block whose draft element is a group holding a
// phone link another node draws read the phone's 12.5px, unset case and brown as its own and wrote them on the whole menu
// (the Eye Care header's right half, 2026-11-21). MUST FAIL on the read before it. Negative controls: a node's own descendant
// text still gives its look, and a node whose only words sit in another node reads its own colour. Served local draft, no
// site. Mutation list: tests/fill-read-other-node-text.mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>a { color: inherit; }</style></head><body><main style="color:rgb(20, 20, 20)">
<div class="right" style="font-size:13.5px;text-transform:uppercase">
	<a class="phone" href="#" style="font-size:12.5px;text-transform:none;color:rgb(74, 69, 62)">0121 729 8233</a>
	<a class="about" href="#">About us</a>
</div>
<div class="own" style="font-size:16px"><span style="font-size:20px;color:rgb(156, 139, 120)">Label</span></div>
<div class="only-other" style="color:rgb(1, 2, 3)"><a class="inner" href="#" style="color:rgb(250, 248, 245)">Inner</a></div>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/button', draftRef: '.phone', attributes: {} },
	{ name: 'sgs/nav-bar-menu', draftRef: '.right', attributes: {} },
	{ name: 'sgs/text', draftRef: '.own', draftSlots: { '.sgs-text__label': '.own span' }, attributes: {} },
	{ name: 'sgs/button', draftRef: '.inner', attributes: {} },
	{ name: 'sgs/container', draftRef: '.only-other', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-other-node-text-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const style = ( id, p ) => read.widths[ 1440 ][ id ].styles[ p ];

test( 'MUST FAIL: a group read as one node takes its text look from its own words, not from another node\'s link inside it, and its own colour when it has none', () => {
	assert.equal( style( '2:', 'font-size' ), '13.5px', 'MUST FAIL: the phone node\'s 12.5px' );
	assert.equal( style( '2:', 'text-transform' ), 'uppercase', 'MUST FAIL: the phone node\'s none' );
	assert.equal( style( '2:', 'color' ), 'rgb(20, 20, 20)', 'MUST FAIL: the phone node\'s brown' );
	assert.equal( style( '5:', 'color' ), 'rgb(1, 2, 3)', 'MUST FAIL: a group whose only words are another node\'s takes that node\'s paper colour' );
} );

test( 'negative controls: a node\'s own descendant text gives its look, and the inner nodes read their own links', () => {
	assert.equal( style( '3:', 'font-size' ), '20px' );
	assert.equal( style( '3:', 'color' ), 'rgb(156, 139, 120)' );
	assert.equal( style( '1:', 'font-size' ), '12.5px', 'the phone node itself still reads its own link' );
	assert.equal( style( '4:', 'color' ), 'rgb(250, 248, 245)' );
} );
