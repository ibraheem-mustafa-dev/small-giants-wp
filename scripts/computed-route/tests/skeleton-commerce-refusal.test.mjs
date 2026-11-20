// Spec 48 FR-48-87 (audit register A6): a commerce-role surface (cart, checkout, account, shop) with no recognised commerce
// region is refused, never built as a static imitation of WooCommerce's form. The skeleton writer raises a problem row;
// Fill and the site build refuse a tree that holds no region block. Tests marked MUST FAIL fail before the refusal.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { noRegionProblem, commerceRefusal, rowCommerceRole, surfaceRefusal, treeHoldsBlock } from '../lib/skeleton-commerce-refusal.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const box = { x: 0, y: 0, w: 300, h: 100 };
const el = ( n, parent, tag, words = '', x = {} ) => ( {
	key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: n, attrs: x.attrs || {}, words, allText: x.all ?? words,
	membership: x.loop ? [ { kind: 'sc-for', value: 'items', tpl: String( x.loop ) } ] : [], srcTag: tag, snippet: `<${ tag }${ Object.entries( x.attrs || {} ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' ) }>`,
	visible: { 375: true, 768: true, 1440: true }, box: { 375: box, 768: box, 1440: box }, display: 'block', widths: [ 375, 768, 1440 ], flexDirection: 'row', position: {}, own: {},
} );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements, commerce ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'basket', commerce, db } );

// A basket page with a heading and a note and no order-lines loop: nothing reads as the cart region.
const BARE = [ el( 1, null, 'div', '', { depth: 0 } ), el( 2, 1, 'h1', 'Your basket' ), el( 3, 1, 'p', 'Your basket is empty' ) ];
// The same page holding an order-lines loop and its checkout link: the region is found.
const line = ( n, price ) => [ el( n, 4, 'div', '', { depth: 3, loop: 9, all: `Item £${ price }.00` } ), el( n + 1, n, 'div', `£${ price }.00`, { depth: 4, loop: 9 } ) ];
const WITH_REGION = [
	el( 1, null, 'div', '', { depth: 0 } ), el( 2, 1, 'h1', 'Your basket' ), el( 3, 1, 'div', '', { depth: 1 } ), el( 4, 3, 'div', '', { depth: 2 } ),
	...line( 10, 5 ), ...line( 12, 8 ),
	el( 5, 3, 'aside', '', { depth: 2 } ), el( 6, 5, 'a', 'Checkout securely', { depth: 3, attrs: { href: 'Checkout.dc.html' } } ),
];
const CART = { role: 'cart', checkout: 'Checkout.dc.html' };

test( 'MUST FAIL: a cart surface whose draft shows no order lines loop raises a problem row naming the missing region', () => {
	const { problems, proposal } = run( BARE, CART );
	assert.equal( proposal.commerceRegion, undefined, 'no region was found' );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /basket: the cart surface has no commerce region \(no element of the draft reads as it\).*FR-48-87/ );
} );

test( 'NEGATIVE: a cart surface with a recognised region and a surface with no commerce role raise no problem', () => {
	assert.deepEqual( run( WITH_REGION, CART ).problems, [] );
	assert.deepEqual( run( BARE, null ).problems, [] );
} );

