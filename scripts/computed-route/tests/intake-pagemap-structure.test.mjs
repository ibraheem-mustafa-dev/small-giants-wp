// Spec 48 FR-48-30: the page map classifies surfaces and pages by what the draft code shows, never by words in a name
// (lib/intake-pagemap-commerce.mjs, lib/intake-pagemap-owners.mjs, lib/intake-pagemap-surfaces.mjs,
// lib/intake-pagemap-regen.mjs). Fixtures: commerce (a bakery whose shop, bag and checkout carry neutral names and
// whose "Store locator" carries a shop word), repeated-header (two pages with the same inline header) and no-header
// (a site-chrome panel and no header).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import * as regen from '../lib/intake-pagemap-regen.mjs';
import { commerceFacts } from '../lib/intake-pagemap-commerce.mjs';
import { loadExport, readRouting } from '../lib/intake-routing.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const shop = proposePageMap( { folder: FIX( 'commerce' ) } );
const byRoute = ( map, route ) => map.rows.find( ( r ) => r.route === route );
const parts = ( row ) => ( row?.parts || [] ).map( ( p ) => `${ p.kind }:${ p.label }:${ p.owner }` );
const rowOf = ( slug, extra = {} ) => ( { slug, title: slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...extra } );

test( 'MUST FAIL: the shop, cart and checkout are read from the draft structure, not route words', () => {
	assert.deepEqual( [ byRoute( shop, 'Range.dc.html' ).postType, byRoute( shop, 'Range.dc.html' ).slug ], [ 'shop', 'shop' ], 'a filtered listing of product cards is the shop' );
	assert.deepEqual( [ byRoute( shop, 'Bag.dc.html' ).template, byRoute( shop, 'Bag.dc.html' ).slug ], [ 'cart', 'cart' ], 'order lines and a link to checkout make the cart' );
	assert.equal( byRoute( shop, 'Checkout.dc.html' ).template, 'checkout', 'payment fields with order lines make the checkout' );
	assert.equal( byRoute( proposePageMap( { folder: FIX( 'shop-files' ) } ), 'Checkout.dc.html' ).template, 'checkout', 'one card autocomplete field is a payment field' );
	assert.deepEqual( [ byRoute( shop, 'Locator.dc.html' ).postType, byRoute( shop, 'Locator.dc.html' ).template ], [ 'page', null ], '"Store locator" is a page' );
	assert.ok( shop.gaps.some( ( g ) => 'Locator.dc.html' === g.draftId && /by its words alone/.test( g.error ) ), 'the word hint is a gap row' );
	assert.equal( shop.rows.filter( ( r ) => 'cart' === r.template ).length, 1, 'no second cart row is added' );
} );

test( 'MUST FAIL: a route reached only from checkout is its endpoint only with order-confirmation evidence', () => {
	assert.deepEqual( parts( byRoute( shop, 'Checkout.dc.html' ) ).filter( ( p ) => p.startsWith( 'endpoint:' ) ), [ 'endpoint:Thank you:woocommerce' ], 'the page its submit leads to is the endpoint' );
	assert.equal( byRoute( shop, 'Terms.dc.html' )?.postType, 'page', 'the terms page linked from the checkout stays a page' );
} );

test( 'MUST FAIL: a drawer of list links (no <nav>) is a nav drawer row; the bag panel stays the cart block\'s', () => {
	assert.deepEqual( shop.rows.filter( ( r ) => 'sgs_drawer' === r.postType ).map( ( r ) => r.slug ), [ 'drawer-menu' ] );
	assert.deepEqual( parts( byRoute( shop, 'Bag.dc.html' ) ), [ 'drawer:Bag:block' ] );
	assert.deepEqual( parts( shop.rows.find( ( r ) => 'sgs_header' === r.postType ) ), [], 'the nav drawer is no part of the site chrome' );
} );

test( 'MUST FAIL: tab strips and accordions are no choice flow; a real one on a WooCommerce page stays its own row', () => {
	assert.deepEqual( shop.rows.filter( ( r ) => 'sgs_choice_flow' === r.postType ).map( ( r ) => r.title ).sort(), [ 'Make it yours', 'Pick a box' ] );
	assert.deepEqual( parts( byRoute( shop, 'Product.dc.html' ) ), [], 'neither the product\'s choice flow nor its tabs are WooCommerce parts' );
} );

