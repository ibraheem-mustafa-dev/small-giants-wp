// rules.commerceRegion (Spec 48 FR-48-87, Bean 2026-10-26): on a WooCommerce page surface the draft's commerce region is
// WooCommerce's working piece, an ordinary block that draws the region itself, and everything around it stays the draft's
// own blocks. Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on
// the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { commerceOf, commerceRegion, leadsTo } from '../lib/skeleton-commerce-region.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const RULE = () => facts().decisions.rules.commerceRegion;

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
// An inventory element; `x.loop` makes it an item of the loop tpl, `x.attrs` its source attributes, `x.all` its text below.
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: [ ...( x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [] ), ...( x.imported ? [ { kind: 'inside-import', template: x.template } ] : [] ) ], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) };
};
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements, commerce ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce, db } );
const find = ( tree, name ) => {
	for ( const n of tree ) {
		if ( n.name === name ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], name );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const names = ( tree ) => JSON.stringify( tree ).match( /"name":"[^"]+"/g ).map( ( x ) => x.slice( 8, -1 ) );

// A basket page: a heading, then a grid of the order lines and a summary with the checkout link.
const line = ( n, price ) => [ el( `Root/${ n }#${ price }`, 'Root/4#0', 'div', '', { depth: 3, loop: 9, all: `Zookies ${ price }` } ), el( `Root/${ n + 1 }#${ price }`, `Root/${ n }#${ price }`, 'div', `£${ price }.00`, { depth: 4, loop: 9 } ) ];
const CART = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Your basket' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/4#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	...line( 10, 5 ), ...line( 10, 8 ),
	el( 'Root/5#0', 'Root/3#0', 'aside', '', { depth: 2 } ),
	el( 'Root/6#0', 'Root/5#0', 'a', 'Checkout securely', { depth: 3, attrs: { href: 'Checkout.dc.html' }, keep: true } ),
	el( 'Root/7#0', 'Root/1#0', 'p', 'Baked fresh for you' ),
];
// The header's basket drawer: a fixed panel with its own order lines and checkout link.
const DRAWER = [
	el( 'Root/40#0', 'Root/1#0', 'aside', '', { depth: 1, position: FIXED } ),
	el( 'Root/41#0', 'Root/40#0', 'div', '', { depth: 2, loop: 42, all: '£5.00' } ),
	el( 'Root/43#0', 'Root/41#0', 'span', '£5.00', { depth: 3, loop: 42 } ),
	el( 'Root/44#0', 'Root/40#0', 'a', 'Checkout', { depth: 2, attrs: { href: 'Checkout.dc.html' }, keep: true } ),
];

test( 'MUST FAIL: the basket\'s order lines and checkout link are the page\'s own content (WooCommerce\'s Cart block); the heading and note stay', () => {
	// The drawer is listed first, so its checkout link is the first one met: each loop takes its nearest link.
	const { skeleton, proposal, problems } = run( [ CART[ 0 ], ...DRAWER, ...CART.slice( 1 ) ], { role: 'cart', checkout: 'Checkout.dc.html' } );
	assert.deepEqual( problems, [] );
	assert.deepEqual( proposal.commerceRegion, { key: 'Root/3#0', role: 'cart', block: 'core/post-content' } );
	const pc = find( skeleton, 'core/post-content' );
	assert.ok( pc, 'the region is core/post-content' );
	assert.equal( pc.draftRef, undefined, 'WooCommerce draws the region: Fill reads nothing into it' );
	assert.deepEqual( pc.innerBlocks, [] );
	assert.ok( find( skeleton, 'sgs/heading' ), 'the draft heading above the region is kept' );
	assert.equal( names( skeleton ).filter( ( n ) => 'core/post-content' === n ).length, 1, 'the drawer, a fixed panel, is never the page\'s region' );
	const rows = proposal.rows.filter( ( r ) => 'absorbed' === r.action && 'commerceRegion' === r.rule );
	assert.ok( rows.some( ( r ) => 'Root/6#0' === r.key ), 'the checkout link is drawn by WooCommerce, never built' );
} );

