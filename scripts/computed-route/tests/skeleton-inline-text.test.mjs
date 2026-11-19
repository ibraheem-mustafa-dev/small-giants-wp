// An element whose own words sit beside inline phrasing children is one text block holding every word in order (Spec 48
// FR-48-97, decisions structural.inlineText, lib/skeleton-classify.mjs and lib/skeleton-write-content.mjs::makeContent):
// `<p><b>Vegan base:</b> no eggs or dairy.</p>` was a wrapper holding only the bold lead-in, and
// `<b>£3.95<br><span style="font-size:13px">Free over £35</span></b>` a wrapper holding only the note, so the element's own
// words never reached the page. A bold or italic child keeps its format, a link its address, a child in its own type is a
// handover row. MUST FAIL with the entry removed. Must NOT fire on: an element with no words of its own (its children carry
// every word), a link or button (a control other rules build), an element holding a block child, a tag the tag map gives a
// block of its own (a list item, a quote). Pure functions only. Mutation list: tests/fixtures/skeleton-inline-text/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverProblems } from '../lib/fill-handover.mjs';
import { inventoryModel, ALL_TEXT_CAP } from '../lib/skeleton-model.mjs';
import { recordView } from '../lib/skeleton-record.mjs';
import { makeContent } from '../lib/skeleton-write-content.mjs';
import { N, run, row, find, build, draftRepo, facts } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return {}; } }';
const page = ( el ) => N( 'section', {}, [ N( 'div', {}, [ el ] ) ] );
const EL = 'Root/3#0';
// Whether a row was claimed by the inlineText rule (its evidence names it).
const byRule = ( r ) => ( r?.candidates || [] ).some( ( c ) => ( c.evidence || [] ).some( ( x ) => /own words beside inline phrasing content/.test( 'string' === typeof x ? x : x.text ) ) );

test( 'MUST FAIL: a paragraph with a bold lead-in keeps its own words after it, the lead-in bold, in one text block', () => {
	const p = N( 'p', { words: 'no eggs or dairy.', parts: [ 0, ' no eggs or dairy.' ] }, [ N( 'b', { words: 'Vegan base:' } ) ] );
	const r = run( page( p ), LOGIC );
	const x = row( r, EL );
	assert.equal( x.block, 'sgs/text', 'MUST FAIL: the paragraph is a text block, not a wrapper' );
	assert.equal( x.attributes.text, '<strong>Vegan base:</strong> no eggs or dairy.', 'MUST FAIL: every word in order, the lead-in bold' );
	assert.equal( row( r, 'Root/4#0' ).action, 'absorbed', 'the bold child is the text\'s own rich text, never a block of its own' );
	assert.equal( find( r.skeleton, ( n ) => 'sgs/text' === n.name ).length, 1 );
	assert.equal( row( run( page( p ), LOGIC, { off: [ 'structural.inlineText' ] } ), EL ).block, 'sgs/container', 'without the entry the paragraph is a wrapper again' );
} );

test( 'MUST FAIL: a price above a smaller note keeps the price, the line break and the note; the note\'s own type is a handover row', () => {
	const b = N( 'b', { style: 'text-align:right', words: '£3.95', parts: [ '£3.95', 0, 1 ] }, [ N( 'br' ), N( 'span', { style: 'font-size:13px;font-weight:600', words: 'Free over £35' } ) ] );
	const r = run( page( b ), LOGIC );
	const x = row( r, EL );
	assert.equal( x.block, 'sgs/text' );
	assert.equal( x.attributes.text, '£3.95<br>Free over £35', 'MUST FAIL: the price is kept' );
	const node = find( r.skeleton, ( n ) => 'sgs/text' === n.name )[ 0 ];
	const rows = ( node.handover || [] ).filter( ( h ) => /as a piece of its own/.test( h.detail ) );
	assert.equal( rows.length, 1 );
	assert.match( rows[ 0 ].detail, /the text "£3\.95 Free over £35" holds "Free over £35" as a piece of its own \(font-size 13px, font-weight 600\)/ );
	assert.deepEqual( handoverProblems( node.handover, 'text' ), [] );
} );