test( 'MUST FAIL: each mega panel is named by the opener that sets the state its gate tests', () => {
	assert.deepEqual( shop.rows.filter( ( r ) => 'sgs_mega_menu' === r.postType ).map( ( r ) => r.title ), [ 'Cakes mega menu', 'Breads mega menu' ] );
} );

test( 'MUST FAIL: a header repeated across routed files is the site header; a chrome part with no header row is a gap row', () => {
	const rep = proposePageMap( { folder: FIX( 'repeated-header' ) } );
	assert.deepEqual( rep.rows.filter( ( r ) => 'sgs_header' === r.postType ).map( ( r ) => r.slug ), [ 'header' ] );
	assert.deepEqual( rep.rows.filter( ( r ) => r.route ).flatMap( parts ), [] );
	const bare = proposePageMap( { folder: FIX( 'no-header' ) } );
	assert.deepEqual( bare.rows.flatMap( parts ), [], 'the panel attaches to no page' );
	assert.ok( bare.gaps.some( ( g ) => /no header row to hold it/.test( g.error ) ) );
} );

test( 'MUST FAIL: a mark edits only the listed fields; a dropped row reports its parts; a lost id is named unless dropped', () => {
	const marks = new Map( [ [ 'page:page:a', 'edit:id=99' ], [ 'page:page:b', 'edit:title=Bee' ], [ 'page:page:c', 'drop' ] ] );
	const out = regen.applyMarks( [ rowOf( 'a' ), rowOf( 'b' ), rowOf( 'c', { parts: [ { kind: 'form', label: 'Ask', owner: 'woocommerce', draftId: 'x' } ] } ) ], marks );
	assert.deepEqual( out.rows.map( ( r ) => `${ r.slug }:${ r.id }:${ r.title }` ), [ 'a:null:a', 'b:null:Bee' ] );
	assert.deepEqual( out.refused, [ 'page:page:a: edit:id=99' ] );
	assert.deepEqual( out.lost.map( ( l ) => `${ l.rowId }:${ l.parts.length }` ), [ 'page:page:c:1' ] );
	const current = [ rowOf( 'a', { id: 4 } ), rowOf( 'c', { id: 5 } ), rowOf( 'd', { id: 6 } ) ];
	assert.deepEqual( regen.lostIds?.( current, [ rowOf( 'a', { id: 4 } ) ], marks ), [ 'page:d (id 6)' ], 'c is dropped by the review, d is lost' );
} );

const REAL = ( client ) => path.join( HERE, '..', '..', '..', 'sites', client, 'handoff' );
test( 'real exports: card or numeric payment fields, the submit beside them and an order reference are read from the drafts', { skip: ! fs.existsSync( REAL( 'eye-care-ward-end' ) ) && 'no client exports in this checkout' }, () => {
	const facts = ( client ) => {
		const folder = REAL( client );
		const route = readRouting( { folder } );
		return commerceFacts( loadExport( folder ), new Set( route.routes.map( ( x ) => x.key ) ), route.links );
	};
	const eye = facts( 'eye-care-ward-end' );
	assert.deepEqual( [ eye.get( 'checkout' ).payment, eye.get( 'checkout' ).orderLines, [ ...eye.get( 'checkout' ).submits ] ], [ true, true, [ 'done' ] ], 'three numeric-keypad card fields; Place order sits beside them' );
	assert.equal( eye.get( 'done' ).orderRef, true, '"order EC-10482"' );
	const mamas = facts( 'mamas-munches-redesign' );
	assert.deepEqual( [ mamas.get( 'Checkout.dc.html' ).payment, [ ...mamas.get( 'Checkout.dc.html' ).submits ] ], [ true, [ 'Confirmation.dc.html' ] ], 'cc- autocomplete fields; the pay handler leads to the confirmation' );
	assert.deepEqual( [ mamas.get( 'Basket.dc.html' ).orderLines, mamas.get( 'Basket.dc.html' ).password ], [ true, false ] );
} );
