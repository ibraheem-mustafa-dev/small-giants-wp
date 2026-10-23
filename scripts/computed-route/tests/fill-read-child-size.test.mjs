// A wrapper whose only content is an svg or img the draft sizes with width and height attributes takes that size as its
// declared size (lib/fill-read.mjs). Real case: the Indus nav caret is `<span style="display:inline-block">` holding an
// `<svg width="11" height="11">`; the span declares no width, so the used-size rule skipped it silently and
// `submenuCaretSize` was never written.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } svg { display: block } .big { width: 40px }
</style></head><body>
<span class="caret" style="display:inline-block;opacity:.6"><svg width="11" height="11" viewBox="0 0 16 16"><polyline points="4,6 8,10 12,6" stroke="#000" fill="none"/></svg></span>
<span class="word" style="display:inline-block">Menu<svg width="11" height="11" viewBox="0 0 16 16"></svg></span>
<div class="box" style="padding:10px"><svg width="11" height="11" viewBox="0 0 16 16"></svg></div>
<span class="fluid" style="display:inline-block"><svg width="100%" height="11" viewBox="0 0 16 16"></svg></span>
</body></html>`;

const TREE = [ '.caret', '.word', '.box', '.fluid' ].map( ( draftRef ) => ( { name: 'sgs/container', draftRef, attributes: {} } ) );
let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-child-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );

test( 'MUST FAIL: a wrapper holding only a sized svg declares that size', () => {
	assert.equal( read.declared[ 1440 ][ '0:' ].width, '11px' );
	assert.equal( read.declared[ 1440 ][ '0:' ].height, '11px' );
	assert.deepEqual( read.widths[ 1440 ][ '0:' ].childSize, { width: '11px', height: '11px', tag: 'svg' } );
} );

test( 'a wrapper with words, padding around the child, or a fluid child size declares no size of its own', () => {
	assert.equal( read.widths[ 1440 ][ '1:' ].childSize, null, 'words beside the svg' );
	assert.equal( read.widths[ 1440 ][ '2:' ].childSize, null, 'padding makes the box larger than the svg' );
	assert.equal( read.widths[ 1440 ][ '3:' ].childSize, null, 'a percentage size is not a plain attribute length' );
	assert.notEqual( read.declared[ 1440 ][ '1:' ].width, '11px' );
} );
