// The Phase 0 review's findings for the site build (each MUST FAIL when its rule breaks): slug claims, a person's edits,
// shop templates, WooCommerce adoption, half-way saves, active pointers, ids per site, WooCommerce roles, renames.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as map from '../lib/site-build-map.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import * as stateLib from '../lib/site-build-state.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const noUndefined = ( r ) => Object.fromEntries( Object.entries( r ).filter( ( [ , v ] ) => undefined !== v ) );
const post = ( id, key, o = {} ) => ( { id, type: key.split( ':' )[ 0 ], slug: key.split( ':' )[ 1 ], title: 'T', status: 'publish', parent: 0, template: '', rowKey: key, treeHash: 'old', sectionPage: 0, contentHash: 'c1', builtContentHash: 'c1', content: null, ...o } );
const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [ 'cart', 'checkout' ] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/', woocommerce_shop_page_id: '6', woocommerce_cart_page_id: '7', woocommerce_checkout_page_id: '8', woocommerce_myaccount_page_id: '9' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [], ...o,
} );
const plan = ( rows, st = state(), extra = {} ) => planBuild( { rows, state: st, repo: os.tmpdir(), client: 'none', ...extra } );
const repoWith = ( files ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-review-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};
const TREE = [ { name: 'sgs/heading', attributes: { content: 'Real' } } ];
const SHOP = () => [
	row( { slug: 'home', title: 'Home', route: 'home' } ),
	row( { slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', collection: 'live' } ),
	row( { slug: 'product', title: 'Product', postType: 'product', template: 'single-product', collection: 'live' } ),
	row( { slug: 'basket', title: 'Basket', template: 'cart' } ),
	row( { slug: 'checkout', title: 'Checkout', template: 'checkout' } ),
	row( { slug: 'account', title: 'My account' } ),
];
const SHOP_TREES = { 'sites/c/build/trees/shop/shop.json': TREE, 'sites/c/build/trees/product/product.json': TREE };
const planWithTrees = ( rows, st ) => planBuild( { rows, state: st, repo: repoWith( SHOP_TREES ), client: 'c' } );

// 1 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a shop row and a page row with one slug claim one WordPress slug and stop the run', () => {
	const p = plan( [ row( { slug: 'shop', title: 'Shop', postType: 'shop' } ), row( { slug: 'shop', title: 'Shop two' } ) ] );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /shop:shop and page:shop.*slug "shop"/ );
	assert.deepEqual( p.actions, [] );
	assert.deepEqual( plan( [ row( { slug: 'shop', title: 'Shop', postType: 'shop' } ), row( { slug: 'other', title: 'Other' } ) ] ).problems, [] );
} );

