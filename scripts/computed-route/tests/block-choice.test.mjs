// lib/block-choice.mjs: the route's block for each draft section against a hand-built page's block, aligned by words.
// Each class has two small trees (a route skeleton with its inventory, and hand-built block markup) and a negative
// control. `facts` stands in for the framework database: sgs/container and sgs/hero are layout blocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { alignScore, alignSurface, attributeWords, looksUnder, ownerTree, parseBlockMarkup, parseSavedSections, refMap, routeTree, tokens } from '../lib/block-choice.mjs';

const facts = {
	category: ( n ) => ( [ 'sgs/container', 'sgs/hero' ].includes( n ) ? 'sgs-layout' : 'sgs-content' ),
	contentAttrs: ( n ) => ( { 'sgs/text': new Set( [ 'text' ] ), 'sgs/heading': new Set( [ 'content' ] ), 'sgs/trust-bar': new Set( [ 'items' ] ), 'sgs/reviews': new Set( [ 'reviews' ] ), 'sgs/icon-list': new Set( [ 'heading' ] ) }[ n ] ?? null ),
	modeAttrs: ( n ) => ( 'sgs/cart' === n ? new Map( [ [ 'displayMode', 'link' ] ] ) : new Map() ),
};

// A route surface from a nested spec: [ name, words, children, attrs ]; each node gets its own draft element whose
// allText is its words plus its children's.
function route( specs, surface = 'home' ) {
	const elements = [];
	const rows = [];
	let n = 0;
	const build = ( [ name, words = '', kids = [], attributes = {} ] ) => {
		const key = `Root/${ n++ }#0`;
		const built = kids.map( build );
		const allText = [ words, ...built.map( ( b ) => elements.find( ( e ) => e.key === b.draftRef.tpl ).allText ) ].join( ' ' ).trim();
		elements.push( { key, words, allText } );
		rows.push( { key, rule: `rule-${ name }`, reason: `reason for ${ name }` } );
		return { name, attributes, draftRef: { tpl: key }, innerBlocks: built };
	};
	const sk = specs.map( build );
	return { sk, nodes: routeTree( sk, { elements }, { rows }, facts, surface ), elements };
}
const owner = ( markup ) => ownerTree( parseBlockMarkup( markup ), facts );
const b = ( name, attrs = {}, inner = '' ) => ( inner ? `<!-- wp:${ name } ${ JSON.stringify( attrs ) } -->${ inner }<!-- /wp:${ name } -->` : `<!-- wp:${ name } ${ JSON.stringify( attrs ) } /-->` );
const page = ( ...sections ) => b( 'sgs/container', {}, sections.join( '' ) );
const align = ( r, o, draft = null ) => alignSurface( r.nodes, owner( o ), facts, draft );
const classes = ( out ) => out.groups.map( ( g ) => g.cls ).sort();
const groupOf = ( out, name ) => out.groups.find( ( g ) => g.route.some( ( u ) => u.node.name === name ) || g.owner.some( ( u ) => u.node.name === name ) );

// Two sections every fixture page holds, so sections exist to link.
const INTRO_R = [ 'sgs/container', '', [ [ 'sgs/heading', 'Fresh bakes every morning' ] ] ];
const INTRO_O = b( 'sgs/container', {}, b( 'sgs/heading', { content: 'Fresh bakes every morning' } ) );

test( 'tokens and alignScore: function words dropped, overlap of the smaller set, the tiny-set rule', () => {
	assert.deepEqual( [ ...tokens( 'The Best of the Best sellers, 4.9 (41)' ) ], [ 'best', 'sellers', '41' ] );
	assert.equal( alignScore( tokens( 'photo to come' ), tokens( 'photo come polarised' ) ).aligned, true );
	assert.equal( alignScore( tokens( 'shop gifts now' ), tokens( 'shop our range of cakes and bakes' ) ).aligned, false, 'one shared word of three is not enough' );
	assert.equal( alignScore( tokens( 'Shop' ), tokens( 'shop' ) ).aligned, true, 'one equal word aligns' );
	assert.equal( alignScore( tokens( 'Shop' ), tokens( 'Help' ) ).aligned, false );
} );

