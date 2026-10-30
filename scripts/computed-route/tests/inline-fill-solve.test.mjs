// Rule: every writer of a draft text element into a block setting takes the one inline path (lib/inline-text.mjs::inlineText),
// so a bold, a link or a line break survives in whichever setting receives the words, past the skeleton too:
//   - Solve's text repair (lib/solve-rows.mjs::resolveContent, through lib/inline-writer.mjs::inlineWriter) writes the draft
//     element's markup where its words are the draft's words, never the escaped words alone;
//   - Fill's loop items (lib/fill-list-items.mjs::loopItems, lib/fill-list-content.mjs::itemAttrs) write an item field's
//     markup as that field's setting holds it, the field's format list read from the RichText record of the item it maps over;
//   - a skeleton setting holding markup still pairs with the element whose words it holds (lib/skeleton-part-content.mjs).
// MUST FAIL cases fail on the old code. Negative controls: plain text is written as before; a setting holding no formats keeps
// the words and gives a handover row naming what it cannot hold; markup whose words are not the draft's is not written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRound } from '../solve.mjs';
import { openDb } from '../lib/db.mjs';
import { inlineWriter, inlineByKey } from '../lib/inline-writer.mjs';
import { settingFormats, inlineAllowance, plainOf } from '../lib/inline-text.mjs';
import { listContentWrites } from '../lib/fill-list-content.mjs';
import { contentPairs } from '../lib/skeleton-part-content.mjs';
import { fixtureResolved } from './fixtures/fixture-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const WIDTHS = [ 375, 768, 1440 ];

// An inventory element as the browser read records it: { key, parentKey, tag, words, display, flow, attrs, loops }.
const el = ( key, parentKey, tag, { words = '', display = 'block', flow = null, attrs = {}, loops = [] } = {} ) => ( {
	key, parentKey, depth: parentKey ? 1 : 0, tag, words, allText: words, attrs, srcTag: tag, srcOwnText: words, snippet: `<${ tag }>${ words }</${ tag }>`,
	membership: loops.map( ( [ tpl, as ] ) => ( { kind: 'sc-for', tpl: String( tpl ), as } ) ),
	box: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { x: 0, y: 0, w: 100, h: 20 } ] ) ), visible: Object.fromEntries( WIDTHS.map( ( w ) => [ w, true ] ) ),
	display, displayAt: Object.fromEntries( WIDTHS.map( ( w ) => [ w, display ] ) ), flexDirection: 'row', screenshots: {},
	...( flow ? { flow } : {} ),
} );
const inventory = ( elements ) => fixtureResolved( { checks: {}, source: 'fixture', root: 'section', generated: 'fixture', elements } );

// A paragraph `<p><b>Vegan base:</b> no eggs or dairy.</p>` (Root/2#0) in a section.
const BOLD_INV = () => inventory( [
	el( 'Root/1#0', null, 'section' ),
	el( 'Root/2#0', 'Root/1#0', 'p', { words: 'no eggs or dairy.', flow: [ { key: 'Root/3#0' }, ' no eggs or dairy.' ] } ),
	el( 'Root/3#0', 'Root/2#0', 'b', { words: 'Vegan base:', display: 'inline' } ),
	el( 'Root/4#0', 'Root/1#0', 'p', { words: 'Plain words.' } ),
] );

// Solve: one text row on node cr-ref-c-1, its setting calibrated at `.sgs-text`.
const CTRACE = { ref: 'cr-ref-c-1', path: '', textPath: '.sgs-text' };
const report = ( draft ) => ( { runs: WIDTHS.map( ( width ) => ( { state: 'opening', width, pairs: { ttl: { draft: { styles: {}, text: '' }, live: { trace: CTRACE }, diffs: [ { kind: 'text', key: 'text', draft, live: 'Old words' } ] } } } ) ) } );
const calFor = ( attr ) => () => ( { elements: { '': {}, '.sgs-text': {} }, settings: {}, text: { [ attr ]: { path: '.sgs-text', reachedAt: WIDTHS } } } );
const solveText = ( { block = 'sgs/text', attr = 'text', draft, tpl = 'Root/2#0', inline = true } ) => {
	const tree = [ { name: block, attributes: { className: 'cr-ref-c-1', [ attr ]: 'Old words' } } ];
	const inlineOf = inline ? inlineWriter( { origin: { 'cr-ref-c-1': { tpl } }, inventory: BOLD_INV() } ) : undefined;
	return { tree, r: writeRound( report( draft ), tree, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: calFor( attr ), ...( inlineOf ? { inlineOf } : {} ) } ) };
};