test( 'MUST FAIL: the checkout\'s payment fields and order lines are the Checkout block; the page header stays', () => {
	const els = [
		el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'header', 'Secure checkout' ),
		el( 'Root/10#0', 'Root/1#0', 'input', '', { attrs: { type: 'email', autocomplete: 'email' }, keep: true } ),
		el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
		el( 'Root/4#0', 'Root/3#0', 'form', '', { depth: 2 } ),
		el( 'Root/5#0', 'Root/4#0', 'input', '', { depth: 3, attrs: { autocomplete: 'cc-number', inputmode: 'numeric' } } ),
		el( 'Root/6#0', 'Root/4#0', 'input', '', { depth: 3, attrs: { autocomplete: 'cc-csc', inputmode: 'numeric' } } ),
		el( 'Root/7#0', 'Root/3#0', 'aside', '', { depth: 2 } ),
		el( 'Root/8#0', 'Root/7#0', 'div', '', { depth: 3, loop: 8, all: '£21.50' } ),
		el( 'Root/9#0', 'Root/8#0', 'span', '£21.50', { depth: 4, loop: 8 } ),
	];
	const { skeleton, proposal } = run( els, { role: 'checkout', checkout: null } );
	assert.equal( proposal.commerceRegion.key, 'Root/3#0' );
	assert.ok( find( skeleton, 'core/post-content' ) );
	assert.equal( names( skeleton ).includes( 'sgs/form' ), false, 'no SGS form imitates the checkout' );
} );

test( 'MUST FAIL: the account\'s sign-in and register forms (password fields) are the account block\'s', () => {
	const els = [
		el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'h1', 'Sign in or register' ),
		el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
		el( 'Root/4#0', 'Root/3#0', 'form', '', { depth: 2 } ),
		el( 'Root/5#0', 'Root/4#0', 'input', '', { depth: 3, attrs: { type: 'password' }, keep: true } ),
		el( 'Root/6#0', 'Root/3#0', 'form', '', { depth: 2 } ),
		el( 'Root/7#0', 'Root/6#0', 'input', '', { depth: 3, attrs: { type: 'password' } } ),
	];
	const { skeleton, proposal } = run( els, { role: 'account', checkout: null } );
	assert.equal( proposal.commerceRegion.key, 'Root/3#0', 'the smallest element holding both forms\' password fields (read from the source tag too)' );
	assert.ok( find( skeleton, 'core/post-content' ) );
	assert.ok( find( skeleton, 'sgs/heading' ) );
} );

// A shop: a heading and the grid of mounted product cards, four to a row.
const card = ( i, y ) => [
	el( `Root/9#${ i }`, 'Root/8#0', 'div', '', { depth: 3, loop: 9, all: `Box ${ i } £12.00`, box: place( i % 4 * 300, y ) } ),
	el( `Root>ProductCard@9#${ i }/2#0`, `Root/9#${ i }`, 'div', `£12.00`, { depth: 4, template: 'ProductCard', imported: true } ),
];
const SHOP = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Shop' ),
	el( 'Root/8#0', 'Root/1#0', 'div', '', { depth: 2 } ),
	...card( 0, 200 ), ...card( 1, 200 ), ...card( 2, 200 ), ...card( 3, 200 ), ...card( 4, 400 ),
];

test( 'MUST FAIL: the shop\'s product grid is WooCommerce\'s product collection holding the site\'s product card, read at the draft\'s first card', () => {
	const { skeleton, proposal, problems } = run( SHOP, { role: 'shop', checkout: null } );
	assert.deepEqual( problems, [] );
	assert.equal( proposal.commerceRegion.key, 'Root/8#0' );
	const pc = find( skeleton, 'woocommerce/product-collection' );
	assert.equal( pc.attributes.query.inherit, true );
	assert.equal( pc.attributes.displayLayout.columns, 4, 'four cards share the first card\'s row at 1440' );
	assert.equal( pc.innerBlocks[ 0 ].name, 'woocommerce/product-template' );
	const cardNode = pc.innerBlocks[ 0 ].innerBlocks[ 0 ];
	assert.equal( cardNode.name, 'sgs/product-card' );
	assert.equal( cardNode.attributes.sourceMode, 'wc-product' );
	assert.deepEqual( cardNode.draftRef, { tpl: 'Root/9#0' }, 'the product card takes the look of the draft\'s first card' );
	assert.ok( find( skeleton, 'sgs/heading' ) );
} );