test( 'MUST FAIL: a region the writer found twice (so replaced neither) is a problem carrying its note; a found region is none', () => {
	assert.match( noRegionProblem( { surface: 's', commerce: { role: 'shop' }, region: { note: '2 elements read as the shop region (a, b), so none is replaced' } } ), /s: the shop surface has no commerce region \(2 elements read as the shop region/ );
	assert.equal( noRegionProblem( { surface: 's', commerce: { role: 'shop' }, region: { key: 'Root/3#0' } } ), null );
	assert.equal( noRegionProblem( { surface: 's', commerce: null, region: null } ), null );
} );

const ROLES = { cart: { block: 'core/post-content' }, account: { block: 'sgs/account' }, shop: { block: 'woocommerce/product-collection' } };
test( 'MUST FAIL: a tree of a commerce-role surface with no region block is refused; one holding it (at any depth), a role with no block and no role are not', () => {
	const bare = [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/heading' } ] } ];
	const held = [ { name: 'sgs/container', innerBlocks: [ { name: 'core/post-content' } ] } ];
	assert.match( commerceRefusal( { role: 'cart', tree: bare, roles: ROLES, what: 'surface "basket"' } ), /surface "basket" is a cart surface .* holds no core\/post-content.*FR-48-87/ );
	assert.equal( commerceRefusal( { role: 'cart', tree: held, roles: ROLES, what: 'x' } ), null );
	assert.equal( commerceRefusal( { role: 'checkout', tree: bare, roles: ROLES, what: 'x' } ), null, 'a role the rule gives no block' );
	assert.equal( commerceRefusal( { role: null, tree: bare, roles: ROLES, what: 'x' } ), null );
	assert.equal( treeHoldsBlock( held, 'core/post-content' ), true );
	assert.equal( treeHoldsBlock( bare, 'core/post-content' ), false );
} );

test( 'rowCommerceRole: the account page is the account; the shop, cart, checkout and any other row none (the shop and product category rows build the shop template, checked by its slug)', () => {
	const role = ( o ) => rowCommerceRole( { slug: 'x', template: null, ...o } );
	assert.equal( role( { postType: 'page', slug: 'my-account' } ), 'account' );
	assert.equal( role( { postType: 'shop' } ), null );
	assert.equal( role( { postType: 'page', template: 'cart' } ), null, 'WooCommerce keeps the cart page own content' );
	assert.equal( role( { postType: 'page', slug: 'about' } ), null );
} );

function repoWith( files ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'commerce-refusal-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
}

test( 'MUST FAIL: Fill\'s check reads the page map for the surface\'s commerce role and refuses a skeleton with no region block', () => {
	const repo = repoWith( { 'sites/c/build/page-map.json': [ { slug: 'checkout', postType: 'page', template: 'checkout', route: 'Checkout.dc.html', id: 5 } ] } );
	const entry = { target: { template: 'cart' } };
	const bare = [ { name: 'sgs/heading' } ];
	assert.match( surfaceRefusal( { repo, client: 'c', entry, tree: bare, surface: 'template-cart' } ), /surface "template-cart" is a cart surface/ );
	assert.equal( surfaceRefusal( { repo, client: 'c', entry, tree: [ { name: 'core/post-content' } ], surface: 'template-cart' } ), null );
	const mapRepo = repoWith( { 'sites/c/build/page-map.json': [ { slug: 'my-account', postType: 'page', template: null, route: 'Account.dc.html', id: 9 } ] } );
	assert.match( surfaceRefusal( { repo: mapRepo, client: 'c', entry: { target: { postId: 9 } }, tree: bare, surface: 'my-account' } ), /surface "my-account" is a account surface .* holds no sgs\/account/, 'the account page is told by its page-map row' );
	assert.equal( surfaceRefusal( { repo, client: 'c', entry: { target: { template: 'page' } }, tree: bare, surface: 'about' } ), null, 'not a commerce surface' );
	assert.equal( surfaceRefusal( { repo: repoWith( {} ), client: 'c', entry: { target: { template: 'archive-product' } }, tree: bare, surface: 'shop' } ).includes( 'shop surface' ), true, 'no page map: the template still names the role' );
} );

const prow = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const state = () => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' }, pointers: { header: 0, footer: 0, drawer: 0 }, templateHashes: {}, customTemplates: [],
} );
test( 'MUST FAIL: the site build refuses a shop or account row whose stage 3 tree holds no region block; a placeholder and a tree holding it plan', () => {
	const rows = [ prow( { slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', collection: 'live' } ), prow( { slug: 'my-account', title: 'My account' } ) ];
	const planWith = ( shop, account ) => planBuild( { rows, state: state(), repo: repoWith( {
		...( shop ? { 'sites/c/build/trees/shop/shop.json': shop } : {} ), ...( account ? { 'sites/c/build/trees/page/my-account.json': account } : {} ),
	} ), client: 'c' } );
	const bare = [ { name: 'sgs/heading', attributes: { content: 'Shop' } } ];
	const refused = planWith( bare, bare );
	assert.equal( refused.problems.filter( ( p ) => /FR-48-87/.test( p ) ).length, 2, refused.problems.join( '\n' ) );
	assert.match( refused.problems.join( '\n' ), /shop:shop: the archive-product template .* holds no woocommerce\/product-collection/ );
	assert.match( refused.problems.join( '\n' ), /page:my-account: .* holds no sgs\/account/ );
	const ok = planWith( [ { name: 'sgs/container', innerBlocks: [ { name: 'woocommerce/product-collection' } ] } ], [ { name: 'sgs/account' } ] );
	assert.deepEqual( ok.problems.filter( ( p ) => /FR-48-87/.test( p ) ), [] );
	assert.deepEqual( planWith( null, null ).problems.filter( ( p ) => /FR-48-87/.test( p ) ), [], 'no tree: the placeholder is built, no imitation' );
} );