test( 'MUST FAIL: Solve\'s text repair writes the draft element\'s bold as the <strong> the setting holds, and the words still pair', () => {
	const { tree, r } = solveText( { draft: 'Vegan base: no eggs or dairy.' } );
	assert.equal( tree[ 0 ].attributes.text, '<strong>Vegan base:</strong> no eggs or dairy.' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'text', '<strong>Vegan base:</strong> no eggs or dairy.' ] ] );
	assert.equal( plainOf( r.writes[ 0 ].after ), 'Vegan base: no eggs or dairy.', 'the written markup reads as the draft\'s words' );
} );

test( 'negative control: a plain element, or a run with no inline input, is repaired with the escaped words as before', () => {
	assert.equal( solveText( { draft: 'Plain & words.', tpl: 'Root/4#0' } ).tree[ 0 ].attributes.text, 'Plain &amp; words.' );
	assert.equal( solveText( { draft: 'Vegan base: no eggs or dairy.', inline: false } ).tree[ 0 ].attributes.text, 'Vegan base: no eggs or dairy.' );
} );

test( 'negative control: markup whose words are not the draft row\'s words is never written; the row\'s words are', () => {
	assert.equal( solveText( { draft: 'Something else entirely.' } ).tree[ 0 ].attributes.text, 'Something else entirely.' );
} );

test( 'MUST FAIL (the handover) and negative control (the words): a setting holding no format keeps the plain words, and the repair carries the handover naming the bold', () => {
	const { tree, r } = solveText( { block: 'sgs/testimonial', attr: 'reviewerName', draft: 'Vegan base: no eggs or dairy.' } );
	assert.equal( tree[ 0 ].attributes.reviewerName, 'Vegan base: no eggs or dairy.' );
	assert.match( r.writes[ 0 ].handover?.[ 0 ]?.detail ?? '', /sgs\/testimonial reviewerName holds plain text only .*, so the bold "Vegan base:"/ );
} );

test( 'an array item field takes the format list of the item record its block maps over; an unrecorded field is plain', () => {
	assert.ok( settingFormats( process.cwd().replace( /[\\/]scripts[\\/]computed-route$/, '' ), 'sgs/timeline', 'entries.description' )?.includes( 'core/link' ) );
	const repo = new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' );
	assert.deepEqual( inlineAllowance( repo, 'sgs/timeline', 'entries.description' ).rich, true );
	assert.deepEqual( inlineAllowance( repo, 'sgs/timeline', 'entries.title' ), { rich: false, formats: [], br: false } );
	assert.deepEqual( inlineAllowance( repo, 'sgs/pricing-table', 'plans.name' ), { rich: false, formats: [], br: false }, 'RICH_TEXT_PLAIN holds no format' );
} );

// Fill: a timeline loop (sc-for 11, `ms`) inside element 10, two copies, each a title and a description holding a <b> and a link.
const C = 'Demo';
const fact = ( n, tag, holes = [] ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, path ] ) => ( { where, path } ) ), parentChain: [], membership: { scFor: [] } } } ];
const LOOP_FACTS = { elements: Object.fromEntries( [ fact( 10, 'div' ), fact( 11, 'sc-for', [ [ 'attr:list', 'items' ] ] ), fact( 12, 'div' ), fact( 13, 'h3', [ [ 'text', 'ms.title' ] ] ), fact( 14, 'p', [ [ 'text', 'ms.description' ] ] ) ] ) };
const loop = [ [ 11, 'ms' ] ];
const LOOP_INV = () => inventory( [
	el( 'Root/10#0', null, 'div' ),
	...[ 0, 1 ].flatMap( ( i ) => [
		el( `Root/12#${ i }`, 'Root/10#0', 'div', { loops: loop } ),
		el( `Root/13#${ i }`, `Root/12#${ i }`, 'h3', { words: `Year ${ i }`, loops: loop } ),
		el( `Root/14#${ i }`, `Root/12#${ i }`, 'p', { words: 'opened, read the .', loops: loop, flow: [ { key: `Root/15#${ i }` }, ' opened, read the ', { key: `Root/16#${ i }` }, '.' ] } ),
		el( `Root/15#${ i }`, `Root/14#${ i }`, 'b', { words: 'The shop', display: 'inline', loops: loop } ),
		el( `Root/16#${ i }`, `Root/14#${ i }`, 'a', { words: 'story', display: 'inline', loops: loop, attrs: { href: 'https://example.org/story' } } ),
	] ),
] );
function listDb( block, attr ) {
	const d = new DatabaseSync( ':memory:' );
	d.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
	d.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
	d.prepare( "INSERT INTO block_attributes VALUES ( ?, ?, 'array', 'content', NULL, NULL )" ).run( block, attr );
	return d;
}
const fillList = ( block, attr, keys, { inline = true } = {} ) => {
	const inv = LOOP_INV();
	const flat = [ { name: block, attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/10#0' } } ] } ];
	const schemaOf = () => ( { [ attr ]: { type: 'array', default: [], items: { type: 'object', properties: Object.fromEntries( keys.map( ( k ) => [ k, { type: 'string' } ] ) ) } } } );
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes.className, facts: LOOP_FACTS, inventory: inv, db: listDb( block, attr ), schemaOf, rootComponent: C, ...( inline ? { inline: inlineByKey( { inventory: inv, record: LOOP_FACTS, rootComponent: C } ) } : {} ) } );
	return { r, items: flat[ 0 ].attributes[ attr ] };
};

