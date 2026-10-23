// FR-48-55 parts 1 and 6 and FR-48-56 for a shop client's page map: shop, product and product_cat rows, the four
// WooCommerce page options, the site's own template copies, WooCommerce's default pages, and several layout rows of one
// kind (each MUST FAIL when its rule breaks).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chooseActive } from '../lib/site-build-map.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase, wpBuildPage } from '../lib/site-build-apply.mjs';
import { ROW_META, TEMPLATE_OPTION, statePhp } from '../lib/site-build-state.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const SHOP = () => [
	row( { slug: 'home', title: 'Home', route: 'home', menus: [ { menu: 'header', position: 2, parentItem: null } ] } ),
	row( { slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', collection: 'live', menus: [ { menu: 'header', position: 1, parentItem: null } ] } ),
	row( { slug: 'product', title: 'Product', postType: 'product', template: 'single-product', collection: 'live', menus: [ { menu: 'header', position: 3, parentItem: null } ] } ),
	row( { slug: 'basket', title: 'Basket', template: 'cart' } ),
	row( { slug: 'checkout', title: 'Checkout', template: 'checkout' } ),
	row( { slug: 'account', title: 'My account' } ),
	row( { slug: 'header', title: 'Header', route: undefined, postType: 'sgs_header' } ),
].map( ( r ) => Object.fromEntries( Object.entries( r ).filter( ( [ , v ] ) => undefined !== v ) ) );

const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [ 'cart', 'checkout' ] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/', woocommerce_shop_page_id: '6', woocommerce_cart_page_id: '7', woocommerce_checkout_page_id: '8', woocommerce_myaccount_page_id: '9' },
	pointers: { header: 0, footer: 0, drawer: 0 }, templateHashes: {}, customTemplates: [], ...o,
} );
const plan = ( rows, st = state(), extra = {} ) => planBuild( { rows, state: st, repo: os.tmpdir(), client: 'none', decisions: {}, ...extra } );
const repoWith = ( files ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-shop-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};

test( 'shop, product and product_cat rows plan with no stop: a page for the shop row, no post for product or product_cat', () => {
	const rows = [ ...SHOP(), row( { slug: 'frames', title: 'Frames', postType: 'product_cat', template: 'archive-product', collection: 'live' } ) ];
	const p = plan( rows );
	assert.deepEqual( p.problems, [] );
	const creates = p.actions.filter( ( a ) => 'create' === a.type );
	assert.deepEqual( creates.map( ( a ) => [ a.key, a.postType ] ).filter( ( [ k ] ) => /shop|product/.test( k ) ), [ [ 'shop:shop', 'page' ] ] );
	assert.ok( ! creates.some( ( a ) => /^product/.test( a.key ) ) );
	assert.match( p.notes.join( '\n' ), /product_cat:frames: names the archive-product template, which shop:shop builds/ );
} );

test( 'the four WooCommerce page options take the shop, cart, checkout and account rows, in the option table', () => {
	const p = plan( SHOP() );
	const opt = ( n ) => p.actions.find( ( a ) => 'option' === a.type && a.name === n );
	assert.deepEqual( opt( 'woocommerce_shop_page_id' ).value, { ref: 'post:shop:shop' } );
	assert.deepEqual( opt( 'woocommerce_cart_page_id' ).value, { ref: 'post:page:basket' } );
	assert.deepEqual( opt( 'woocommerce_checkout_page_id' ).value, { ref: 'post:page:checkout' } );
	assert.deepEqual( opt( 'woocommerce_myaccount_page_id' ).value, { ref: 'post:page:account' } );
	assert.deepEqual( p.options.filter( ( o ) => o.name.startsWith( 'woocommerce_' ) ).map( ( o ) => o.before ), [ '6', '7', '8', '9' ] );
} );

test( 'a client with no shop rows gets no WooCommerce option', () => {
	const p = plan( SHOP().filter( ( r ) => ! [ 'shop', 'product' ].includes( r.postType ) ) );
	assert.deepEqual( p.actions.filter( ( a ) => 'option' === a.type && /^woocommerce/.test( a.name ) ), [] );
} );

test( 'a role with no row leaves its option and says so', () => {
	const p = plan( SHOP().filter( ( r ) => 'basket' !== r.slug ) );
	assert.ok( ! p.actions.some( ( a ) => 'woocommerce_cart_page_id' === a.name ) );
	assert.match( p.notes.join( '\n' ), /no page row is the cart page; woocommerce_cart_page_id is left as it is/ );
} );

