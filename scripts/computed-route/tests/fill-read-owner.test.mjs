// A layout read never descends into an element another node owns (lib/fill-read.mjs::collectMany stamps every target's
// element with its node; parity/lib/paint.mjs::layoutElement stops there). Real case: the Indus header's tablet "Register"
// wrapper (`display:flex; align-items:center; gap:10px`) holds only the burger button at 375px, and the layout read walked
// from the wrapper down its single child into the burger and returned the burger's `gap:4px; flex-direction:column;
// align-items:flex-end; justify-content:center` for the wrapper.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { layoutElement } from '../../parity/lib/paint.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 }
.wrap { display: flex; align-items: center; gap: 10px }
.reg { display: none }
@media (min-width: 768px) { .reg { display: inline-flex; width: 200px; height: 40px } }
.bur { width: 48px; height: 48px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 4px }
.bur span { display: block; width: 18px; height: 2px; background: #000 }
.band { display: block }
.band .row { display: flex; gap: 7px }
</style></head><body>
<div class="wrap"><a class="reg" href="/apply/">Register</a><button class="bur"><span></span><span></span><span></span></button></div>
<div class="band"><div class="row"><i>a</i><i>b</i></div></div>
</body></html>`;

const TREE = [
	{ name: 'sgs/container', draftRef: '.wrap', attributes: {} },
	{ name: 'sgs/nav-bar-menu', draftRef: '.bur', attributes: {} },
	{ name: 'sgs/container', draftRef: '.band', attributes: {} },
];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-owner-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );

test( 'MUST FAIL: a wrapper holding only another node\'s element keeps its own layout, not that element\'s', () => {
	const s = read.widths[ 375 ][ '0:' ].styles;
	assert.equal( s[ 'column-gap' ], '10px' );
	assert.equal( s[ 'flex-direction' ], 'row' );
	assert.equal( s[ 'align-items' ], 'center' );
	assert.equal( read.widths[ 375 ][ '1:' ].styles[ 'column-gap' ], '4px', 'the burger still reads its own layout' );
} );

test( 'a wrapper holding one inner band that no other node owns still reads the band\'s layout', () => {
	assert.equal( read.widths[ 375 ][ '2:' ].styles[ 'column-gap' ], '7px' );
} );

test( 'layoutElement stops at a child another node owns and descends through an unowned or same-owner one', () => {
	const box = ( display, kids = [], owner = null ) => ( { display, children: kids, getClientRects: () => [ 1 ], getAttribute: () => owner } );
	const styleOf = ( e ) => ( { display: e.display } );
	const inner = box( 'flex', [ box( 'block' ), box( 'block' ) ], '1' );
	const wrapper = box( 'flex', [ inner ], '0' );
	assert.equal( layoutElement( wrapper, styleOf ), wrapper, 'a different owner is not the wrapper\'s band' );
	const same = box( 'flex', [ box( 'block' ), box( 'block' ) ], '0' );
	assert.equal( layoutElement( box( 'block', [ same ], '0' ), styleOf ), same, 'the same node\'s band is the wrapper\'s' );
	const free = box( 'flex', [ box( 'block' ), box( 'block' ) ] );
	assert.equal( layoutElement( box( 'block', [ free ], '0' ), styleOf ), free, 'an element no target owns is descended' );
} );
