// What a visitor can see of a read element (lib/fill-read-collect.mjs::collectMany `view`), as the visible-card count reads it
// (lib/fill-visible-count.mjs::visibleCount): every clipping ancestor narrows the span, not only the nearest (a wide scroller
// inside a narrower clipped section), paint containment and a clip-path clip as overflow does, and an ancestor's opacity
// multiplies into the element's own (a fade slider's resting slide wrapped at opacity 0). Runs one Chromium on a served draft.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { visibleCount } from '../lib/fill-visible-count.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 }
.outer { width: 500px; overflow: hidden }
.mid { width: 1200px; overflow: hidden }
.track { display: flex; width: 1000px }
.card { flex: 0 0 300px; height: 100px; background: #ddd }
.boxed { width: 640px; contain: paint }
.shaped { width: 640px; clip-path: inset(0) }
.wide { display: flex; width: 1000px }
.ghost { opacity: 0 }
</style></head><body>
<section class="outer"><div class="mid"><div class="track t1"><div class="card a1"></div><div class="card a2"></div><div class="card a3"></div></div></div></section>
<div class="boxed"><div class="wide t2"><div class="card b1"></div><div class="card b2"></div><div class="card b3"></div></div></div>
<div class="shaped"><div class="wide t3"><div class="card c1"></div><div class="card c2"></div><div class="card c3"></div></div></div>
<div class="wide t4"><div class="card d1"></div><div class="ghost"><div class="card d2"></div></div><div class="card d3"></div></div>
</body></html>`;

const slider = ( t, cards ) => ( { name: 'sgs/container', draftRef: t, attributes: {}, innerBlocks: cards.map( ( c ) => ( { name: 'sgs/container', draftRef: c, attributes: {} } ) ) } );
const TREE = [
	slider( '.t1', [ '.a1', '.a2', '.a3' ] ), slider( '.t2', [ '.b1', '.b2', '.b3' ] ),
	slider( '.t3', [ '.c1', '.c2', '.c3' ] ), slider( '.t4', [ '.d1', '.d2', '.d3' ] ),
];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-view-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );

// The track at node index i and its three cards (indexes i+1 .. i+3) at 1440.
const count = ( i ) => visibleCount( read.widths[ 1440 ][ `${ i }:` ], [ 1, 2, 3 ].map( ( k ) => read.widths[ 1440 ][ `${ i + k }:` ] ) );

test( 'MUST FAIL: a narrower clipped section above the nearest clipping ancestor still cuts the track', () => {
	assert.deepEqual( read.widths[ 1440 ][ '0:' ].view.clip, { x: 0, w: 500 } );
	assert.equal( count( 0 ), 1 );
} );

test( 'MUST FAIL: paint containment and a clip-path clip like overflow', () => {
	assert.equal( count( 4 ), 2, 'contain: paint, 640px wide' );
	assert.equal( count( 8 ), 2, 'clip-path, 640px wide' );
} );

test( 'MUST FAIL: an ancestor at opacity 0 hides the card inside it; a page with no clip leaves the view open', () => {
	assert.equal( read.widths[ 1440 ][ '14:' ].view.opacity, 0 );
	assert.equal( count( 12 ), 2 );
	assert.equal( read.widths[ 1440 ][ '12:' ].view.clip, null, 'negative control: nothing clips the plain track' );
	assert.equal( read.widths[ 1440 ][ '12:' ].view.page, 1440 );
} );