test( 'the shop and product rows build the site\'s own templates, once; a changed tree rebuilds only that template', () => {
	const first = plan( SHOP() );
	const builds = first.actions.filter( ( a ) => 'template' === a.type );
	assert.deepEqual( builds.map( ( a ) => a.template ), [ 'archive-product', 'single-product' ] );
	assert.deepEqual( builds[ 1 ].hashes, { 'archive-product': builds[ 0 ].hash, 'single-product': builds[ 1 ].hash } );
	assert.ok( first.options.some( ( o ) => o.name === `${ TEMPLATE_OPTION }[single-product]` && '(none)' === o.before ) );
	const built = state( { templateHashes: builds[ 1 ].hashes } );
	assert.deepEqual( plan( SHOP(), built ).actions.filter( ( a ) => 'template' === a.type ), [] );
	const repo = repoWith( { 'sites/c/build/trees/product/product.json': [ { name: 'sgs/heading', attributes: { content: 'Changed' } } ] } );
	const again = planBuild( { rows: SHOP(), state: built, repo, client: 'c', decisions: {} } );
	assert.deepEqual( again.actions.filter( ( a ) => 'template' === a.type ).map( ( a ) => [ a.template, a.say.split( ': ' )[ 1 ].split( ' ' )[ 0 ] ] ), [ [ 'single-product', 'rebuild' ] ] );
} );

test( 'a saved template copy the site build did not make stops the run and names the way out', () => {
	const p = plan( SHOP(), state( { customTemplates: [ 'single-product' ] } ) );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /product:product: the site already holds its own saved copy of the single-product template.*Clear customisations/ );
} );

test( 'WooCommerce\'s own default page for a role is taken over and marked; any other holder still stops the run', () => {
	const held = { 'page:checkout': [ 8 ], 'page:account': [ 15 ] };
	const p = plan( SHOP(), state( { holders: held, posts: { 8: { id: 8, type: 'page', slug: 'checkout', title: 'Checkout', status: 'publish', parent: 0, template: '', rowKey: '', treeHash: '' } } } ) );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /page:account: post 15 already holds this page slug/ );
	const ok = plan( SHOP(), state( { holders: { 'page:checkout': [ 8 ] }, posts: { 8: { id: 8, type: 'page', slug: 'checkout', title: 'Checkout', status: 'publish', parent: 0, template: '', rowKey: '', treeHash: '' } } } ) );
	assert.deepEqual( ok.problems, [] );
	assert.deepEqual( ok.actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => [ a.key, a.id, a.mark ] ), [ [ 'page:checkout', 8, true ] ] );
	assert.ok( ! ok.actions.some( ( a ) => 'create' === a.type && 'page:checkout' === a.key ) );
	assert.ok( ok.actions.some( ( a ) => 'build' === a.type && 'page:checkout' === a.key ) );
} );

test( 'a shop row\'s page is never given a page template; product and product_cat rows add no menu item', () => {
	const p = plan( SHOP() );
	const shop = p.actions.find( ( a ) => 'create' === a.type && 'shop:shop' === a.key );
	assert.deepEqual( shop.fields, {} );
	assert.match( p.notes.join( '\n' ), /product:product: a product row makes no post/ );
	assert.deepEqual( p.actions.filter( ( a ) => 'item-add' === a.type ).map( ( a ) => a.position ), [ 1, 2 ] );
} );

test( 'the front page falls back to the page row whose slug is home', () => {
	const rows = SHOP().map( ( r ) => ( 'home' === r.slug ? { ...r, route: 'Home.dc.html' } : r ) );
	assert.deepEqual( plan( rows ).actions.find( ( a ) => 'page_on_front' === a.name )?.value, { ref: 'post:page:home' } );
} );

const LAYOUT = () => [
	row( { slug: 'checkout', title: 'Checkout', template: 'checkout' } ),
	row( { slug: 'header-checkout', title: 'Header', route: undefined, postType: 'sgs_header' } ),
	row( { slug: 'header-site-header', title: 'Header', route: undefined, postType: 'sgs_header' } ),
	row( { slug: 'drawer-menu', title: 'Menu', route: undefined, postType: 'sgs_drawer' } ),
	row( { slug: 'drawer-basket', title: 'Basket', route: undefined, postType: 'sgs_drawer' } ),
	row( { slug: 'basket', title: 'Basket' } ),
].map( ( r ) => Object.fromEntries( Object.entries( r ).filter( ( [ , v ] ) => undefined !== v ) ) );

