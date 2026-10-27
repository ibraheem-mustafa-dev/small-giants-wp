// The page read's image (lib/fill-read-collect.mjs, snap.img): a custom element that draws its picture in its open shadow
// root (an image placeholder element keeping a second copy of the picture for its editing chrome) is that one image; an
// empty placeholder, two different pictures and a light-DOM wrapper of two images are no single image.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const PIC = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 30 20%27%3E%3Crect width=%2730%27 height=%2720%27 fill=%27red%27/%3E%3C/svg%3E';
const OTHER = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27%3E%3Crect width=%2720%27 height=%2720%27 fill=%27blue%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0 } pic-slot { display: block; width: 300px; height: 200px } img { display: block }
</style><script>
customElements.define( 'pic-slot', class extends HTMLElement {
	connectedCallback() {
		const root = this.attachShadow( { mode: 'open' } );
		const src = this.getAttribute( 'src' );
		const second = this.getAttribute( 'second' ) || src;
		root.innerHTML = '<div class="frame"><img part="image" alt=""></div><div class="chrome" hidden><img class="ghost" alt=""></div>';
		if ( src ) {
			root.querySelector( '.frame img' ).setAttribute( 'src', src );
			root.querySelector( '.ghost' ).setAttribute( 'src', second );
		}
	}
} );
</script></head><body><main>
<pic-slot class="filled" src="${ PIC }"></pic-slot>
<pic-slot class="empty"></pic-slot>
<pic-slot class="two" src="${ PIC }" second="${ OTHER }"></pic-slot>
<div class="wrap"><pic-slot src="${ PIC }"></pic-slot></div>
<div class="light"><img alt="a" src="${ PIC }"><img alt="b" src="${ PIC }"></div>
<figure class="fig"><img alt="Loaf" src="${ PIC }"><figcaption>Fresh</figcaption></figure>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/media', draftRef: '.filled', attributes: {} },
	{ name: 'sgs/media', draftRef: '.empty', attributes: {} },
	{ name: 'sgs/media', draftRef: '.two', attributes: {} },
	{ name: 'sgs/container', draftRef: '.wrap', attributes: {} },
	{ name: 'sgs/container', draftRef: '.light', attributes: {} },
	{ name: 'sgs/media', draftRef: '.fig', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-shadow-image-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const img = ( id ) => read.widths[ 1440 ][ id ].img;

test( 'MUST FAIL: a custom element drawing its picture in its open shadow root is that one image, its two copies one picture', () => {
	assert.deepEqual( img( '1:' ), { tag: 'pic-slot', src: PIC, alt: '', caption: null } );
} );

test( 'MUST FAIL: a wrapper holding such an element holds its image', () => {
	assert.equal( img( '4:' )?.src, PIC );
} );

test( 'an empty placeholder and a placeholder showing two different pictures are no single image', () => {
	assert.equal( img( '2:' ), null );
	assert.equal( img( '3:' ), null );
} );

test( 'negative control: two light-DOM images are still two, and a figure keeps its one image and caption', () => {
	assert.equal( img( '5:' ), null );
	assert.deepEqual( img( '6:' ), { tag: 'figure', src: PIC, alt: 'Loaf', caption: 'Fresh' } );
} );