test( 'MUST FAIL: a loop item\'s field written into a setting holding bold and links keeps its <strong> and its link, in its words\' order', () => {
	const { items, r } = fillList( 'sgs/timeline', 'entries', [ 'title', 'description' ] );
	assert.deepEqual( items.map( ( x ) => x.description ), [ 0, 1 ].map( () => '<strong>The shop</strong> opened, read the <a href="https://example.org/story">story</a>.' ) );
	assert.deepEqual( items.map( ( x ) => x.title ), [ 'Year 0', 'Year 1' ], 'a plain field stays its words' );
	assert.equal( r.handover.length, 0 );
} );

test( 'MUST FAIL: a loop item\'s field holding inline parts reads every part\'s words, even where its setting holds plain text', () => {
	const { items, r } = fillList( 'sgs/pricing-table', 'plans', [ 'name', 'description' ] );
	assert.deepEqual( items.map( ( x ) => x.description ), [ 0, 1 ].map( () => 'The shop opened, read the story.' ) );
	assert.ok( r.handover.some( ( h ) => 'content-page' === h.owner && 'text' === h.kind && /plans\.description holds plain text only.*the bold "The shop".*the link "story"/.test( h.reason ) ), 'the plain setting names the bold and the link it cannot hold' );
} );

test( 'MUST FAIL: without the inline writer a loop item still reads its inline parts\' words in place (no markup, as before the rule)', () => {
	assert.deepEqual( fillList( 'sgs/timeline', 'entries', [ 'title', 'description' ], { inline: false } ).items[ 0 ].description, 'The shop opened, read the story.' );
} );

test( 'MUST FAIL: a setting holding the inline markup pairs with the element whose words it holds', () => {
	const els = [ { key: 'a', words: 'Vegan base: no eggs or dairy.' }, { key: 'b', words: 'Other words.' } ];
	const out = contentPairs( { text: { text: { path: '.sgs-text' } }, attributes: { text: '<strong>Vegan base:</strong> no eggs or dairy.' }, els } );
	assert.equal( out.pairs[ '.sgs-text' ]?.key, 'a' );
	assert.equal( contentPairs( { text: { text: { path: '.sgs-text' } }, attributes: { text: 'Not here.' }, els } ).pairs[ '.sgs-text' ], undefined, 'negative control: no element holds the words' );
} );

// Fill's text pass and the skeleton's other text writers.
import { textDecisions } from '../lib/fill-presence.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { fixtureRecord } from './fixtures/fixture-facts.mjs';

test( 'MUST FAIL: Fill\'s text pass writes an empty text setting with the draft element\'s markup where it reads as the draft\'s words', () => {
	const calibration = { text: { text: { path: '' } } };
	const rich = () => ( { value: '<strong>Vegan base:</strong> no eggs or dairy.', handover: [ { owner: 'content-page', kind: 'text', detail: 'a coloured word' } ] } );
	const r = textDecisions( { calibration, slots: { '': 'Vegan base: no eggs or dairy.' }, rich } );
	assert.deepEqual( r.writes, [ { attr: 'text', value: '<strong>Vegan base:</strong> no eggs or dairy.', merge: 'replace' } ] );
	assert.equal( r.textHandover?.[ 0 ]?.detail, 'a coloured word' );
	const other = textDecisions( { calibration, slots: { '': 'Other words.' }, rich } );
	assert.deepEqual( other.writes.map( ( w ) => w.value ), [ 'Other words.' ], 'negative control: markup that reads as other words is not written' );
	assert.deepEqual( textDecisions( { calibration, slots: { '': 'Plain.' } } ).writes.map( ( w ) => w.value ), [ 'Plain.' ], 'negative control: no inline input writes the words' );
} );