test( 'block markup: nesting, self-closing blocks, the text inside a block, sections by @@@', () => {
	const tree = parseBlockMarkup( b( 'sgs/container', { a: 1 }, `${ b( 'sgs/text', { text: 'Hi' } ) }<p>loose words</p>` ) );
	assert.equal( tree.length, 1 );
	assert.equal( tree[ 0 ].innerBlocks[ 0 ].name, 'sgs/text' );
	assert.match( tree[ 0 ].html, /loose words/ );
	const s = parseSavedSections( `@@@ page_on_front 9\n${ b( 'sgs/text', { text: 'A' } ) }\n@@@ post 3 sgs_form x\n${ b( 'sgs/text', { text: 'B' } ) }` );
	assert.deepEqual( s.map( ( x ) => x.head ), [ 'page_on_front 9', 'post 3 sgs_form x' ] );
} );

test( 'MUST FAIL attribute words: content attributes only, setting slugs inside items dropped, a content slug kept, alt text never', () => {
	assert.deepEqual( attributeWords( 'sgs/trust-bar', { items: [ { label: 'Baked fresh', fillStyle: 'filled' } ], badgeStyle: 'icon-bare' }, facts ), [ 'Baked fresh' ] );
	assert.deepEqual( attributeWords( 'sgs/icon-list', { heading: 'shop' }, facts ), [ 'shop' ] );
	assert.deepEqual( attributeWords( 'sgs/unknown', { caption: 'A real caption', imageAlt: 'not printed', layout: 'grid' }, facts ), [ 'A real caption' ] );
} );

test( 'MUST FAIL route words: a node prints its draft words less its children, a linked surface becomes its children', () => {
	const r = route( [ [ 'sgs/container', 'orphan line', [ [ 'sgs/text', 'child words here' ] ] ] ] );
	assert.deepEqual( [ ...r.nodes[ 0 ].own ], [ 'orphan', 'line' ] );
	const flow = route( [ [ 'sgs/heading', 'Build your box' ] ], 'flow-x' ).nodes;
	const linked = routeTree( [ { name: 'sgs/choice-flow', attributes: { flowId: 'x' }, innerBlocks: [] } ], { elements: [] }, { rows: [] }, facts, 'home', ( a ) => ( 'x' === a.flowId ? flow : null ) );
	assert.equal( linked[ 0 ].kids[ 0 ].name, 'sgs/heading' );
	assert.equal( linked[ 0 ].kids[ 0 ].key, 'flow-x:Root/0#0' );
} );

test( 'MUST FAIL same block, and route-written when the hand-built block carries a cr-ref class', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/text', 'Handmade in small batches daily' ] ] ] ] ] ] );
	const same = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/text', { text: 'Handmade in small batches daily' } ) ) ) );
	assert.equal( groupOf( same, 'sgs/text' ).cls, 'same' );
	const kept = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/text', { text: 'Handmade in small batches daily', className: 'cr-ref-home-4' } ) ) ) );
	assert.equal( groupOf( kept, 'sgs/text' ).cls, 'route-written' );
	assert.deepEqual( classes( kept ), [ 'route-written', 'same' ], 'the heading without the class stays same' );
} );

test( 'MUST FAIL same block in another mode: an enum-mode setting differs (an unset one reads as its default)', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/cart', 'Basket checkout', [], { displayMode: 'drawer' } ] ] ] ] ] ] );
	const out = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/cart', { label: 'Basket checkout' } ) ) ) );
	const g = groupOf( out, 'sgs/cart' );
	assert.equal( g.cls, 'mode' );
	assert.deepEqual( g.modes, [ { attr: 'displayMode', route: 'drawer', owner: 'link' } ] );
	const neg = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/cart', { label: 'Basket checkout', displayMode: 'drawer' } ) ) ) );
	assert.equal( groupOf( neg, 'sgs/cart' ).cls, 'same', 'negative control: the same mode' );
} );

test( 'MUST FAIL a different block of the same kind: a testimonial slider against a reviews block', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/testimonial-slider', '', [ [ 'sgs/testimonial', 'Lovely visit, great service from Fatima' ], [ 'sgs/testimonial', 'Kind optician who fits you in' ] ] ] ] ] ] ] ] );
	const out = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/reviews', { reviews: [ { text: 'Lovely visit, great service from Fatima' }, { text: 'Kind optician who fits you in' } ] } ) ) ) );
	const g = groupOf( out, 'sgs/reviews' );
	assert.equal( g.cls, 'other-block' );
	assert.equal( g.route[ 0 ].node.name, 'sgs/testimonial-slider' );
	const neg = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/testimonial-slider', {}, b( 'sgs/testimonial', { quote: 'x' } ) ) ) ) );
	assert.notEqual( groupOf( neg, 'sgs/testimonial-slider' )?.cls, 'other-block', 'negative control: the same slider' );
} );

