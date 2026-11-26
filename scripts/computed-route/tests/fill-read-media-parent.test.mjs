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
const SVG_IMG = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 120 40%27%3E%3Crect width=%27120%27 height=%2740%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } img { display: block }
.grid { display: block }
.tall { display: flex; align-items: center; height: 200px }
.pct { display: block; height: 50% }
.rule { display: flex; align-items: flex-start }
@media (min-width: 1000px) { .rule { height: 300px } }
.calc { height: calc(100px + 20px) }
.min { height: min(40vh, 400px) }
.imp { height: 150px !important }
div.imp { height: auto }
.row { display: grid; grid-template-rows: 180px }
.row > div { display: block }
</style></head><body>
<section class="grid"><div class="tall"><img class="a" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="pct"><img class="b" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="rule"><img class="c" alt="" src="${ IMG }"></div></section>
<section class="grid"><div style="height: 120px"><img class="d" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="calc"><img class="e" alt="" src="${ IMG }"></div></section>
<section class="grid"><div style="height: 200px"><picture><img class="f" width="120" height="40" alt="" src="${ IMG }"></picture></div></section>
<section class="grid"><div class="tall"><div style="display: contents"><img class="g" alt="" src="${ IMG }"></div></div></section>
<section class="grid"><div class="imp"><img class="h" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="min"><img class="i" alt="" src="${ IMG }"></div></section>
<section class="grid"><div class="row"><div><img class="j" alt="" src="${ IMG }"></div></div></section>
<section class="grid"><div><img class="k" alt="" src="${ SVG_IMG }"></div></section>
<section class="grid"><div><svg class="l" viewBox="0 0 120 40"><rect width="120" height="40" fill="red"/></svg></div></section>
</body></html>`;
const KEYS = 'abcdefghijkl'.split( '' );
const TREE = [ { name: 'sgs/container', draftRef: 'body', attributes: {}, innerBlocks: KEYS.map( ( k, i ) => ( { name: 'sgs/container', draftRef: `section:nth-of-type(${ i + 1 })`, attributes: {}, innerBlocks: [ { name: 'sgs/media', draftRef: 'l' === k ? 'svg.l' : `img.${ k }`, attributes: {} } ] } ) ) } ];

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
const entry = ( cls, w = 1440 ) => {
	const node = nodes.find( ( n ) => [ `img.${ cls }`, `svg.${ cls }` ].includes( n.node.draftRef ) );
	return read.widths[ w ][ node.targets.find( ( t ) => '' === t.slot ).id ].media[ 0 ];
};
const parentOf = ( cls, w = 1440 ) => entry( cls, w ).parent;

test( 'MUST FAIL: a picture reads the display, alignment and definite height of the element it sits in, not of the section above it', () => {
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

test( 'MUST FAIL: a definite height the browser resolves counts however it was declared (calc, min with vh, !important beaten by a later rule, a grid track)', () => {
	for ( const cls of [ 'e', 'i', 'h', 'j' ] ) {
		assert.equal( parentOf( cls ).definiteHeight, true, `.${ cls }` );
	}
} );

test( 'MUST FAIL: a picture inside a <picture> or a display: contents wrapper reads the box around them', () => {
	assert.deepEqual( parentOf( 'f' ), { display: 'block', alignItems: 'normal', definiteHeight: true }, 'the inline <picture> draws no box: the div around it is the parent' );
	assert.deepEqual( parentOf( 'g' ), { display: 'flex', alignItems: 'center', definiteHeight: true } );
} );

test( 'MUST FAIL: an svg with only a viewBox has no natural size (an svg image or an inline svg claims no room)', () => {
	assert.equal( entry( 'k' ).natural, null, 'an svg file drawn by an img' );
	assert.equal( entry( 'l' ).natural, null, 'an inline svg' );
	assert.equal( entry( 'a' ).natural, null, 'the planted picture is itself a viewBox-only svg' );
} );