// A skeleton fixture: S( tag, { words, attrs, display, flow }, children ), keys Root/<n>#0 in document order; flow lists strings
// and child indices.
const S = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function skeletonOf( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey ) => {
		const x = el( `Root/${ ++n }#0`, parentKey, node.tag, { words: node.o.words || '', display: node.o.display || 'block', attrs: node.o.attrs || {} } );
		Object.assign( x, { template: 'Root', tpl: n, depth: parentKey ? 1 : 0 } );
		elements.push( x );
		const kids = node.kids.map( ( k ) => walk( k, x.key ) );
		node.o.flow && ( x.flow = node.o.flow.map( ( f ) => ( 'number' === typeof f ? { key: kids[ f ].key } : f ) ) );
		x.allText = [ x.words, ...kids.map( ( k ) => k.allText ) ].filter( Boolean ).join( ' ' );
		return x;
	};
	walk( root, null );
	const inv = inventory( elements );
	return proposeSkeleton( { inventory: inv, facts: loadFacts( { db, client: 'fixture-client', repo: REPO } ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: fixtureRecord( inv ) } );
}
const treeNodes = ( list ) => list.flatMap( ( x ) => [ x, ...treeNodes( x.innerBlocks || [] ) ] );

test( 'MUST FAIL: a quote\'s attribution keeps the cite\'s link as the attribution setting holds it', () => {
	const r = skeletonOf( S( 'section', {}, [ S( 'blockquote', { words: 'The best bakes in town.' }, [ S( 'cite', { words: 'Ana, ', flow: [ 'Ana, ', 0 ] }, [ S( 'a', { words: 'Food Weekly', display: 'inline', attrs: { href: 'https://example.org/food' } } ) ] ) ] ) ] ) );
	const quote = treeNodes( r.skeleton ).find( ( x ) => 'sgs/quote' === x.name );
	assert.ok( quote, 'the blockquote is sgs/quote' );
	assert.equal( quote.attributes.attribution, 'Ana, <a href="https://example.org/food">Food Weekly</a>' );
} );

test( 'MUST FAIL: a card\'s call to action keeps its bold in the button label; negative control: a plain action keeps its words', () => {
	const card = ( action ) => S( 'section', {}, [ S( 'a', { attrs: { href: '/food-service' } }, [ S( 'h3', { words: 'Food Service' } ), S( 'p', { words: 'Kitchens that never stop' } ), action ] ) ] );
	const labelOf = ( r ) => treeNodes( r.skeleton ).find( ( x ) => 'sgs/button' === x.name )?.attributes.label;
	assert.equal( labelOf( skeletonOf( card( S( 'div', { words: 'Food Service', flow: [ 0, ' Food Service' ] }, [ S( 'b', { words: 'Explore', display: 'inline' } ) ] ) ) ) ), '<strong>Explore</strong> Food Service' );
	assert.equal( labelOf( skeletonOf( card( S( 'div', { words: 'Explore Food Service' } ) ) ) ), 'Explore Food Service' );
} );

// Bean 2026-10-30: formatting or a link covering a text's whole words is the block's own typography or link, never markup
// inside the text and never a handover; partial formatting a setting cannot hold keeps its words and is the named row.
import { inlineText, plainTextSettings, plainSettings, loadPlainReview } from '../lib/inline-text.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
const textModel = ( kids, flow ) => inventoryModel( inventory( [ el( 'Root/1#0', null, 'section' ), el( 'Root/2#0', 'Root/1#0', 'p', { words: flow.filter( ( x ) => 'string' === typeof x ).join( '' ).trim(), flow } ), ...kids.map( ( [ tag, words, attrs = {} ], i ) => el( `Root/${ 3 + i }#0`, 'Root/2#0', tag, { words, display: 'inline', attrs } ) ) ] ) );
const rebuilt = ( m, block, attr, clickable = false ) => inlineText( { m, e: m.byKey[ 'Root/2#0' ], block, attr, codeRepo: REPO, siteLink: () => ( { kind: 'site', value: 'https://example.org/shop' } ), clickable } );
const k = ( i ) => ( { key: `Root/${ 3 + i }#0` } );