test( 'MUST FAIL several route blocks where the hand-built page has one: tile parts against one product card, joined as siblings', () => {
	const tile = ( brand, name ) => [ 'sgs/container', '', [ [ 'sgs/label', 'Photo to come' ], [ 'sgs/label', brand ], [ 'sgs/heading', name ], [ 'sgs/text', '£139' ] ] ];
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', 'Best sellers', [ tile( 'Ray-Ban', 'Aviator Classic' ), tile( 'Gucci', 'Cat Eye' ) ] ] ] ] ] );
	const card = b( 'sgs/product-card', { noImageLabel: 'Photo to come', productId: 7 } );
	const out = align( r, page( INTRO_O, b( 'sgs/container', {}, card + card ) ) );
	const g = groupOf( out, 'sgs/product-card' );
	assert.equal( g.cls, 'several-to-one' );
	assert.equal( g.route.length, 8, 'every part of both tiles, the brand tags and prices included' );
	const neg = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/label', { text: 'Photo to come' } ) ) ) );
	assert.equal( out.groups.filter( ( x ) => 'several-to-one' === x.cls ).length, 1 );
	assert.notEqual( groupOf( neg, 'sgs/heading' )?.cls, 'several-to-one', 'negative control: no product card, the headings stay route blocks of their own' );
} );

test( 'MUST FAIL one route block where the hand-built page has several: a flow against a heading, a text and a buy box', () => {
	const flow = [ 'sgs/choice-flow', 'Build your box. Nothing sits on a shelf, pick a base and chips', [] ];
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ flow ] ] ] ] ] );
	const o = page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/heading', { content: 'Build your box' } ) + b( 'sgs/text', { text: 'Nothing sits on a shelf' } ) + b( 'sgs/buybox', { productId: 3 } ) ) );
	const g = groupOf( align( r, o ), 'sgs/choice-flow' );
	assert.equal( g.cls, 'one-to-several' );
	assert.deepEqual( g.owner.map( ( u ) => u.node.name ), [ 'sgs/heading', 'sgs/text', 'sgs/buybox' ] );
	const neg = groupOf( align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/choice-flow', { title: 'Build your box. Nothing sits on a shelf, pick a base and chips' } ) ) ) ), 'sgs/choice-flow' );
	assert.equal( neg.cls, 'same', 'negative control: one flow on both sides' );
} );

test( 'MUST FAIL a hand-built part no route block chose links to the route block holding its words', () => {
	const flow = [ 'sgs/choice-flow', 'Build your box. Nothing sits on a shelf, pick a base and chips', [] ];
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ flow, [ 'sgs/text', 'Handmade in small batches daily' ] ] ] ] ] ] );
	const part = ( x ) => b( 'sgs/container', {}, x );
	const o = page( INTRO_O, b( 'sgs/container', {}, part( b( 'sgs/heading', { content: 'Build your box' } ) ) + part( b( 'sgs/text', { text: 'Nothing sits on a shelf' } ) ) + part( b( 'sgs/text', { text: 'Handmade in small batches daily' } ) ) ) );
	const g = groupOf( align( r, o ), 'sgs/choice-flow' );
	assert.equal( g.cls, 'one-to-several' );
	assert.deepEqual( g.owner.map( ( u ) => u.node.name ), [ 'sgs/heading', 'sgs/text' ] );
} );

test( 'MUST FAIL a wrapper on one side only, and a layout frame (a hero) on one side only', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/container', '', [ [ 'sgs/text', 'Opening hours Monday to Friday' ] ] ], [ 'sgs/text', 'Closed on Sundays all year' ] ] ] ] ] ] );
	const out = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/text', { text: 'Opening hours Monday to Friday' } ) + b( 'sgs/text', { text: 'Closed on Sundays all year' } ) ) ) );
	assert.deepEqual( out.groups.filter( ( g ) => g.route[ 0 ]?.node.name === 'sgs/text' ).map( ( g ) => g.cls ).sort(), [ 'container', 'same' ] );
	const hero = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/hero', '', [ [ 'sgs/heading', 'The same designer shades for less' ], [ 'sgs/text', 'Optician in the city' ] ] ] ] ] ] );
	const flat = align( hero, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/heading', { content: 'The same designer shades for less' } ) + b( 'sgs/text', { text: 'Optician in the city' } ) ) ) );
	assert.equal( groupOf( flat, 'sgs/text' ).cls, 'container' );
	const both = align( hero, page( INTRO_O, b( 'sgs/hero', {}, b( 'sgs/heading', { content: 'The same designer shades for less' } ) + b( 'sgs/text', { text: 'Optician in the city' } ) ) ) );
	assert.equal( groupOf( both, 'sgs/text' ).cls, 'same', 'negative control: a hero on both sides' );
} );