test( 'MUST FAIL: a link inside a sentence keeps its words and its address; an italic keeps its format', () => {
	const p = N( 'p', { words: 'Read the full . Or ask.', parts: [ 'Read the full ', 0, '. Or ', 1, '.' ] }, [ N( 'a', { attrs: { href: 'https://example.com/faq' }, words: 'Help' } ), N( 'em', { words: 'ask' } ) ] );
	const r = run( page( p ), LOGIC );
	const text = row( r, EL ).attributes.text;
	assert.match( text, /^Read the full (?:<a href="[^"]+">Help<\/a>|Help)\. Or <em>ask<\/em>\.$/, 'MUST FAIL: every word in order' );
	const node = find( r.skeleton, ( n ) => 'sgs/text' === n.name )[ 0 ];
	assert.ok( /<a href=/.test( text ) || ( node.handover || [] ).some( ( h ) => 'link' === h.kind ), 'the link is written or handed over, never dropped silently' );
	const dead = N( 'p', { words: 'Message us on .', parts: [ 'Message us on ', 0, '.' ] }, [ N( 'a', { attrs: { href: '#' }, words: 'WhatsApp' } ) ] );
	const r2 = run( page( dead ), LOGIC );
	assert.equal( row( r2, EL ).attributes.text, 'Message us on WhatsApp.', 'a link with no destination keeps its words' );
	const rows = find( r2.skeleton, ( n ) => 'sgs/text' === n.name )[ 0 ].handover || [];
	assert.ok( rows.some( ( h ) => 'link' === h.kind && /the link "WhatsApp" in the text "Message us on WhatsApp\."/.test( h.detail ) ), 'and is a handover row naming it' );
	assert.deepEqual( handoverProblems( rows, 'text' ), [] );
} );

test( 'negative control: no words of its own, a control, a block child and a tag with its own block are not claimed', () => {
	const two = N( 'div', {}, [ N( 'span', { words: 'Royal Mail' } ), N( 'span', { style: 'font-size:14px', words: '2–3 days' } ) ] );
	const r1 = run( page( two ), LOGIC );
	assert.ok( ! byRule( row( r1, EL ) ), 'a wrapper of phrasing children with no words of its own keeps each child in its own type' );
	assert.equal( find( r1.skeleton, ( n ) => 'sgs/text' === n.name ).length, 2 );
	const link = N( 'a', { attrs: { href: 'https://example.com/' }, words: 'Shop gifts', parts: [ 'Shop gifts ', 0 ] }, [ N( 'span', { words: '→' } ) ] );
	assert.ok( ! byRule( row( run( page( link ), LOGIC ), EL ) ), 'a link is a control' );
	const button = N( 'button', { words: 'Mango', parts: [ 0, 'Mango' ] }, [ N( 'span', { style: 'width:8px;height:8px' } ) ] );
	assert.ok( ! byRule( row( run( page( button ), LOGIC ), EL ) ), 'a button is a control' );
	const block = N( 'div', { words: 'Note', parts: [ 'Note ', 0 ] }, [ N( 'div', { words: 'A box' } ) ] );
	assert.ok( ! byRule( row( run( page( block ), LOGIC ), EL ) ), 'a div child is no phrasing content' );
	const quote = N( 'blockquote', { words: 'Lovely', parts: [ 'Lovely ', 0 ] }, [ N( 'cite', { words: 'Sam' } ) ] );
	assert.ok( ! byRule( row( run( page( quote ), LOGIC ), EL ) ), 'a quote has its own block' );
} );

// The writer's rich text for the element, with the inventory's rendered text cut as the inventory cuts it (ALL_TEXT_CAP).
function cutText( root, { source = true, rendered = null } = {} ) {
	const b = build( root );
	b.inventory.elements.forEach( ( e ) => ( e.allText = e.allText.slice( 0, ALL_TEXT_CAP ) ) );
	null !== rendered && ( b.inventory.elements.find( ( e ) => EL === e.key ).allText = rendered );
	const draft = draftRepo( source ? b.html : '<i></i>', LOGIC );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	const m = inventoryModel( b.inventory );
	return makeContent( { m, facts: facts( draft.repo ), view: recordView( rec ), carried: null, surfaceKind: 'page' } ).contentAttrs( 'sgs/text', m.byKey[ EL ], { inline: true } );
}
const LONG = ' no eggs or dairy. Still contains oats, flaxseed and fenugreek, and the same tree nut advice applies. Some flavours and chips may add allergens; each is listed on the product page.';

test( 'MUST FAIL: a text longer than the rendered text the inventory keeps is written whole from its source', () => {
	const p = N( 'p', { words: LONG.trim(), parts: [ 0, LONG ] }, [ N( 'b', { words: 'Vegan base:' } ) ] );
	const r = cutText( page( p ) );
	assert.equal( r.a.text, `<strong>Vegan base:</strong>${ LONG }`, 'MUST FAIL: every word, never cut at the limit of the inventory' );
	assert.deepEqual( r.handover, [] );
} );

test( 'negative control: a long text whose source cannot be read keeps what is known and says the rest is missing; a short one says nothing', () => {
	const p = N( 'p', { words: LONG.trim(), parts: [ 0, LONG ] }, [ N( 'b', { words: 'Vegan base:' } ) ] );
	const r = cutText( page( p ), { source: false } );
	assert.equal( r.a.text.length, ALL_TEXT_CAP );
	assert.ok( r.handover.some( ( h ) => /is longer than the \d+ characters of rendered text the inventory keeps/.test( h.detail ) ), 'never cut silently' );
	assert.deepEqual( handoverProblems( r.handover, 'text' ), [] );
	const short = cutText( page( N( 'p', { words: 'no eggs.', parts: [ 0, ' no eggs.' ] }, [ N( 'b', { words: 'Vegan:' } ) ] ) ), { source: false } );
	assert.ok( ! short.handover.some( ( h ) => /is longer than/.test( h.detail ) ) );
	const more = cutText( page( N( 'p', { words: 'no eggs.', parts: [ 0, ' no eggs.' ] }, [ N( 'b', { words: 'Vegan:' } ) ] ) ), { rendered: 'Vegan:' } );
	assert.equal( more.a.text, 'Vegan:', 'a short text whose source says more than the page shows writes what the page shows' );
} );
