// A draft link's destination as a site address (lib/draft-link.mjs, Spec 48 FR-48-6 "Links"): every routing adapter
// (FR-48-26) and link shape the drafts use, resolved through the page map (FR-48-30) to the row's root-relative address; a
// draft route that resolves to nothing is never written as it stands. Then the skeleton writer (lib/skeleton-propose.mjs)
// on small fixture slices: each writer of a link setting writes the address, and MUST FAIL with no draft-link context.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { linkContext, resolveDraftLink, linkWrite, elementFile } from '../lib/draft-link.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { handoverProblems } from '../lib/fill-handover.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const page = ( route, slug, x = {} ) => ( { route, slug, title: slug, parent: null, template: 'page', postType: 'page', ...x } );

// Hash routing: a front page, a child page, a post and a plain page.
const HASH = linkContext( {
	rows: [ page( 'home', 'home', { template: 'front-page' } ), page( 'about', 'about' ), page( 'team', 'team', { parent: 'about' } ), page( 'contact', 'contact' ), { route: 'post-1', slug: 'first-post', postType: 'post', template: 'single' }, { slug: 'enquiry', postType: 'sgs_form' } ],
	routing: { adapter: 'hash', links: [] },
} );
// One file per page, with WooCommerce's pages, a product template, an order confirmation and a sign-in page the page map
// folded into the account row (two draft pages naming one slug).
const FILES = linkContext( {
	rows: [
		page( 'Home.dc.html', 'welcome', { template: 'front-page' } ), page( 'Contact.dc.html', 'contact' ), page( 'Help.dc.html', 'help' ),
		{ route: 'Shop.dc.html', slug: 'shop', postType: 'shop', template: 'archive-product' }, page( 'Basket.dc.html', 'cart', { template: 'cart' } ),
		page( 'Checkout.dc.html', 'checkout', { template: 'checkout' } ), page( 'Account.dc.html', 'my-account' ),
		{ route: 'Product.dc.html', slug: 'product', postType: 'product', template: 'single-product' }, { route: 'Confirmation.dc.html', slug: 'order-confirmation', postType: 'template', template: 'order-confirmation' },
	],
	routing: { adapter: 'files', links: [] },
	routeSlug: { 'Account.dc.html': 'my-account', 'SignIn.dc.html': 'my-account' },
	proposed: [ { route: 'Account.dc.html', slug: 'my-account', postType: 'page' } ],
} );
// State-page routing: links are `#` anchors whose click handler calls the page setter.
const call = ( line, handler, route, x = {} ) => ( { from: `Root.dc.html:${ line }:3 <a>`, call: `onClick="{{ ${ handler } }}"`, route, ...x } );
const STATE = linkContext( {
	rows: [ page( 'home', 'home', { template: 'front-page' } ), { route: 'shop', slug: 'shop', postType: 'shop', template: 'archive-product' }, page( 'lenses', 'prescription-lenses' ), page( 'signin', 'my-account' ) ],
	routing: { adapter: 'state-page', links: [ call( 1, 'goShop', 'shop' ), call( 2, 'goShop', 'shop' ), call( 3, 'item.go', 'shop' ), call( 4, 'item.go', 'lenses' ), call( 5, 'openBag', null, { control: true } ), call( 6, 'goOrders', 'account' ), call( 7, 'goGone', null ) ] },
	routeSlug: { signin: 'my-account', account: 'my-account' },
	proposed: [ { route: 'signin', slug: 'my-account', postType: 'page' } ],
} );
const at = ( href, ctx, o ) => {
	const r = resolveDraftLink( href, ctx, o );
	return [ r.kind, r.value ?? r.owner ?? null ];
};