test( 'MUST FAIL an addition of the hand-built page: its words are not in the draft; unaligned blocks on either side', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/text', 'Handmade in small batches daily' ] ] ], [ 'sgs/container', '', [ [ 'sgs/label', 'Limited edition flavours monthly' ] ] ] ] ] ] );
	const draft = tokens( r.elements.map( ( e ) => e.words ).join( ' ' ) );
	const o = page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/text', { text: 'Handmade in small batches daily' } ) + b( 'sgs/rating', { label: 'Rated excellent on Google' } ) ) );
	const out = align( r, o, draft );
	assert.equal( groupOf( out, 'sgs/rating' ).cls, 'owner-addition' );
	assert.equal( groupOf( out, 'sgs/label' ).cls, 'route-unaligned' );
	const held = groupOf( align( r, o, tokens( 'Handmade Rated excellent on Google' ) ), 'sgs/rating' );
	assert.notEqual( held.cls, 'owner-addition', 'negative control: the draft holds its words' );
	assert.deepEqual( held.extra, [ 'sgs/rating' ], 'it joins its neighbour as an extra' );
} );

test( 'MUST FAIL a unit links only inside a linked section: a repeated caption in another section does not pull it away', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', 'Best sellers this month', [ [ 'sgs/heading', 'Oversized Cat Eye' ], [ 'sgs/label', 'Photo to come' ] ] ], [ 'sgs/container', 'Start with a shape', [ [ 'sgs/label', 'Pilot' ] ] ] ] ] ] );
	const o = page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/text', { text: 'Best sellers this month' } ) + b( 'sgs/product-card', { noImageLabel: 'Photo to come' } ) ), b( 'sgs/container', {}, b( 'sgs/text', { text: 'Start with a shape' } ) + b( 'sgs/card-grid', { items: [ { title: 'Pilot' }, { title: 'Oversized' }, { title: 'Cat Eye' } ] } ) ) );
	const g = groupOf( align( r, o ), 'sgs/card-grid' );
	assert.ok( ! g.route.some( ( u ) => u.node.name === 'sgs/heading' ), 'the tile title stays with the best sellers section' );
} );

test( 'MUST FAIL looks under a group and the Fill ref map (exact, then by sequence)', () => {
	const r = route( [ [ 'sgs/container', '', [ INTRO_R, [ 'sgs/container', '', [ [ 'sgs/text', 'Handmade in small batches daily' ] ] ] ] ] ] );
	const out = align( r, page( INTRO_O, b( 'sgs/container', {}, b( 'sgs/button', { text: 'Handmade in small batches daily' } ) ) ) );
	const g = groupOf( out, 'sgs/button' );
	const index = new Map( [ [ 'home:Root/4#0', { gaps: 3, conserve: 2, motion: 1 } ], [ 'home:Root/1#0', { gaps: 50, conserve: 0, motion: 0 } ] ] );
	assert.deepEqual( looksUnder( g, index ), { gaps: 3, conserve: 2, motion: 1, total: 6 } );
	const filled = [ { name: 'a', innerBlocks: [ { name: 'b' }, { name: 'c' } ] } ];
	const sk = [ { name: 'a', draftRef: { tpl: 'K0' }, innerBlocks: [ { name: 'b', draftRef: { tpl: 'K1' } }, { name: 'c', draftRef: { tpl: 'K2' } } ] } ];
	assert.deepEqual( refMap( filled, [ sk ] ), { keys: [ 'K0', 'K1', 'K2' ], how: 'exact' } );
	const sk2 = [ { name: 'a', draftRef: { tpl: 'K0' }, innerBlocks: [ { name: 'x', draftRef: { tpl: 'KX' } }, { name: 'c', draftRef: { tpl: 'K2' } } ] } ];
	assert.deepEqual( refMap( filled, [ sk2 ] ), { keys: [ 'K0', null, 'K2' ], how: 'sequence' } );
	const run4 = [ { name: 'a', innerBlocks: [ { name: 'a' }, { name: 'b' }, { name: 'c' } ] } ];
	const sk4 = [ { name: 'a', draftRef: { tpl: 'K0' }, innerBlocks: [ { name: 'a', draftRef: { tpl: 'K1' } }, { name: 'c', draftRef: { tpl: 'K3' } } ] } ];
	assert.deepEqual( refMap( run4, [ sk4 ] ).keys, [ 'K0', 'K1', null, 'K3' ], 'a repeated name maps to its own place' );
} );
