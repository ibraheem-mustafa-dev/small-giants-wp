// A look a draft's script holds only until an element scrolls into view is an entrance, never the element's resting paint
// (2026-11-19, Eye Care Home: the draft's `reveals()` sets `opacity: 0` and a 26px translate on every `[data-reveal]` section
// until an IntersectionObserver fires, Fill's read never scrolled, and 26 sections were written as `& { opacity: 0; }`).
// The page read (lib/fill-read.mjs::readDraft) scrolls the draft through its length before it reads, so a scroll reveal has run.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

// The draft's own reveal, as its script writes it: pending sections are held at opacity 0 and a translate, an observer shows
// each as it enters the screen and removes the inline look when the entrance ends.
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0 } section { height: 700px; margin: 0 0 300px; background: #eee } .faded { opacity: .5 } .gone { opacity: 0 }
</style></head><body><main>
<section class="first" data-reveal><h2>First</h2></section>
<section class="second" data-reveal><h2>Second</h2></section>
<section class="faded"><h2>Faded</h2></section>
<section class="gone"><h2>Gone</h2></section>
<section class="last" data-reveal><h2>Last</h2></section>
</main><script>
const show = ( el ) => {
	if ( 'shown' === el.getAttribute( 'data-rv' ) ) { return; }
	el.setAttribute( 'data-rv', 'shown' );
	const start = Date.now();
	const step = () => {
		const p = Math.min( 1, ( Date.now() - start ) / 200 );
		if ( p >= 1 ) { el.style.removeProperty( 'opacity' ); el.style.removeProperty( 'transform' ); return; }
		el.style.opacity = String( p );
		el.style.transform = 'translateY(' + ( 26 * ( 1 - p ) ).toFixed( 2 ) + 'px)';
		setTimeout( step, 16 );
	};
	step();
};
const io = new IntersectionObserver( ( entries ) => entries.forEach( ( en ) => { if ( en.isIntersecting ) { show( en.target ); io.unobserve( en.target ); } } ), { rootMargin: '0px 0px -6% 0px', threshold: 0.01 } );
document.querySelectorAll( '[data-reveal]' ).forEach( ( el ) => { el.setAttribute( 'data-rv', 'pending' ); el.style.opacity = '0'; el.style.transform = 'translateY(26px)'; io.observe( el ); } );
</script></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: '.first', attributes: {} },
	{ name: 'sgs/container', draftRef: '.second', attributes: {} },
	{ name: 'sgs/container', draftRef: '.faded', attributes: {} },
	{ name: 'sgs/container', draftRef: '.gone', attributes: {} },
	{ name: 'sgs/container', draftRef: '.last', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-scroll-reveal-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const style = ( id, prop, width = 1440 ) => read.widths[ width ][ id ].styles[ prop ];

test( 'MUST FAIL: a section below the first screen is read as revealed (opacity 1, no translate), at 1440 and at 375', () => {
	for ( const width of [ 1440, 375 ] ) {
		for ( const id of [ '1:', '2:', '5:' ] ) {
			assert.equal( style( id, 'opacity', width ), '1', `${ id } opacity at ${ width }` );
			assert.ok( [ 'none', 'matrix(1, 0, 0, 1, 0, 0)' ].includes( style( id, 'transform', width ) ), `${ id } transform at ${ width }: ${ style( id, 'transform', width ) }` );
		}
	}
} );

test( 'negative control: a section the draft paints at opacity .5, and one it paints at opacity 0, are read as written', () => {
	assert.equal( style( '3:', 'opacity' ), '0.5' );
	assert.equal( style( '4:', 'opacity' ), '0' );
} );

test( 'the page read opens the draft through lib/scroll-reveals.mjs::fireScrollReveals', () => {
	const src = fs.readFileSync( new URL( '../lib/fill-read.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /await fireScrollReveals\( page \);/ );
} );