// The variant table: adapter x shape, each with what the writer must hold.
const VARIANTS = [
	[ 'hash', 'bare page', '#/contact', HASH, {}, [ 'address', '/contact/' ] ],
	[ 'hash', 'child page', '#/team', HASH, {}, [ 'address', '/about/team/' ] ],
	[ 'hash', 'front page', '#/', HASH, {}, [ 'address', '/' ] ],
	[ 'hash', 'post', '#/post-1', HASH, {}, [ 'address', '/first-post/' ] ],
	[ 'hash', 'page with query', '#/contact?topic=trade', HASH, {}, [ 'address', '/contact/' ] ],
	[ 'hash', 'key with no slash', '#contact', HASH, {}, [ 'address', '/contact/' ] ],
	[ 'hash', 'route no row holds', '#/gone', HASH, {}, [ 'unresolved', 'content-page' ] ],
	[ 'hash', 'in-page anchor', '#top', HASH, {}, [ 'anchor', '#top' ] ],
	[ 'files', 'bare page', 'Contact.dc.html', FILES, {}, [ 'address', '/contact/' ] ],
	[ 'files', 'front page', 'Home.dc.html', FILES, {}, [ 'address', '/' ] ],
	[ 'files', 'front page with fragment', 'Home.dc.html#build', FILES, {}, [ 'address', '/#build' ] ],
	[ 'files', 'page with fragment', 'Help.dc.html#delivery', FILES, {}, [ 'address', '/help/#delivery' ] ],
	[ 'files', 'page relative to a subfolder draft', '../Help.dc.html', FILES, { file: 'parts/Footer.dc.html' }, [ 'address', '/help/' ] ],
	[ 'files', 'shop page', 'Shop.dc.html', FILES, {}, [ 'address', '/shop/' ] ],
	[ 'files', 'cart page', 'Basket.dc.html', FILES, {}, [ 'address', '/cart/' ] ],
	[ 'files', 'checkout page', 'Checkout.dc.html', FILES, {}, [ 'address', '/checkout/' ] ],
	[ 'files', 'account page', 'Account.dc.html?order=', FILES, {}, [ 'address', '/my-account/' ] ],
	[ 'files', 'sign-in page folded into the account row', 'SignIn.dc.html', FILES, {}, [ 'address', '/my-account/' ] ],
	[ 'files', 'sign-in mode query', 'SignIn.dc.html?mode=register', FILES, {}, [ 'address', '/my-account/' ] ],
	[ 'files', 'product id', 'Product.dc.html?id=box', FILES, {}, [ 'unresolved', 'product-data' ] ],
	[ 'files', 'product id with an option', 'Product.dc.html?id=box&sub=1', FILES, {}, [ 'unresolved', 'product-data' ] ],
	[ 'files', 'order confirmation (no page)', 'Confirmation.dc.html', FILES, {}, [ 'unresolved', 'content-page' ] ],
	[ 'files', 'page file no row holds', 'Gone.dc.html', FILES, {}, [ 'unresolved', 'content-page' ] ],
	[ 'files', 'in-page anchor', '#reviews', FILES, {}, [ 'anchor', '#reviews' ] ],
	[ 'state-page', 'go() with a literal page', '#', STATE, { file: 'Root.dc.html', handler: '{{ goShop }}' }, [ 'address', '/shop/' ] ],
	[ 'state-page', 'go() to a route folded into the account row', '#', STATE, { file: 'Root.dc.html', handler: '{{ goOrders }}' }, [ 'address', '/my-account/' ] ],
	[ 'state-page', 'go() per loop item (two pages)', '#', STATE, { file: 'Root.dc.html', handler: '{{ item.go }}' }, [ 'none', null ] ],
	[ 'state-page', 'in-page control', '#', STATE, { file: 'Root.dc.html', handler: '{{ openBag }}' }, [ 'none', null ] ],
	[ 'state-page', 'go() to no route', '#', STATE, { file: 'Root.dc.html', handler: '{{ goGone }}' }, [ 'none', null ] ],
	[ 'state-page', 'go() of another draft file', '#', STATE, { file: 'Other.dc.html', handler: '{{ goShop }}' }, [ 'none', null ] ],
	[ 'any', 'web address', 'https://example.org/p?q=1', FILES, {}, [ 'external', 'https://example.org/p?q=1' ] ],
	[ 'any', 'mailto', 'mailto:hello@example.org', HASH, {}, [ 'external', 'mailto:hello@example.org' ] ],
	[ 'any', 'tel', 'tel:01000000000', STATE, {}, [ 'external', 'tel:01000000000' ] ],
	[ 'any', 'root-relative address', '/delivery/', FILES, {}, [ 'site', '/delivery/' ] ],
	[ 'any', 'bare #', '#', HASH, {}, [ 'none', null ] ],
	[ 'any', 'asset path', 'assets/brochure.pdf', FILES, {}, [ 'other', 'assets/brochure.pdf' ] ],
];

test( `the variant table: ${ VARIANTS.length } adapter x shape rows resolve to the row's site address, or to nothing`, () => {
	for ( const [ adapter, shape, href, ctx, o, want ] of VARIANTS ) {
		assert.deepEqual( at( href, ctx, o ), want, `${ adapter } ${ shape }: ${ href }` );
	}
} );