// 2 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a rebuild never overwrites a post whose content a person changed since the site build saved it', () => {
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ) ];
	const edited = plan( rows, state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', contentHash: 'person' } ) } } ) );
	assert.equal( edited.problems.length, 1 );
	assert.match( edited.problems[ 0 ], /page:home: post 10 was edited after the site build saved it.*wp post meta delete 10 _sgs_site_build_content/ );
	const clean = plan( rows, state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home' } ) } } ) );
	assert.deepEqual( clean.problems, [] );
	assert.deepEqual( clean.actions.filter( ( a ) => 'build' === a.type ).map( ( a ) => a.id ), [ 10 ] );
	const legacy = plan( rows, state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', contentHash: 'person', builtContentHash: '' } ) } } ) );
	assert.deepEqual( legacy.problems, [], 'a post saved before the content hash existed is not blocked' );
} );

test( 'MUST FAIL: a rebuilt template stops when the site\'s copy differs from the content the site build saved', () => {
	const rows = SHOP();
	const first = planWithTrees( rows, state() );
	const built = first.actions.filter( ( a ) => 'template' === a.type );
	assert.ok( built.length, 'a real tree builds a template' );
	const hashes = { 'archive-product': 'older', 'single-product': 'older' };
	const stopped = planWithTrees( rows, state( { templateHashes: hashes, customTemplates: [ 'archive-product' ], templateContent: { 'archive-product': 'person' }, templateSaved: { 'archive-product': 'saved' } } ) );
	assert.ok( stopped.problems.some( ( m ) => /archive-product template was edited after the site build saved it/.test( m ) ) );
	const fine = planWithTrees( rows, state( { templateHashes: hashes, customTemplates: [ 'archive-product' ], templateContent: { 'archive-product': 'saved' }, templateSaved: { 'archive-product': 'saved' } } ) );
	assert.ok( ! fine.problems.some( ( m ) => /edited after/.test( m ) ) );
} );

test( 'MUST FAIL: after a save the writer records the saved content\'s hash, for a post and for a template', () => {
	const calls = [];
	const wp = ( a, input ) => calls.push( [ a.join( ' ' ), input || '' ] );
	applyPhase( [ { phase: 'posts', type: 'build', key: 'page:home', id: 10, tree: TREE, hash: 'h', say: 'b' } ], 'posts', { wp, build: () => 10, onId: () => {} } );
	assert.ok( calls.some( ( [ a, input ] ) => 'eval-file -' === a && input.includes( stateLib.CONTENT_META ) && input.includes( 'post_content' ) && input.includes( '10' ) ) );
	calls.length = 0;
	applyPhase( [ { phase: 'posts', type: 'template', key: 'shop:shop', template: 'archive-product', tree: TREE, hash: 'h', hashes: { 'archive-product': 'h' }, previous: {}, say: 't' } ], 'posts', { wp, build: () => 'theme//archive-product', onId: () => {} } );
	assert.ok( calls.some( ( [ a, input ] ) => 'eval-file -' === a && input.includes( stateLib.TEMPLATE_CONTENT_OPTION ) && input.includes( 'archive-product' ) ) );
} );

// 3 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a shop template is built only from a real tree; a placeholder leaves the theme default and says so', () => {
	const p = plan( SHOP(), state() );
	assert.deepEqual( p.actions.filter( ( a ) => 'template' === a.type ), [] );
	assert.match( p.notes.join( '\n' ), /archive-product template.*no tree.*theme's own default/ );
	assert.match( p.notes.join( '\n' ), /single-product template.*no tree.*theme's own default/ );
	const real = planWithTrees( SHOP(), state() );
	assert.deepEqual( real.actions.filter( ( a ) => 'template' === a.type ).map( ( a ) => a.template ).sort(), [ 'archive-product', 'single-product' ] );
} );

// 4 -----------------------------------------------------------------------------------------------------------------
const heldCheckout = ( content ) => state( { holders: { 'page:checkout': [ 8 ] }, posts: { 8: post( 8, 'page:checkout', { rowKey: '', treeHash: '', contentHash: 'x', builtContentHash: '', content } ) } } );
test( 'MUST FAIL: WooCommerce\'s default page is taken over only while its content is still WooCommerce\'s own', () => {
	for ( const content of [ '', '[woocommerce_checkout]', '<!-- wp:shortcode -->[woocommerce_my_account]<!-- /wp:shortcode -->\n', '<!-- wp:woocommerce/checkout -->\n<div class="wp-block-woocommerce-checkout"></div>\n<!-- /wp:woocommerce/checkout -->' ] ) {
		const ok = plan( SHOP(), heldCheckout( content ) );
		assert.deepEqual( ok.problems, [], `default content ${ JSON.stringify( content ) }` );
		assert.deepEqual( ok.actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => a.key ), [ 'page:checkout' ] );
	}
	for ( const content of [ '<!-- wp:paragraph --><p>Our own words</p><!-- /wp:paragraph -->', 'Plain words', '<!-- wp:shortcode -->[gallery ids="1"]<!-- /wp:shortcode -->', '<!-- wp:woocommerce/cart --><p>My own words</p><!-- /wp:woocommerce/cart -->', null ] ) {
		const no = plan( SHOP(), heldCheckout( content ) );
		assert.equal( no.problems.length, 1, `edited content ${ JSON.stringify( content ) }` );
		assert.match( no.problems[ 0 ], /page:checkout: post 8 is the page WooCommerce names.*no longer WooCommerce's default content/ );
		assert.deepEqual( no.actions, [] );
	}
} );

test( 'MUST FAIL: an adoption writes the row mark before it records the id, so a failed mark leaves the page map empty and the run repeatable', () => {
	const order = [];
	const wp = () => {
		order.push( 'mark' );
		throw new Error( 'ssh dropped' );
	};
	assert.throws( () => applyPhase( [ { phase: 'posts', type: 'adopt', key: 'page:checkout', id: 8, mark: true, say: 'a' } ], 'posts', { wp, build: () => 0, onId: () => order.push( 'onId' ) } ), /ssh dropped/ );
	assert.deepEqual( order.filter( ( s ) => 'onId' === s ), [], 'no id was recorded for an unmarked post' );
	const good = [];
	applyPhase( [ { phase: 'posts', type: 'adopt', key: 'page:checkout', id: 8, mark: true, say: 'a' } ], 'posts', { wp: () => good.push( 'mark' ), build: () => 0, onId: () => good.push( 'onId' ) } );
	assert.deepEqual( good, [ 'mark', 'onId' ] );
} );

// 5 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a create keeps the saved id, retries a failed mark, and names the command when the mark still fails', () => {
	const create = { phase: 'posts', type: 'create', key: 'page:home', postType: 'page', title: 'Home', slug: 'home', tree: TREE, hash: 'h', fields: {}, say: 'c' };
	const ids = [];
	let fails = 2;
	const flaky = ( a ) => {
		if ( a.includes( stateLib.ROW_META ) && fails-- > 0 ) {
			throw new Error( 'ssh dropped' );
		}
	};
	applyPhase( [ create ], 'posts', { wp: flaky, build: () => 77, onId: ( k, id ) => ids.push( [ k, id ] ) } );
	assert.deepEqual( ids, [ [ 'page:home', 77 ] ], 'two failed marks were retried' );
	const sent = [];
	applyPhase( [ create ], 'posts', { wp: ( a, input ) => sent.push( [ a.join( ' ' ), input || '' ] ), build: () => 79, onId: () => {} }  );
	assert.ok( sent.some( ( [ a, input ] ) => 'eval-file -' === a && input.includes( stateLib.CONTENT_META ) && input.includes( '79' ) ), 'a created post records its saved content hash' );
	const dead = () => {
		throw new Error( 'ssh down' );
	};
	const kept = [];
	assert.throws( () => applyPhase( [ create ], 'posts', { wp: dead, build: () => 78, onId: ( k, id ) => kept.push( id ) } ), /post 78 was saved but not marked.*wp post meta update 78 _sgs_site_build_row page:home/ );
	assert.deepEqual( kept, [ 78 ], 'the id stays in the page map' );
} );

