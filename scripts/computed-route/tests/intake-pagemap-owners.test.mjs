// Spec 48 FR-48-30: the page map classifies each surface by what it is (lib/intake-pagemap.mjs::ownedSurfaces,
// lib/intake-pagemap-surfaces.mjs). Only a site-wide header, footer and nav drawer are layout rows; a block's panel is
// a part of its block's row; a WooCommerce flow's forms, pages and endpoints are WooCommerce's; a choice flow is
// sgs_choice_flow; one mega panel per menu item; a shop client always has the cart, checkout and my-account pages.
// Fixtures: shop-state (one draft routed by state, with an embedded manifest and a surfaces.json hint) and shop-files
// (one draft per page, a shared header component and a checkout page with its own header).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems } from '../lib/intake-pagemap.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const state = proposePageMap( { folder: FIX( 'shop-state' ) } );
const files = proposePageMap( { folder: FIX( 'shop-files' ) } );
const slugsOf = ( map, type ) => map.rows.filter( ( r ) => r.postType === type ).map( ( r ) => r.slug );
const row = ( map, slug ) => map.rows.find( ( r ) => r.slug === slug && /^(page|shop|product)$/.test( r.postType ) );
const parts = ( map, slug ) => ( row( map, slug )?.parts || [] ).map( ( p ) => `${ p.kind }:${ p.label }:${ p.owner }` );

test( 'MUST FAIL (a): one nav drawer row; the bag panel is the cart block\'s and the filter rail the shop\'s', () => {
	assert.deepEqual( slugsOf( state, 'sgs_drawer' ), [ 'drawer-menu-panel' ] );
	assert.deepEqual( parts( state, 'cart' ), [ 'drawer:Your bag:block' ], 'the panel that leads to checkout is the cart block\'s' );
	assert.deepEqual( parts( state, 'shop' ), [ 'drawer:Drawer:woocommerce' ], 'the filter rail sits on the shop page' );
} );

test( 'MUST FAIL (b): one site-owned form row; the sign-in and account forms are WooCommerce\'s my-account forms', () => {
	assert.deepEqual( slugsOf( state, 'sgs_form' ), [ 'form-send-contact' ] );
	assert.deepEqual( parts( state, 'my-account' ), [ 'form:signIn:woocommerce', 'form:saveDetails:woocommerce' ] );
	assert.equal( state.rows.filter( ( r ) => 'my-account' === r.slug ).length, 1, 'the sign-in and account routes are one my-account row' );
} );

test( 'MUST FAIL (c): an overlay of pick lists is a choice flow, not a modal; a plain overlay stays a modal', () => {
	assert.deepEqual( slugsOf( state, 'sgs_choice_flow' ), [ 'choice-flow-add-lenses' ] );
	assert.deepEqual( slugsOf( state, 'sgs_modal' ), [ 'modal-size-guide' ] );
} );

test( 'MUST FAIL (d): one mega panel per menu item that opens one, named by that item', () => {
	assert.deepEqual( state.rows.filter( ( r ) => 'sgs_mega_menu' === r.postType ).map( ( r ) => r.title ), [ 'Frames mega menu', 'Help mega menu' ] );
} );

test( 'MUST FAIL (e): a route reached only from the checkout page is its endpoint, not a page', () => {
	assert.equal( state.rows.some( ( r ) => 'done' === r.route || 'order-received' === r.slug ), false );
	assert.deepEqual( parts( state, 'checkout' ), [ 'endpoint:Order confirmed:woocommerce' ] );
	assert.ok( state.linkMap.filter( ( l ) => 'row' === l.kind && /placeOrder|41:24/.test( l.from ) ).every( ( l ) => 'checkout' === l.slug ), 'its links resolve to the checkout row' );
} );

test( 'MUST FAIL (f): the shop row takes WooCommerce\'s slug and the label of the menu item that links to it', () => {
	const shop = state.rows.find( ( r ) => 'shop' === r.postType );
	assert.deepEqual( [ shop.slug, shop.title ], [ 'shop', 'Frames' ] );
} );

test( 'MUST FAIL: a shop client always has cart, checkout and my-account rows; the cart takes the cart panel\'s label', () => {
	assert.deepEqual( [ row( state, 'cart' ).template, row( state, 'cart' ).title, row( state, 'cart' ).route ], [ 'cart', 'Your bag', undefined ] );
	const bare = proposePageMap( { folder: FIX( 'manifest' ) } );
	assert.deepEqual( [ 'cart', 'checkout', 'my-account' ].map( ( s ) => row( bare, s ) && `${ s }:${ row( bare, s ).template }:${ row( bare, s ).title }` ),
		[ 'cart:cart:Cart', 'checkout:checkout:Checkout', 'my-account:null:Sign in' ] );
	const plain = proposePageMap( { folder: FIX( 'hash' ) } );
	assert.equal( plain.rows.some( ( r ) => [ 'cart', 'checkout', 'my-account' ].includes( r.slug ) ), false, 'a client with no shop gets none' );
} );

test( 'MUST FAIL: a page\'s own header is that page\'s part; the site header is the one header row', () => {
	assert.deepEqual( slugsOf( files, 'sgs_header' ), [ 'header' ] );
	assert.ok( parts( files, 'checkout' ).includes( 'header:Header:woocommerce' ) );
	assert.deepEqual( slugsOf( files, 'sgs_drawer' ), [ 'drawer-menu' ] );
	assert.deepEqual( parts( files, 'cart' ), [ 'drawer:Basket:block' ] );
} );

test( 'MUST FAIL: forms on a page merged into my-account are its forms; the checkout form and the confirmation page are checkout\'s', () => {
	assert.deepEqual( slugsOf( files, 'sgs_form' ), [ 'form-send' ] );
	assert.deepEqual( parts( files, 'my-account' ), [ 'form:saveDetails:woocommerce', 'form:doSignin:woocommerce', 'form:doRegister:woocommerce' ] );
	assert.deepEqual( parts( files, 'checkout' ), [ 'endpoint:Order confirmed:woocommerce', 'form:pay:woocommerce', 'header:Header:woocommerce' ] );
	assert.deepEqual( files.rows.filter( ( r ) => r.route ).map( ( r ) => `${ r.route }:${ r.slug }` ),
		[ 'Account.dc.html:my-account', 'Basket.dc.html:cart', 'Checkout.dc.html:checkout', 'Contact.dc.html:contact', 'Home.dc.html:home', 'Shop.dc.html:shop' ] );
} );

test( 'MUST FAIL: a page section of pick lists is a choice flow', () => {
	assert.deepEqual( files.rows.filter( ( r ) => 'sgs_choice_flow' === r.postType ).map( ( r ) => r.title ), [ 'Build your box' ] );
} );

test( 'MUST FAIL: a hint pairs with the code surface where it sits, and a hint the code does not show is its page\'s note', () => {
	const disagree = state.gaps.filter( ( g ) => 'surfaces-disagree' === g.construct ).map( ( g ) => g.draftId );
	for ( const paired of [ 'aria-label="Menu panel"', 'aria-label="Add lenses"', '<aside>' ] ) {
		assert.ok( ! disagree.some( ( id ) => id.includes( paired ) ), `${ paired } pairs with its hint` );
	}
	assert.ok( disagree.includes( 'surfaces.json S-06' ) );
	assert.deepEqual( parts( state, 'home' ), [ 'form:Newsletter:draft-notes' ] );
} );

test( 'both fixture maps validate', () => {
	assert.deepEqual( pageMapProblems( state.rows ), [] );
	assert.deepEqual( pageMapProblems( files.rows ), [] );
} );
