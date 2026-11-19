// A text block's look is read off its own element when that element holds words of its own (lib/fill-read-collect.mjs::collectMany):
// `<p><b>Vegan base:</b> no eggs…</p>` is one sgs/text (structural.inlineText) whose first text is the bold lead-in, and the walker's
// first-text reading wrote fontWeight 700 for the whole paragraph (Mama's Help, 2026-11-19). MUST FAIL on the read before it. Must
// NOT fire on an element with no words of its own (a link wrapping a styled label keeps the label's look). Served local draft,
// no site. Mutation list: tests/fixtures/fill-read-own-text/mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><main>
<p class="mix" style="font-weight:400;font-size:16px"><b style="font-size:16px">Vegan base:</b> no eggs or dairy.</p>
<a class="wrap" href="#" style="font-weight:400"><span style="font-weight:700">Label</span></a>
<a class="spaced" href="#" style="font-weight:400">
	<span style="font-weight:700">Label</span>
</a>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/text', draftRef: '.mix', attributes: {} },
	{ name: 'sgs/button', draftRef: '.wrap', attributes: {} },
	{ name: 'sgs/button', draftRef: '.spaced', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-own-text-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const weight = ( id ) => read.widths[ 1440 ][ id ].styles[ 'font-weight' ];

test( 'MUST FAIL: a paragraph with its own words beside a bold lead-in reads its own weight', () => {
	assert.equal( weight( '1:' ), '400', 'MUST FAIL: the paragraph is not bold' );
} );

test( 'negative control: a link with no words of its own keeps its label\'s look', () => {
	assert.equal( weight( '2:' ), '700' );
	assert.equal( weight( '3:' ), '700', 'white space around the label is no words of its own' );
} );
