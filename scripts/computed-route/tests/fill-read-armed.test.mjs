// The draft is read AT REST, never at the before-reveal state of a scroll entrance (Spec 48 R-47-4, R-47-5;
// lib/fill-read.mjs::openPage plays every armed entrance through the walker's triggerArmed before any value is read).
// Proven 2026-11-01: Eye Care's home sections carry `data-sgs-me="scroll translate opacity"`, were read at opacity 0 and
// translateY(26px), and lib/fill-custom-css.mjs::customCssWrites wrote that as a resting rule.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

// `.rise` is armed: created paused at its start pose (opacity 0, 26px down) far below the fold and played by an
// IntersectionObserver once it nears the viewport, as animation-observer.js does. `.still` has a static opacity .5.
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } .gap { height: 2400px } .rise { margin: 0 } .still { margin: 0; opacity: .5 }
</style></head><body><div class="gap"></div><p class="rise" data-sgs-animation="fade-up">Hi</p><p class="still">Static</p><script>
const el = document.querySelector( '.rise' );
const a = el.animate( [ { opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' } ], { duration: 300, fill: 'backwards' } );
a.pause();
new IntersectionObserver( ( es ) => es.forEach( ( e ) => e.isIntersecting && a.play() ) ).observe( el );
</script></body></html>`;
const TREE = [ { name: 'sgs/paragraph', draftRef: '.rise', attributes: {} }, { name: 'sgs/paragraph', draftRef: '.still', attributes: {} } ];
let dir;
let served;
let result;
before( async () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-armed-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	result = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( async () => {
	await served.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

const valueOf = ( id, prop ) => {
	const snap = result.widths[ 1440 ][ id ];
	return JSON.stringify( snap ).match( new RegExp( `"${ prop }":"([^"]*)"` ) )?.[ 1 ];
};

test( 'MUST FAIL: an armed scroll entrance is read at rest (opacity 1, no transform), not at its start pose', () => {
	assert.equal( valueOf( '0:', 'opacity' ), '1' );
	assert.match( valueOf( '0:', 'transform' ) ?? 'none', /^none$/ );
} );

test( 'negative control: a static draft opacity on an element with no entrance is still read', () => {
	assert.equal( valueOf( '1:', 'opacity' ), '0.5' );
} );
