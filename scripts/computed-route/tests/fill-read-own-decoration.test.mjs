// A decoration paints down, never up: a wrapper holding underlined links is not itself underlined. The walker reads a text
// decoration off the element painting the element's first text, so a node with child nodes (a container around a breadcrumb of
// links) took the first link's underline, and Fill wrote textDecoration "underline" on the page's main container, its only child
// and the breadcrumb container of Mama's product page, which then underlined every word (2026-11-19). The read of an element with
// child nodes or words of its own takes the decoration the element or an ancestor draws (lib/fill-read-collect.mjs::collectMany).
// Served local draft, no site. Mutation list: tests/fill-read-own-decoration.mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><main>
<div class="crumbs"><a class="home" href="#" style="text-decoration:underline">Home</a><a class="shop" href="#" style="text-decoration:underline">Shop</a></div>
<div class="drawn" style="text-decoration:underline"><span class="inside">Underlined by its wrapper</span></div>
<section class="under" style="text-decoration:underline"><div class="deep"><span class="word">Inside an underlined section</span></div></section>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: '.crumbs', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: '.home', attributes: {} }, { name: 'sgs/button', draftRef: '.shop', attributes: {} } ] },
	{ name: 'sgs/container', draftRef: '.drawn', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: '.inside', attributes: {} } ] },
	{ name: 'sgs/container', draftRef: '.under', attributes: {}, innerBlocks: [ { name: 'sgs/container', draftRef: '.deep', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: '.word', attributes: {} } ] } ] },
] } ];

let served;
let read;
let ids;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-own-decoration-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	const nodes = skeletonNodes( TREE );
	ids = Object.fromEntries( nodes.map( ( n ) => [ n.node.draftRef, `${ n.index }:` ] ) );
	read = await readDraft( { url: served.url, nodes, headless: true, sweep: false } );
} );
after( () => served?.close() );
const line = ( sel ) => read.widths[ 1440 ][ ids[ sel ] ].styles[ 'text-decoration-line' ];

test( 'MUST FAIL: a wrapper around underlined links is not underlined, nor is the container around that wrapper', () => {
	assert.equal( line( '.crumbs' ), 'none', 'the breadcrumb wrapper' );
	assert.equal( line( 'main' ), 'none', 'the main container' );
} );

test( 'negative controls: a link reads its own underline, a wrapper that draws one reads it, and a wrapper inside one inherits it', () => {
	assert.equal( line( '.home' ), 'underline' );
	assert.equal( line( '.drawn' ), 'underline', 'the wrapper draws it itself' );
	assert.equal( line( '.deep' ), 'underline', 'an ancestor draws it down onto the wrapper' );
} );