test( 'MUST FAIL: a stored id whose post the site build saved but never marked is marked and rebuilt, not a stop', () => {
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ) ];
	const half = plan( rows, state( { posts: { 10: post( 10, 'page:home', { rowKey: '', treeHash: '', builtContentHash: '', title: 'Home', slug: 'home' } ) } } ) );
	assert.deepEqual( half.problems, [] );
	assert.deepEqual( half.actions.filter( ( a ) => [ 'adopt', 'build' ].includes( a.type ) ).map( ( a ) => [ a.type, a.key || '', a.mark || false ] ), [ [ 'adopt', 'page:home', true ], [ 'build', 'page:home', false ] ] );
	const theirs = plan( rows, state( { posts: { 10: post( 10, 'page:home', { rowKey: '', treeHash: '', slug: 'someone-elses' } ) } } ) );
	assert.equal( theirs.problems.length, 1, 'a post with another slug is still never taken' );
} );

test( 'MUST FAIL: a template records its hash before the build and restores the old one when the build fails', () => {
	const act = { phase: 'posts', type: 'template', key: 'shop:shop', template: 'archive-product', tree: TREE, hash: 'new', hashes: { 'archive-product': 'new' }, previous: { 'archive-product': 'old' }, say: 't' };
	const calls = [];
	const wp = ( a ) => calls.push( a.join( ' ' ) );
	applyPhase( [ act ], 'posts', { wp, build: () => ( calls.push( 'build' ), 'theme//archive-product' ), onId: () => {} } );
	const recorded = calls.findIndex( ( c ) => c.startsWith( `option update ${ stateLib.TEMPLATE_OPTION }` ) );
	assert.ok( recorded >= 0 && recorded < calls.indexOf( 'build' ), 'the option is written before the build' );
	const failed = [];
	assert.throws( () => applyPhase( [ act ], 'posts', { wp: ( a ) => failed.push( a.join( ' ' ) ), build: () => {
		throw new Error( 'editor stalled' );
	}, onId: () => {} } ), /editor stalled/ );
	assert.equal( failed.at( -1 ), `option update ${ stateLib.TEMPLATE_OPTION } {"archive-product":"old"} --format=json`, 'the previous hashes are put back' );
} );

test( 'MUST FAIL: a template hash recorded for a copy the site no longer holds is built again', () => {
	const rows = SHOP();
	const hashes = Object.fromEntries( planWithTrees( rows, state() ).actions.filter( ( a ) => 'template' === a.type ).map( ( a ) => [ a.template, a.hash ] ) );
	const held = planWithTrees( rows, state( { templateHashes: hashes, customTemplates: [ 'archive-product', 'single-product' ], templateContent: hashes, templateSaved: hashes } ) );
	assert.deepEqual( held.actions.filter( ( a ) => 'template' === a.type ), [] );
	const gone = planWithTrees( rows, state( { templateHashes: hashes, customTemplates: [] } ) );
	assert.deepEqual( gone.actions.filter( ( a ) => 'template' === a.type ).map( ( a ) => a.template ).sort(), [ 'archive-product', 'single-product' ] );
} );