test( 'MUST FAIL: bold covering every word is the block\'s own weight: no <strong> in the text and no handover; negative control: a partial bold stays <strong>', () => {
	const whole = rebuilt( textModel( [ [ 'b', 'Fresh' ], [ 'b', 'bakes' ] ], [ k( 0 ), ' ', k( 1 ) ] ), 'sgs/text', 'text' );
	assert.deepEqual( whole, { value: 'Fresh bakes', handover: [] } );
	const coloured = rebuilt( textModel( [ [ 'span', 'Fresh', { style: 'color:#c00' } ], [ 'span', 'bakes', { style: 'color:#c00' } ] ], [ k( 0 ), ' ', k( 1 ) ] ), 'sgs/text', 'text' );
	assert.deepEqual( coloured.handover, [], 'a colour over the whole text is the block\'s text colour, no handover' );
	assert.equal( rebuilt( textModel( [ [ 'b', 'Fresh' ] ], [ k( 0 ), ' bakes' ] ), 'sgs/text', 'text' ).value, '<strong>Fresh</strong> bakes' );
} );

test( 'MUST FAIL: a link covering a whole label is the block\'s own link: no link in the label and no handover; negative control: a paragraph whose setting holds links keeps it', () => {
	const m = () => textModel( [ [ 'a', 'Shop', { href: '/shop' } ], [ 'a', 'now', { href: '/shop' } ] ], [ k( 0 ), ' ', k( 1 ) ] );
	assert.deepEqual( rebuilt( m(), 'sgs/button', 'label', true ), { value: 'Shop now', handover: [] } );
	assert.deepEqual( rebuilt( m(), 'sgs/tab', 'label' ), { value: 'Shop now', handover: [] }, 'a setting holding no link format takes no handover for a whole link either' );
	assert.match( rebuilt( m(), 'sgs/text', 'text' ).value, /<a href="https:\/\/example\.org\/shop">Shop<\/a>/ );
} );

test( 'partial formatting inside a label keeps its words and raises the named handover row', () => {
	const r = rebuilt( textModel( [ [ 'a', 'today', { href: '/shop' } ] ], [ 'Shop ', k( 0 ) ] ), 'sgs/button', 'label', true );
	assert.equal( r.value, 'Shop today' );
	assert.match( r.handover[ 0 ].detail, /sgs\/button label holds only core\/bold, core\/italic, so the link "today"/ );
} );

test( 'MUST FAIL: the plain-text review lists sentence settings only: no child-block text, no form or form-field setting, no clickable label, no interface string', () => {
	const plain = plainTextSettings( { db, codeRepo: REPO } );
	const has = ( b, a ) => plain.some( ( p ) => b === p.block && a === p.attr );
	assert.ok( ! has( 'sgs/info-box', 'heading' ) && ! has( 'sgs/info-box', 'description' ), 'emit_shape child' );
	assert.ok( ! has( 'sgs/form', 'successMessage' ) && ! has( 'sgs/form-field-text', 'label' ), 'form and form-field blocks' );
	assert.ok( ! has( 'sgs/tab', 'label' ) && ! has( 'sgs/cart', 'checkoutLabel' ) && ! has( 'sgs/modal', 'triggerText' ), 'clickable labels' );
	assert.ok( ! has( 'sgs/cart', 'emptyCartMessage' ) && ! has( 'sgs/breadcrumbs', 'separator' ), 'interface strings' );
	assert.ok( has( 'sgs/cart', 'freeDeliveryMessage' ) && has( 'sgs/google-reviews', 'footnote' ) && has( 'sgs/choice-flow-question', 'intro' ), 'negative control: sentence settings stay' );
	assert.ok( plain.every( ( p ) => /::/.test( p.reader ) ), 'each names the reader that prints it' );
} );

test( 'every plain-text setting is filed in exactly one group of data/plain-text-review.json, each with its reader', () => {
	const groups = loadPlainReview();
	const filed = Object.entries( groups ).flatMap( ( [ g, list ] ) => list.map( ( x ) => [ `${ x.block }:${ x.attr }`, g, x.reader ] ) );
	const keys = filed.map( ( [ k ] ) => k );
	assert.deepEqual( keys.filter( ( k, i ) => keys.indexOf( k ) !== i ), [], 'no setting filed twice' );
	const unfiled = plainSettings( { db, codeRepo: REPO } ).map( ( r ) => `${ r.block }:${ r.attr }` ).filter( ( k ) => ! keys.includes( k ) && ! RE_ROLED.includes( k ) );
	assert.deepEqual( unfiled, [], 'file each new plain-text setting by where the page prints it' );
	assert.ok( filed.every( ( [ , , reader ] ) => /::/.test( reader ) ), 'each filing names its reader' );
} );
// Settings this track re-roles (plugins/sgs-blocks/scripts/attr-classification-overrides.json): no page text, filed nowhere
// once the framework DB is reseeded.
const RE_ROLED = [ 'sgs/notice-message:label', 'sgs/business-info:openStatusOpenText', 'sgs/business-info:openStatusClosedText' ];
