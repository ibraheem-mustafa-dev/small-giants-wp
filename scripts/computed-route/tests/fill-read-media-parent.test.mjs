// The sizing a node's own picture reads (lib/fill-media.mjs::withSizing) needs the facts of the DOM parent the picture really sits in: its
// display, its align-items and whether its height is declared as a length. The read takes them from the element's own parent
// (lib/fill-read-collect.mjs, the media entry's `parent`), not from the skeleton parent's root target, which is often a wrapper further up
// (the draft's wrappers dissolve) or has no draft element at all. Real browser over a planted draft.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const IMG = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 120 40%27%3E%3Crect width=%27120%27 height=%2740%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } img { display: block }
.grid { display: grid }
.tall { display: flex; align-items: center; height: 200px }
.pct { display: block; height: 50% }
.rule { display: flex; align-items: flex-start }
@media (min-width: 1000px) { .rule { height: 300px } }
</style></head><body>
<section class="grid"><div class="tall"><img class="a" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="pct"><img class="b" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="rule"><img class="c" alt="" src="${ IMG }"></div></section>
<section class="grid"><div style="height: 120px"><img class="d" alt="" src="${ IMG }"></div></section>
</body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'body', attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: 'section:nth-of-type(1)', attributes: {}, innerBlocks: [ { name: 'sgs/media', draftRef: 'img.a', attributes: {} } ] },
	{ name: 'sgs/container', draftRef: 'section:nth-of-type(2)', attributes: {}, innerBlocks: [ { name: 'sgs/media', draftRef: 'img.b', attributes: {} } ] },
	{ name: 'sgs/container', draftRef: 'section:nth-of-type(3)', attributes: {}, innerBlocks: [ { name: 'sgs/media', draftRef: 'img.c', attributes: {} } ] },
	{ name: 'sgs/container', draftRef: 'section:nth-of-type(4)', attributes: {}, innerBlocks: [ { name: 'sgs/media', draftRef: 'img.d', attributes: {} } ] },
] } ];

let served;
let read;
let nodes;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-media-parent-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	nodes = skeletonNodes( TREE );
	read = await readDraft( { url: served.url, nodes, headless: true, sweep: false } );
} );
after( () => served?.close() );
const parentOf = ( cls, w = 1440 ) => {
	const node = nodes.find( ( n ) => n.node.draftRef === `img.${ cls }` );
	return read.widths[ w ][ node.targets.find( ( t ) => '' === t.slot ).id ].media[ 0 ].parent;
};

test( 'MUST FAIL: a picture reads the display, alignment and declared height of the element it sits in, not of the section above it', () => {
	assert.deepEqual( parentOf( 'a' ), { display: 'flex', alignItems: 'center', definiteHeight: true } );
	assert.equal( parentOf( 'b' ).definiteHeight, false, 'a percentage height is no definite height' );
	assert.equal( parentOf( 'b' ).display, 'block' );
	assert.equal( parentOf( 'd' ).definiteHeight, true, 'an inline style height counts' );
} );

test( 'MUST FAIL: a height a media query declares counts at the widths where the query holds', () => {
	assert.equal( parentOf( 'c', 1440 ).definiteHeight, true );
	assert.equal( parentOf( 'c', 375 ).definiteHeight, false );
	assert.equal( parentOf( 'c', 375 ).alignItems, 'flex-start' );
} );
