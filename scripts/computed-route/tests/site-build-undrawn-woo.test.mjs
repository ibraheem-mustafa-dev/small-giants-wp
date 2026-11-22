// FR-48-87 and gap G-1: the site build makes no copy of a WooCommerce cart or checkout template the draft does not draw (a
// draft whose basket is only a drawer), so WooCommerce's own template stands and the build goes on; a drawn one with no
// region block is still refused (lib/site-build-plan.mjs::undrawnWooTemplate, planBuild's template loop).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { planBuild, undrawnWooTemplate } from '../lib/site-build-plan.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const state = () => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [ 'cart', 'checkout' ] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' }, pointers: { header: 0, footer: 0, drawer: 0 }, templateHashes: {}, customTemplates: [],
} );
const repoWith = ( files ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-undrawn-woo-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};
const ROWS = ( ids = {} ) => [ row( { slug: 'cart', title: 'Your bag', template: 'cart', id: ids.cart ?? null } ), row( { slug: 'checkout', title: 'Checkout', template: 'checkout', id: ids.checkout ?? null } ) ];
// A copy holding the theme's cart part: WooCommerce's piece is in the part, but the tree holds no core/post-content.
const PART_ONLY = [ { name: 'core/template-part', attributes: { slug: 'header' } }, { name: 'sgs/container', innerBlocks: [ { name: 'core/template-part', attributes: { slug: 'sgs-cart-content' } } ] } ];
const WITH_REGION = [ { name: 'sgs/container', innerBlocks: [ { name: 'core/post-content' } ] } ];
const UNPLAYED_CART = { target: { template: 'cart' }, copy: { from: 'page', unplayed: 'page:cart' } };
const PLAYED = ( slug ) => ( { target: { template: slug }, copy: { from: 'fill', row: `page:${ slug }` } } );
const planWith = ( files ) => planBuild( { rows: ROWS(), state: state(), repo: repoWith( files ), client: 'c' } );
const refusals = ( p ) => p.problems.filter( ( x ) => /FR-48-87/.test( x ) );
const templates = ( p ) => p.actions.filter( ( a ) => 'template' === a.type ).map( ( a ) => a.template );

test( 'MUST FAIL: a cart template whose surface the manifest marked unplayed is not copied and does not stop the build; the note says WooCommerce\'s own stands', () => {
	const p = planWith( {
		'sites/c/build/surfaces.json': { 'template-cart': UNPLAYED_CART, 'template-checkout': PLAYED( 'checkout' ) },
		'sites/c/build/trees/template/cart.json': PART_ONLY,
		'sites/c/build/trees/template/checkout.json': WITH_REGION,
	} );
	assert.deepEqual( refusals( p ), [], p.problems.join( '\n' ) );
	assert.match( p.notes.join( '\n' ), /template:cart: no draft surface plays the cart template, so WooCommerce's own template stands/ );
	assert.deepEqual( templates( p ), [ 'checkout' ], 'the drawn checkout is still copied' );
	assert.ok( ! ( p.uncopied || [] ).some( ( u ) => 'cart' === u.slug ), 'an undrawn template is not listed as a copy owed' );
} );

test( 'MUST FAIL: with no template surface of its own, a cart template whose rows\' page surfaces are noDraft is not copied', () => {
	const p = planWith( {
		'sites/c/build/surfaces.json': { cart: { target: { postId: 101 }, noDraft: "no draft page: WooCommerce's own cart page keeps its block" }, 'template-checkout': PLAYED( 'checkout' ) },
		'sites/c/build/trees/page/cart.json': PART_ONLY,
		'sites/c/build/trees/template/checkout.json': WITH_REGION,
	} );
	assert.deepEqual( refusals( p ), [], p.problems.join( '\n' ) );
	assert.match( p.notes.join( '\n' ), /template:cart: no draft surface plays the cart template/ );
	assert.ok( ! templates( p ).includes( 'cart' ) );
} );

test( 'NEGATIVE: a drawn cart or checkout copy with no region block still stops the build', () => {
	const p = planWith( {
		'sites/c/build/surfaces.json': { 'template-cart': PLAYED( 'cart' ), 'template-checkout': PLAYED( 'checkout' ) },
		'sites/c/build/trees/template/cart.json': PART_ONLY,
		'sites/c/build/trees/template/checkout.json': PART_ONLY,
	} );
	assert.equal( refusals( p ).length, 2, p.problems.join( '\n' ) );
	assert.match( refusals( p ).join( '\n' ), /the cart template .* holds no core\/post-content/ );
	assert.match( refusals( p ).join( '\n' ), /the checkout template .* holds no core\/post-content/ );
} );

test( 'NEGATIVE: a played template surface wins over its rows\' noDraft entries; a drawn copy holding the region is built', () => {
	const surfaces = { 'template-cart': PLAYED( 'cart' ), cart: { target: { postId: 7 }, noDraft: 'x' } };
	assert.equal( undrawnWooTemplate( 'cart', ROWS(), surfaces ), false );
	const p = planWith( { 'sites/c/build/surfaces.json': surfaces, 'sites/c/build/trees/template/cart.json': WITH_REGION } );
	assert.deepEqual( refusals( p ), [] );
	assert.ok( templates( p ).includes( 'cart' ) );
} );

test( 'undrawnWooTemplate: only cart and checkout; a row with no noDraft page surface, or no row at all, is drawn', () => {
	assert.equal( undrawnWooTemplate( 'archive-product', ROWS(), { 'template-archive-product': { target: { template: 'archive-product' }, copy: { unplayed: 'shop:shop' } } } ), false, 'the shop template is not WooCommerce\'s kept content' );
	assert.equal( undrawnWooTemplate( 'checkout', ROWS(), { 'template-checkout': { target: { template: 'checkout' }, copy: { from: 'page', unplayed: 'page:checkout' } } } ), true );
	assert.equal( undrawnWooTemplate( 'cart', ROWS(), { cart: { target: { postId: 7 } } } ), false, 'a page surface without noDraft is drawn' );
	assert.equal( undrawnWooTemplate( 'cart', ROWS( { cart: 7 } ), { 'page-7': { target: { postId: 7 }, noDraft: 'x' } } ), true, 'a row\'s page surface is found by its post id' );
	assert.equal( undrawnWooTemplate( 'cart', [], {} ), false, 'no row names the template' );
	assert.equal( undrawnWooTemplate( 'cart', ROWS( { cart: 7 } ), { other: { target: { postId: 99 }, noDraft: 'x' } } ), false, 'another row\'s noDraft says nothing about this one' );
} );

test( 'MUST FAIL: a cart copy the clone saved earlier is removed once the draft draws no cart, even while surfaces.json still lists the unplayed surface', () => {
	const st = { ...state(), customTemplates: [ 'cart' ], templateHashes: { cart: 'abc123' }, templateIds: { cart: 55 } };
	const p = planBuild( { rows: ROWS(), state: st, repo: repoWith( { 'sites/c/build/surfaces.json': { 'template-cart': UNPLAYED_CART } } ), client: 'c' } );
	assert.deepEqual( p.actions.filter( ( a ) => 'template-remove' === a.type ).map( ( a ) => a.template ), [ 'cart' ] );
	const played = planBuild( { rows: ROWS(), state: st, repo: repoWith( { 'sites/c/build/surfaces.json': { 'template-cart': PLAYED( 'cart' ) }, 'sites/c/build/trees/template/cart.json': WITH_REGION } ), client: 'c' } );
	assert.deepEqual( played.actions.filter( ( a ) => 'template-remove' === a.type ), [], 'negative control: a drawn cart copy is never removed' );
} );