test( 'a dropped query and an ambiguous handler say so; a loop handler names its pages', () => {
	assert.equal( resolveDraftLink( 'SignIn.dc.html?mode=register', FILES ).dropped, '?mode=register' );
	assert.equal( resolveDraftLink( 'Contact.dc.html', FILES ).dropped, undefined );
	assert.deepEqual( resolveDraftLink( '#', STATE, { file: 'Root.dc.html', handler: '{{ item.go }}' } ).routes, [ 'shop', 'lenses' ] );
	assert.equal( resolveDraftLink( '#', STATE, { file: 'Root.dc.html', handler: '{{ goGone }}' } ).routes, undefined );
	assert.match( resolveDraftLink( 'Product.dc.html?id=box', FILES ).why, /"box"/ );
} );

test( 'MUST FAIL: with no page map every draft route resolves to nothing, never to itself (negative control: external, anchor and # keep their reading)', () => {
	for ( const href of [ '#/contact', '#/', 'Contact.dc.html', 'Home.dc.html#build', 'Product.dc.html?id=box' ] ) {
		const r = resolveDraftLink( href, null );
		assert.equal( r.kind, 'unresolved', href );
		assert.equal( linkWrite( r, href ).value, null, `${ href } is not written` );
	}
	assert.deepEqual( at( 'https://example.org/', null ), [ 'external', 'https://example.org/' ] );
	assert.deepEqual( at( '#top', null ), [ 'anchor', '#top' ] );
	assert.deepEqual( at( '#', null ), [ 'none', null ] );
} );

test( 'linkWrite: an address is written, a dropped query and an unresolved route each make one valid handover row', () => {
	assert.deepEqual( linkWrite( resolveDraftLink( '#/contact', HASH ), '#/contact' ), { value: '/contact/', handover: null } );
	const q = linkWrite( resolveDraftLink( 'SignIn.dc.html?mode=register', FILES ), 'SignIn.dc.html?mode=register' );
	assert.equal( q.value, '/my-account/' );
	assert.equal( q.handover.owner, 'behaviour' );
	const p = linkWrite( resolveDraftLink( 'Product.dc.html?id=box', FILES ), 'Product.dc.html?id=box' );
	assert.equal( p.value, null );
	assert.deepEqual( [ p.handover.owner, p.handover.kind ], [ 'product-data', 'link' ] );
	assert.match( p.handover.detail, /Product\.dc\.html\?id=box/ );
	assert.deepEqual( handoverProblems( [ q.handover, p.handover ], 'fixture' ), [] );
} );