// 6 -----------------------------------------------------------------------------------------------------------------
const HEADERS = () => [ row( { slug: 'home', title: 'Home' } ), row( { slug: 'header', title: 'Header', route: undefined, postType: 'sgs_header', id: 50 } ), row( { slug: 'header-two', title: 'Header two', route: undefined, postType: 'sgs_header', id: 51 } ) ].map( noUndefined );
const headerPosts = { 50: post( 50, 'sgs_header:header', { treeHash: 'x' } ), 51: post( 51, 'sgs_header:header-two', { treeHash: 'x' } ) };
const pointerAction = ( p ) => p.actions.find( ( a ) => 'pointer' === a.type && 'header' === a.area );
test( 'MUST FAIL: several rows of one layout kind stop the run even when the active pointer already names one of them', () => {
	const stopped = plan( HEADERS(), state( { posts: headerPosts } ) );
	assert.equal( stopped.problems.length, 1 );
	assert.match( stopped.problems[ 0 ], /2 header rows \(sgs_header:header, sgs_header:header-two\)/ );
	const named = plan( HEADERS(), state( { posts: headerPosts, pointers: { header: 51, footer: 0, drawer: 0 }, pointerKeys: { header: 'sgs_header:header-two' } } ) );
	assert.match( named.problems[ 0 ], /2 header rows/ );
} );

test( 'MUST FAIL: a pointer is overwritten only when it is empty or names a post carrying a row key', () => {
	const one = () => [ row( { slug: 'home', title: 'Home' } ), noUndefined( row( { slug: 'header', title: 'Header', route: undefined, postType: 'sgs_header', id: 50 } ) ) ];
	const posts = { 50: post( 50, 'sgs_header:header', { treeHash: 'x' } ) };
	const foreign = plan( one(), state( { posts, pointers: { header: 77, footer: 0, drawer: 0 } } ) );
	assert.equal( pointerAction( foreign ), undefined );
	assert.match( foreign.notes.join( '\n' ), /active header is post 77.*not made by the site build, so it is left/ );
	assert.equal( pointerAction( plan( one(), state( { posts, pointers: { header: 0, footer: 0, drawer: 0 } } ) ) ).id, 50 );
	const ours = plan( one(), state( { posts, pointers: { header: 77, footer: 0, drawer: 0 }, pointerKeys: { header: 'sgs_header:old' } } ) );
	assert.equal( pointerAction( ours ).id, 50 );
} );

// 7 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: ids written by a run against one site are ignored by a run against another site that shares the client', () => {
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ) ];
	assert.match( plan( rows, state() ).problems[ 0 ] || '', /stored id 10/, 'on the other site the id names nothing' );
	assert.equal( map.rowsForSite?.( rows, 'site-a', 'site-b' )[ 0 ].id, null );
	assert.equal( map.rowsForSite?.( rows, 'site-a', 'site-a' )[ 0 ].id, 10 );
	assert.equal( map.rowsForSite?.( rows, null, 'site-b' )[ 0 ].id, 10, 'ids with no recorded site are kept' );
	assert.deepEqual( plan( map.rowsForSite( rows, 'site-a', 'site-b' ), state() ).problems, [] );
} );

test( 'MUST FAIL: the site the ids came from is recorded beside the page map and read back', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-ids-' ) );
	const file = path.join( dir, 'page-map.json' );
	assert.equal( map.readIdsSite?.( file ), null );
	map.writeIdsSite?.( file, 'site-a' );
	assert.equal( map.readIdsSite?.( file ), 'site-a' );
} );

// 8 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: two rows that could be one WooCommerce page stop the run, and a replaced default page is noted', () => {
	const two = plan( [ ...SHOP(), row( { slug: 'pay', title: 'Pay', template: 'checkout' } ) ], state() );
	assert.equal( two.problems.length, 1 );
	assert.match( two.problems[ 0 ], /page:checkout and page:pay could both be the checkout page/ );
	const one = plan( SHOP(), state() );
	assert.deepEqual( one.problems, [] );
	assert.match( one.notes.join( '\n' ), /post 6, which woocommerce_shop_page_id named, is left in place/ );
} );

// 10 ----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a person\'s rename or move of a built page is reported, never undone', () => {
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ) ];
	const p = plan( rows, state( { posts: { 10: post( 10, 'page:home', { title: 'Renamed', slug: 'renamed', parent: 3, treeHash: 'old' } ) } } ) );
	assert.deepEqual( p.actions.filter( ( a ) => 'update' === a.type ), [] );
	assert.match( p.notes.join( '\n' ), /page:home: post 10 differs from the page map.*post_title "Renamed".*post_name "renamed".*post_parent 3/ );
	const tpl = plan( [ row( { slug: 'home', title: 'Home', id: 10, template: 'cart' } ) ], state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', template: '' } ) } } ) );
	assert.deepEqual( tpl.actions.filter( ( a ) => 'update' === a.type ).map( ( a ) => Object.keys( a.fields ) ), [ [ 'page_template' ] ], 'the page template is still kept' );
} );