test( 'no region without the structure: a page surface, a cart with only the drawer\'s lines, words alone, or two candidates', () => {
	const m = ( els ) => inventoryModel( inv( els ) );
	assert.equal( commerceRegion( { m: m( CART ), commerce: null, rule: RULE() } ), null, 'an ordinary page has no commerce role' );
	assert.equal( commerceRegion( { m: m( [ CART[ 0 ], ...DRAWER ] ), commerce: { role: 'cart', checkout: 'Checkout.dc.html' }, rule: RULE() } ), null, 'the drawer\'s lines are the drawer\'s' );
	const words = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', 'Your basket: checkout now' ), el( 'Root/3#0', 'Root/1#0', 'a', 'Checkout', { attrs: { href: 'Checkout.dc.html' }, keep: true } ) ];
	assert.equal( commerceRegion( { m: m( words ), commerce: { role: 'cart', checkout: 'Checkout.dc.html' }, rule: RULE() } ), null, 'words name no order lines' );
	const noPrice = CART.map( ( e ) => ( { ...e, words: e.words.replace( /£/g, '' ), allText: String( e.allText ).replace( /£/g, '' ) } ) );
	assert.equal( commerceRegion( { m: m( noPrice ), commerce: { role: 'cart', checkout: 'Checkout.dc.html' }, rule: RULE() } ), null, 'a loop without a currency amount is no order lines' );
	const twice = [ ...SHOP, el( 'Root/20#0', 'Root/1#0', 'div', '', { depth: 2 } ), ...[ 0, 1 ].flatMap( ( i ) => [ el( `Root/21#${ i }`, 'Root/20#0', 'div', '', { depth: 3, loop: 21, all: '£3.00' } ), el( `Root>ProductCard@21#${ i }/2#0`, `Root/21#${ i }`, 'div', '£3.00', { depth: 4, template: 'ProductCard', imported: true } ) ] ) ];
	assert.match( commerceRegion( { m: m( twice ), commerce: { role: 'shop', checkout: null }, rule: RULE() } ).note, /2 elements read as the shop region/ );
	const hidden = ( e ) => ( { ...e, visible: { 375: false, 768: false, 1440: false } } );
	assert.equal( commerceRegion( { m: m( CART.map( ( e ) => ( 'Root/6#0' === e.key ? hidden( e ) : e ) ) ), commerce: { role: 'cart', checkout: 'Checkout.dc.html' }, rule: RULE() } ), null, 'a checkout link never shown is no evidence' );
	const split = SHOP.map( ( e ) => ( /^Root\/9#[34]$/.test( e.key ) ? { ...e, parentKey: 'Root/30#0' } : e ) ).concat( el( 'Root/30#0', 'Root/1#0', 'div', '', { depth: 2 } ) );
	assert.equal( commerceRegion( { m: m( split ), commerce: { role: 'shop', checkout: null }, rule: RULE() } ), null, 'cards spread over two holders are no one listing' );
	const loose = SHOP.filter( ( e ) => ! e.key.includes( 'ProductCard' ) );
	assert.equal( commerceRegion( { m: m( loose ), commerce: { role: 'shop', checkout: null }, rule: RULE() } ), null, 'a loop of plain prices is no mounted product card' );
} );

test( 'the role comes from the template the surface builds; a checkout link is matched by route, hash or path', () => {
	const rows = [ { postType: 'page', template: 'checkout', route: 'Checkout.dc.html' } ];
	assert.deepEqual( commerceOf( { target: { template: 'cart' } }, rows ), { role: 'cart', checkout: 'Checkout.dc.html' } );
	assert.deepEqual( [ 'archive-product', 'checkout', 'page-my-account' ].map( ( t ) => commerceOf( { target: { template: t } }, rows ).role ), [ 'shop', 'checkout', 'account' ] );
	assert.equal( commerceOf( { target: { postId: 3 } }, rows ), null );
	assert.equal( commerceOf( { target: { template: 'page' } }, rows ), null );
	assert.deepEqual( [ [ 'Checkout.dc.html', 'Checkout.dc.html' ], [ '#/checkout', 'checkout' ], [ '#checkout', 'checkout' ], [ '/shop/checkout/', 'checkout' ], [ '#/cart', 'checkout' ], [ '', 'checkout' ] ].map( ( [ h, r ] ) => leadsTo( h, r ) ), [ true, true, true, true, false, false ] );
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const f = facts();
	const bad = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, commerceRegion: { ...f.decisions.rules.commerceRegion, money: '(', roles: { a: { block: 'core/group' }, b: { block: 'sgs/no-such-block' }, c: { block: 'woocommerce/cart' } } } } } };
	assert.deepEqual( decisionsProblems( bad ).filter( ( p ) => /commerceRegion/.test( p ) ).map( ( p ) => p.split( ' ' ).slice( 0, 3 ).join( ' ' ) ), [ 'rules.commerceRegion.a names core/group,', 'rules.commerceRegion.b names sgs/no-such-block,', 'rules.commerceRegion.money does not' ] );
} );