test( 'several layout rows of one kind: the owner\'s decision, else the one not named for a page, and the choice is noted', () => {
	const rows = LAYOUT();
	const pointer = ( p, area ) => p.actions.find( ( a ) => 'pointer' === a.type && a.area === area )?.id;
	const byDefault = plan( rows );
	assert.deepEqual( byDefault.problems, [] );
	assert.deepEqual( [ pointer( byDefault, 'header' ), pointer( byDefault, 'drawer' ) ], [ { ref: 'post:sgs_header:header-site-header' }, { ref: 'post:sgs_drawer:drawer-menu' } ] );
	assert.match( byDefault.notes.join( '\n' ), /sgs_header:header-site-header is the active header of 2/ );
	const chosen = plan( rows, state(), { decisions: { active: { header: 'header-checkout' } } } );
	assert.deepEqual( pointer( chosen, 'header' ), { ref: 'post:sgs_header:header-checkout' } );
	const bad = plan( rows, state(), { decisions: { active: { header: 'nope' } } } );
	assert.match( bad.problems[ 0 ], /names "nope" as the active header, which is no header row/ );
	assert.equal( chooseActive( rows.filter( ( r ) => 'sgs_header' === r.postType ), 'header', rows, {} ).row.slug, 'header-site-header' );
} );

test( 'the writer builds a template with --template and records its hash, and marks an adopted WooCommerce page', () => {
	const calls = [];
	const builds = [];
	const actions = [
		{ phase: 'posts', type: 'adopt', key: 'page:checkout', id: 8, mark: true, say: 'adopt' },
		{ phase: 'posts', type: 'template', key: 'shop:shop', template: 'archive-product', tree: [ { name: 'sgs/heading' } ], hash: 'abc', hashes: { 'archive-product': 'abc' }, say: 'template' },
	];
	const done = applyPhase( actions, 'posts', { wp: ( a ) => calls.push( a.join( ' ' ) ), build: ( t, tree ) => builds.push( [ t, tree ] ), onId: () => {} } );
	assert.equal( done, 2 );
	assert.deepEqual( builds, [ [ { template: 'archive-product' }, [ { name: 'sgs/heading' } ] ] ] );
	assert.deepEqual( calls, [ `post meta update 8 ${ ROW_META } page:checkout`, `option update ${ TEMPLATE_OPTION } {"archive-product":"abc"} --format=json` ] );
} );

test( 'the state read covers shop rows: WordPress types, posts of held slugs, the WooCommerce options and the template bookkeeping', () => {
	const php = statePhp( SHOP() );
	const input = JSON.parse( Buffer.from( /base64_decode\( '([^']+)'/.exec( php )[ 1 ], 'base64' ).toString() );
	assert.deepEqual( input.types.sort(), [ 'page', 'sgs_header' ] );
	assert.ok( ! input.keys.includes( 'product:product' ) );
	assert.ok( input.unbuilt.some( ( u ) => 'shop:shop' === u.key && 'page' === u.type ) );
	assert.match( php, /woocommerce_myaccount_page_id/ );
	assert.match( php, new RegExp( `get_option\\( '${ TEMPLATE_OPTION }'` ) );
	assert.match( php, /'custom' === \$t->source/ );
} );

test( 'a template build runs wp-build-page.js with --template and returns the saved template id', () => {
	const seen = path.join( os.tmpdir(), `site-build-shop-args-${ process.pid }.json` );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-shop-repo-' ) );
	fs.mkdirSync( path.join( repo, 'scripts' ) );
	fs.mkdirSync( path.join( repo, '.claude', 'secrets' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, '.claude', 'secrets', 'shop-test.env' ), 'WP_USER_SHOPTEST=x\n' );
	fs.writeFileSync( path.join( repo, 'scripts', 'wp-build-page.js' ), `require( 'fs' ).writeFileSync( ${ JSON.stringify( seen ) }, JSON.stringify( process.argv.slice( 2 ) ) ); console.log( JSON.stringify( { ok: true, id: 'sgs-theme//single-product' } ) );` );
	const id = wpBuildPage( repo, 'shop-test' )( { template: 'single-product' }, [ { name: 'sgs/heading' } ] );
	const args = JSON.parse( fs.readFileSync( seen, 'utf8' ) );
	fs.rmSync( seen, { force: true } );
	assert.equal( id, 'sgs-theme//single-product' );
	assert.equal( args[ args.indexOf( '--template' ) + 1 ], 'single-product' );
	assert.ok( ! args.includes( '--create' ) && ! args.includes( '--post-id' ) );
} );
