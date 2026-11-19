// The page read's media list (lib/fill-read-collect.mjs, snap.media): an icon inside a link or button the element holds is that
// control's glyph, never the element's picture, and a picture a custom element draws in its shadow root (an <image-slot> photo)
// outranks an inline svg beside it. On Indus's Home the hero section held its call-to-action's 15px arrow and an <image-slot>
// photo, and the arrow became the hero's split media (2026-11-19). An empty placeholder leaves no media at all.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { emptyPictureRows } from '../lib/fill-report.mjs';

const PIC = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 30 20%27%3E%3Crect width=%2730%27 height=%2720%27 fill=%27red%27/%3E%3C/svg%3E';
const ARROW = '<svg width="15" height="15" viewBox="0 0 16 16"><line x1="3" y1="8" x2="12" y2="8" stroke="black"/></svg>';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0 } pic-slot { display: block; width: 300px; height: 200px } img { display: block } svg.big { width: 80px; height: 80px }
</style><script>
customElements.define( 'pic-slot', class extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow( { mode: 'open' } );
		root.innerHTML = '<div class="frame"><img part="image" alt=""></div>';
		const src = this.getAttribute( 'src' );
		src && root.querySelector( 'img' ).setAttribute( 'src', src );
	}
} );
</script></head><body><main>
<section class="hero"><h1>Leading</h1><a href="#x">Apply ${ ARROW }</a><div class="media"><pic-slot src="${ PIC }"></pic-slot></div></section>
<section class="empty"><h2>Brands</h2><a href="#y">More ${ ARROW }</a><pic-slot id="brand-1" placeholder="Partner brand"></pic-slot></section>
<section class="icon"><h2>Why</h2><svg class="big" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg></section>
<a class="cta" href="#z">Go ${ ARROW }</a>
<section class="deco"><h2>Partners</h2><svg class="big" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg><pic-slot src="${ PIC }"></pic-slot></section>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/hero', draftRef: '.hero', attributes: {} },
	{ name: 'sgs/container', draftRef: '.empty', attributes: {} },
	{ name: 'sgs/container', draftRef: '.icon', attributes: {} },
	{ name: 'sgs/button', draftRef: '.cta', attributes: {} },
	{ name: 'sgs/container', draftRef: '.deco', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-control-glyph-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const media = ( id ) => ( read.widths[ 1440 ][ id ].media || [] ).map( ( m ) => `${ m.tag }:${ m.src || ( m.markup ? 'markup' : '' ) }` );

test( 'MUST FAIL: a section holding a call-to-action arrow and an image placeholder photo has the photo as its media, not the arrow', () => {
	assert.deepEqual( media( '1:' ), [ `img:${ PIC }` ] );
} );

test( 'MUST FAIL: a decorative svg beside an image placeholder photo leaves the photo as the media', () => {
	assert.deepEqual( media( '5:' ), [ `img:${ PIC }` ] );
} );

test( 'MUST FAIL: a section whose only svg is a link\'s glyph and whose placeholder is empty has no media', () => {
	assert.deepEqual( media( '2:' ), [] );
} );

test( 'negative control: a section\'s own lone svg is its media, and a link\'s own arrow is the link\'s media', () => {
	assert.deepEqual( media( '3:' ), [ 'svg:markup' ] );
	assert.deepEqual( media( '4:' ), [ 'svg:markup' ] );
} );

test( 'MUST FAIL: an empty image placeholder is read with its id and label, and listed once on the deepest node that holds it', () => {
	assert.deepEqual( read.widths[ 1440 ][ '2:' ].emptyPictures, [ { id: 'brand-1', placeholder: 'Partner brand' } ] );
	const nodes = skeletonNodes( TREE );
	const flat = nodes.map( ( n ) => ( { ref: `n${ n.index }` } ) );
	assert.deepEqual( emptyPictureRows( { reads: read, nodes, flat, refOf: ( f ) => f.ref } ), [ { node: 'n2', block: 'sgs/container', id: 'brand-1', placeholder: 'Partner brand' } ] );
} );

test( 'negative control: a placeholder showing its photo is no empty picture', () => {
	assert.deepEqual( read.widths[ 1440 ][ '1:' ].emptyPictures, [] );
} );

test( 'MUST FAIL: Fill lists the empty placeholders in its report', () => {
	const src = fs.readFileSync( new URL( '../fill.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /result\.emptyPictures = emptyPictureRows\( \{ reads, nodes, flat, refOf \} \);/ );
} );
