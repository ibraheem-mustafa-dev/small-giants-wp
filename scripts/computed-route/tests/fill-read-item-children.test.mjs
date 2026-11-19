// A block that draws its items as child blocks (a slider's testimonials, placed by Fill from the draft's list) reads its own text
// styles off its draft element, not off the first text beneath it (lib/fill-list-content.mjs::markItemChildren, lib/fill-read.mjs::jobsFor).
// The Indus homepage's testimonial slider holds the quote mark (a 60px, 800-weight, blue span) before the quote: the first-text read
// wrote that span's look onto the slider's root (fontSize 60, fontWeight 800, textColour blue), so every testimonial inherited
// bold blue text (2026-11-19). A block holding its items in one attribute still reads the first text. Served local draft, no site.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft, jobsFor } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { markItemChildren } from '../lib/fill-list-content.mjs';

const CARD = ( cls ) => `<div class="${ cls }" style="font-family:Georgia;font-weight:400;font-size:19px;color:rgb(30,42,60)"><span style="display:block;font-size:60px;font-weight:800;color:rgb(10,126,168)">&ldquo;</span><p style="font-size:18px;margin:0">Their delivery is always on time.</p></div>`;
const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><main>${ CARD( 'a' ) }${ CARD( 'b' ) }</main></body></html>`;

const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT )' );
db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
db.exec( `INSERT INTO block_attributes VALUES ( 'sgs/quote', 'quote', 'string', 'text-content', NULL ), ( 'sgs/steps', 'steps', 'array', 'content', NULL )` );
db.exec( `INSERT INTO block_composition VALUES ( 'sgs/quotes', '["sgs/quote"]' ), ( 'sgs/steps', '[]' )` );
const SCHEMAS = { 'sgs/steps': { steps: { type: 'array', items: { type: 'object', properties: { title: { type: 'string', role: 'text-content' } } } } } };
const schemaOf = ( b ) => SCHEMAS[ b ] || null;

const TREE = () => [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/quotes', draftRef: '.a', attributes: {} },
	{ name: 'sgs/steps', draftRef: '.b', attributes: {} },
	{ name: 'sgs/quotes', draftRef: '.b', attributes: {}, innerBlocks: [ { name: 'sgs/quote', draftRef: '.b p', attributes: {} } ] },
	{ name: 'sgs/quotes', attributes: {} },
] } ];

let served;
let read;
let nodes;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-item-children-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	nodes = markItemChildren( { nodes: skeletonNodes( TREE() ), db, schemaOf } );
	read = await readDraft( { url: served.url, nodes, headless: true, sweep: false } );
} );
after( () => served?.close() );
const style = ( id, p ) => read.widths[ 1440 ][ id ].styles[ p ];

test( 'MUST FAIL: a block drawing its items as child blocks is marked, and its root reads its own element, not the quote mark', () => {
	assert.equal( nodes[ 1 ].itemChildren, true );
	assert.equal( jobsFor( nodes ).find( ( j ) => '1:' === j.id ).own, true );
	assert.equal( style( '1:', 'font-weight' ), '400' );
	assert.equal( style( '1:', 'font-size' ), '19px' );
	assert.equal( style( '1:', 'color' ), 'rgb(30, 42, 60)' );
} );

test( 'negative control: a block holding its items in an attribute, and a block that already has child nodes, are not marked; the first text is still read', () => {
	assert.equal( nodes[ 2 ].itemChildren, undefined, 'an attribute list is not child blocks' );
	assert.equal( nodes[ 3 ].itemChildren, undefined, 'a node with child nodes already reads its own text' );
	assert.equal( style( '2:', 'font-size' ), '60px', 'the first-text read of a leaf-like block is unchanged' );
	assert.equal( style( '3:', 'font-size' ), '19px' );
	assert.equal( nodes[ 5 ].itemChildren, undefined, 'a node with no draft element has nothing to read' );
} );

test( 'MUST FAIL: fill.mjs marks the nodes before the read', () => {
	const src = fs.readFileSync( new URL( '../fill.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /const nodes = markItemChildren\( \{ nodes: skeletonNodes\( skeleton \), db, schemaOf: blockSchema \} \);/ );
} );
