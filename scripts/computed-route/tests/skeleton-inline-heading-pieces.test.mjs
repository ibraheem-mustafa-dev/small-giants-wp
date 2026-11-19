// An inline heading's separate pieces (Spec 48 FR-48-97, decisions structural.inlineHeading.boxDisplays and ownTypeProps,
// lib/skeleton-write-content.mjs::makeContent): an eyebrow inside a heading
// (`<h2><span style="display:block;font-size:14px;color:…">Our story</span>Made by hand</h2>`) renders on its own line in its own
// type, which the heading's rich text cannot carry. The heading keeps every word in order with a space where the piece's box ends
// (never "Our storyMade by hand"), and each piece is a handover row naming the line and type it loses (MUST FAIL). Refusing the
// heading instead would make it a container holding the eyebrow alone, dropping the heading's own words and level. Pure functions
// only. Mutation list: tests/skeleton-inline-heading-pieces.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverProblems } from '../lib/fill-handover.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { recordView } from '../lib/skeleton-record.mjs';
import { makeContent } from '../lib/skeleton-write-content.mjs';
import { N, run, row, find, build, draftRepo, facts } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return {}; } }';
// section > div > h2 > [ span ] with the heading's own words after the span and no whitespace between them.
const heading = ( spanStyle, o = {} ) => N( 'section', {}, [ N( 'div', {}, [ N( 'h2', { style: o.h2 ?? 'font-size:40px;font-weight:400;color:#222', ...( o.h2display ? { display: o.h2display } : {} ), words: 'Made by hand', parts: [ 0, 'Made by hand' ] }, [ N( 'span', { style: spanStyle, words: 'Our story', ...( o.span || {} ) } ) ] ) ] ) ] );
const H2 = 'Root/3#0';
// The heading node's piece rows (handover rows naming a separate piece).
const pieces = ( r ) => ( find( r.skeleton, ( x ) => 'sgs/heading' === x.name )[ 0 ]?.handover || [] ).filter( ( h ) => /as a piece of its own/.test( h.detail ) );

test( 'MUST FAIL: an eyebrow inside a heading keeps every word in order and is handed over with the line and type it loses', () => {
	const r = run( heading( 'display:block;font-size:14px;color:#b4552d' ), LOGIC );
	assert.equal( row( r, H2 ).block, 'sgs/heading', 'the heading stays a heading at its level' );
	assert.equal( row( r, H2 ).attributes.content, 'Our story Made by hand', 'the words in order, kept apart where the box of the eyebrow ends' );
	const rows = pieces( r );
	assert.equal( rows.length, 1 );
	assert.match( rows[ 0 ].detail, /the heading "Our story Made by hand" holds "Our story" as a piece of its own \(its own block line, font-size 14px, color #b4552d\)/ );
	assert.deepEqual( handoverProblems( rows, 'heading' ), [] );
} );

test( 'MUST FAIL: each sign alone is a piece: a block line (from the style or the computed display alone), its own size, weight or colour, a worded positioned badge', () => {
	const one = ( style, o, re ) => assert.match( pieces( run( heading( style, o ), LOGIC ) )[ 0 ]?.detail ?? '', re );
	one( 'display:block', {}, /\(its own block line\)/ );
	one( '', { span: { display: 'block' } }, /\(its own block line\)/ );
	one( 'font-size:14px', {}, /\(font-size 14px\)/ );
	one( 'font-weight:700', {}, /\(font-weight 700\)/ );
	one( 'color:#b4552d', {}, /\(color #b4552d\)/ );
	one( 'position:absolute', { span: { display: 'block' } }, /\(its own block line\)/ );
} );

test( 'negative control: a word in the type of the heading or inheriting it, a decoration and a wordless positioned layer are no pieces', () => {
	assert.deepEqual( pieces( run( heading( 'font-size:40px;color:#222' ), LOGIC ) ), [], 'the same size and colour' );
	assert.deepEqual( pieces( run( heading( 'color:inherit;font-weight:inherit' ), LOGIC ) ), [], 'inherited type' );
	assert.deepEqual( pieces( run( heading( 'text-decoration:underline' ), LOGIC ) ), [], 'a decoration' );
	assert.deepEqual( pieces( run( heading( 'position:absolute;display:block;font-size:14px', { span: { words: '' } } ), LOGIC ) ), [], 'a wordless positioned layer is drawing' );
} );

// The writer's rich text for the heading, called as the proposal calls it for an inline heading.
function richText( root ) {
	const b = build( root );
	const draft = draftRepo( b.html, LOGIC );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	const m = inventoryModel( b.inventory );
	const { contentAttrs } = makeContent( { m, facts: facts( draft.repo ), view: recordView( rec ), carried: null, surfaceKind: 'page' } );
	return contentAttrs( 'sgs/heading', m.byKey[ H2 ], { inline: true } ).a.content;
}

test( 'MUST FAIL: the rich text keeps a space where a child that renders as its own box meets the next words with no whitespace', () => {
	assert.equal( richText( heading( '', { span: { display: 'block' } } ) ), 'Our story Made by hand' );
	assert.equal( richText( heading( '', { h2: 'display:flex;gap:8px' } ) ), 'Our story Made by hand', 'an item of a heading declared flex' );
	assert.equal( richText( heading( '', { h2display: 'flex' } ) ), 'Our story Made by hand', 'an item of a heading a stylesheet makes flex (the computed display alone)' );
} );

test( 'negative control: an inline child with no whitespace after it joins its words, as the draft renders them', () => {
	const word = N( 'section', {}, [ N( 'div', {}, [ N( 'h2', { words: 'Unable', parts: [ 'Un', 0, 'able' ] }, [ N( 'em', { words: 'believ' } ) ] ) ] ) ] );
	assert.equal( richText( word ), 'Unbelievable' );
} );