// The writer, on fixture slices in the inventory's shape (as tests/skeleton-rules.test.mjs builds them).
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const words = node.o.words || '';
		const el = { key: `Root/${ id }#0`, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: node.o.attrs || {}, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: node.o.snippet || `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		el.allText = [ words, ...node.kids.map( ( k ) => walk( k, el.key, depth + 1 ) ) ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const propose = ( root, draftLinks ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, factRecord: null, draftLinks } );
const rowOf = ( r, words ) => r.proposal.rows.find( ( x ) => x.words === words );
const handovers = ( r ) => {
	const all = [];
	const walk = ( n ) => {
		all.push( ...( n.handover || [] ) );
		( n.innerBlocks || [] ).forEach( walk );
	};
	r.skeleton.forEach( walk );
	return all;
};
const section = ( kids ) => E( 'section', {}, kids );
const goLink = ( handler, words ) => E( 'a', { words, attrs: { href: '#' }, snippet: `<a href="#" sc-camel-on-click="{{ ${ handler } }}" data-dc-tpl="9">${ words }</a>` } );

test( 'the writer: a lone link, a whole-card link and a card\'s call to action each hold the site address; MUST FAIL with no draft-link context', () => {
	const tree = section( [
		E( 'a', { words: 'Talk to us', attrs: { href: '#/contact' } } ),
		E( 'a', { attrs: { href: '#/team' } }, [ E( 'span', { words: 'Our team' } ), E( 'span', { words: 'The people behind the work' } ) ] ),
	] );
	const r = propose( tree, HASH );
	assert.equal( rowOf( r, 'Talk to us' ).attributes.url, '/contact/' );
	const card = r.proposal.rows.find( ( x ) => 'a' === x.tag && ! x.words );
	assert.equal( card.attributes.sgsBlockLink, '/about/team/' );
	const off = propose( tree, null );
	assert.equal( rowOf( off, 'Talk to us' ).attributes.url, undefined, 'with no page map the draft route is not written' );
	assert.equal( off.proposal.rows.find( ( x ) => 'a' === x.tag && ! x.words ).attributes.sgsBlockLink, undefined );
	assert.ok( handovers( off ).some( ( h ) => 'content-page' === h.owner && /#\/contact/.test( h.detail ) ), 'the unresolved route is handed over' );
	const action = propose( section( [ E( 'a', { attrs: { href: 'Help.dc.html#delivery' } }, [ E( 'h3', { words: 'Delivery' } ), E( 'p', { words: 'When your order arrives' } ), E( 'div', { words: 'Read more' } ) ] ) ] ), FILES );
	assert.equal( rowOf( action, 'Read more' ).attributes.url, '/help/#delivery' );
} );

test( 'the writer: a product link is not written and is handed over to product data; an external link and an in-page anchor stay as they are (negative control)', () => {
	const r = propose( section( [ E( 'a', { words: 'Shop the box', attrs: { href: 'Product.dc.html?id=box' } } ), E( 'a', { words: 'Follow us', attrs: { href: 'https://example.org/us' } } ), E( 'a', { words: 'See reviews', attrs: { href: '#reviews' } } ) ] ), FILES );
	assert.equal( rowOf( r, 'Shop the box' ).attributes.url, undefined );
	assert.ok( handovers( r ).some( ( h ) => 'product-data' === h.owner && /id=box/.test( h.detail ) ) );
	assert.equal( rowOf( r, 'Follow us' ).attributes.url, 'https://example.org/us' );
	assert.equal( rowOf( r, 'See reviews' ).attributes.url, '#reviews' );
	assert.deepEqual( handoverProblems( handovers( r ), 'fixture' ), [] );
} );

test( 'the writer: a # link whose click handler calls go() with one page holds that page; a per-item handler stays empty and names its pages; MUST FAIL with no context', () => {
	const tree = section( [ goLink( 'goShop', 'Shop now' ), goLink( 'item.go', 'Browse' ) ] );
	const r = propose( tree, STATE );
	assert.equal( rowOf( r, 'Shop now' ).attributes.url, '/shop/' );
	assert.equal( rowOf( r, 'Browse' ).attributes.url, undefined );
	assert.ok( handovers( r ).some( ( h ) => /"shop", "lenses"/.test( h.detail ) ) );
	assert.equal( rowOf( propose( tree, null ), 'Shop now' ).attributes.url, undefined );
} );

test( 'the writer: a link list\'s items hold their pages\' addresses, a fragment kept; MUST FAIL with no context', () => {
	const list = E( 'div', {}, [ E( 'a', { words: 'Delivery', y: 0, attrs: { href: 'Help.dc.html#delivery' } } ), E( 'a', { words: 'Basket', y: 30, attrs: { href: 'Basket.dc.html' } } ), E( 'a', { words: 'Home', y: 60, attrs: { href: 'Home.dc.html' } } ) ] );
	const items = ( r ) => r.skeleton.find( ( n ) => 'sgs/icon-list' === n.name )?.attributes.items.map( ( i ) => i.url ?? null );
	assert.deepEqual( items( propose( list, FILES ) ), [ '/help/#delivery', '/cart/', '/' ] );
	assert.deepEqual( items( propose( list, null ) ), [ null, null, null ] );
} );

// A single-file draft: the served inventory names the entry component's host `Root`, the routing intake read names the real
// draft file, so a handler is matched under the entry draft's file (propose's `rootComponent`).
const ENTRY = 'Eye Care Birmingham';
const fromEntry = ( line, handler, route, x = {} ) => ( { from: `${ ENTRY }.dc.html:${ line }:3 <a>`, call: `onClick="{{ ${ handler } }}"`, route, ...x } );
const SINGLE = linkContext( {
	rows: [ page( 'home', 'home', { template: 'front-page' } ), { route: 'shop', slug: 'shop', postType: 'shop', template: 'archive-product' }, page( 'lenses', 'prescription-lenses' ), page( 'signin', 'my-account' ) ],
	routing: { adapter: 'state-page', links: [ fromEntry( 1, 'goShop', 'shop' ), fromEntry( 2, 'openAccount', 'account' ), fromEntry( 3, 'openAccount', 'signin' ), fromEntry( 4, 'pickLens', 'shop' ), fromEntry( 5, 'pickLens', 'lenses' ), fromEntry( 6, 'openMenu', 'lenses' ), fromEntry( 7, 'openMenu', 'signin' ), fromEntry( 8, 'goGone', null ), fromEntry( 9, 'openBag', null, { control: true } ), fromEntry( 10, 'lensView', 'lenses' ), fromEntry( 11, 'lensView', 'lensTabs' ), fromEntry( 12, 'maybeShop', 'shop' ), fromEntry( 13, 'maybeShop', 'ghost' ) ] },
	routeSlug: { signin: 'my-account', account: 'my-account', lensTabs: 'prescription-lenses' },
	proposed: [ { route: 'signin', slug: 'my-account', postType: 'page' }, { route: 'lensTabs', slug: 'prescription-lenses', postType: 'page' } ],
} );
const proposeSingle = ( root, extra = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, factRecord: null, draftLinks: SINGLE, rootComponent: ENTRY, ...extra } );
const handlerButton = ( handler, words ) => E( 'button', { words, snippet: `<button sc-camel-on-click="{{ ${ handler } }}" data-dc-tpl="9">${ words }</button>` } );

test( 'MUST FAIL: on a single-file draft a handler is matched under the entry draft\'s real file, so a go() link holds its page (negative control: no entry component leaves it empty)', () => {
	const tree = section( [ goLink( 'goShop', 'Shop now' ) ] );
	assert.equal( rowOf( proposeSingle( tree ), 'Shop now' ).attributes.url, '/shop/' );
	assert.equal( rowOf( proposeSingle( tree, { rootComponent: null } ), 'Shop now' ).attributes.url, undefined, 'without the entry component the host "Root" matches no routed file' );
	assert.equal( elementFile( { template: 'Root' }, ENTRY ), `${ ENTRY }.dc.html` );
	assert.equal( elementFile( { template: 'Footer' }, ENTRY ), 'Footer.dc.html', 'another component keeps its own file' );
} );

test( 'MUST FAIL: a handler button with no href holds the page its handler reaches, and one that reaches none says so in a handover row', () => {
	const r = proposeSingle( section( [ handlerButton( 'goShop', 'Browse the shop' ), handlerButton( 'goGone', 'Dead end' ), handlerButton( 'openBag', 'Bag' ), handlerButton( 'unknownHandler', 'Mystery' ) ] ) );
	assert.equal( rowOf( r, 'Browse the shop' ).attributes.url, '/shop/' );
	assert.equal( rowOf( r, 'Dead end' ).attributes.url, undefined );
	assert.ok( handovers( r ).some( ( h ) => 'behaviour' === h.owner && 'link' === h.kind && /goGone/.test( h.detail ) ), 'the unresolved handler button is a handover row' );
	assert.equal( handovers( r ).filter( ( h ) => /openBag|unknownHandler/.test( h.detail ) ).length, 0, 'a control, or a handler the routing never read, is no link and writes no row (negative control)' );
	assert.deepEqual( handoverProblems( handovers( r ), 'fixture' ), [] );
} );

test( 'MUST FAIL: an account trigger whose routes reach the sign-in and account views links to the account page; a trigger reaching two other pages stays empty', () => {
	const tree = section( [ goLink( 'openAccount', 'Account' ), goLink( 'pickLens', 'Pick' ), goLink( 'openMenu', 'Menu' ) ] );
	const r = proposeSingle( tree );
	assert.equal( rowOf( r, 'Account' ).attributes.url, '/my-account/' );
	assert.equal( rowOf( r, 'Pick' ).attributes.url, undefined, 'shop or lenses by the item clicked: no single page' );
	assert.equal( rowOf( r, 'Menu' ).attributes.url, '/my-account/', 'a trigger whose routes include the account page links to it' );
	const same = proposeSingle( section( [ goLink( 'lensView', 'Lens views' ), goLink( 'maybeShop', 'Maybe' ) ] ) );
	assert.equal( rowOf( same, 'Lens views' ).attributes.url, '/prescription-lenses/', 'two routes of one page-map row reach that row' );
	assert.equal( rowOf( same, 'Maybe' ).attributes.url, undefined, 'a route no row holds among the routes leaves the link empty (negative control)' );
} );
