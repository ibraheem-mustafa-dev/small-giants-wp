// Bean, 2026-11-26: a cloned page's parent, and so its web address, follows the draft's own page addresses, never its menu. A page row
// nests under the page row whose own draft route is the nearest ancestor path of its route (`food-service/manufacturing` under
// `food-service`); a row with no such ancestor page, and every row of a draft whose routes are all flat, stays top-level. Only a page row
// parents or is parented. Bean's saved marks still win (the replaced rule, a menu item linking to its first child, is gone).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, ancestorPage } from '../lib/intake-pagemap.mjs';
import { readRouting } from '../lib/intake-routing.mjs';
import { applyMarks } from '../lib/intake-pagemap-regen.mjs';
import { parentRow } from '../lib/site-build-map.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'intake-pagemap', 'hash' );
const real = ( slug ) => path.resolve( HERE, '../../../sites', slug, 'handoff' );
const propose = ( folder ) => proposePageMap( { folder, routing: readRouting( { folder } ) } );
const rowOf = ( m, route ) => m.rows.find( ( r ) => r.route === route );
const parentOfRoute = ( m, route ) => rowOf( m, route )?.parent;
const parentsAreRows = ( m ) => m.rows.every( ( r ) => ! r.parent || m.rows.some( ( p ) => p.slug === r.parent && p.postType === r.postType ) );

// The fixture draft with the given routes added to its `pages` getter (and an optional edit of its text), proposed once.
function nested( entries, edit = ( t ) => t ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-routes-' ) );
	try {
		fs.cpSync( FIX, dir, { recursive: true } );
		const file = path.join( dir, 'Site.dc.html' );
		const extra = entries.map( ( k ) => `'${ k }': { crumb: '${ k }', blocks: [] }, ` ).join( '' );
		fs.writeFileSync( file, edit( fs.readFileSync( file, 'utf8' ).replace( "about: { crumb: 'About us'", `${ extra }about: { crumb: 'About us'` ) ) );
		return propose( dir );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
}

const flat = propose( FIX );

test( 'MUST FAIL: nested routes nest: a page takes the page at the nearest ancestor route, skipping a missing level', () => {
	const m = nested( [ 'products', 'products/widgets', 'products/widgets/blue', 'guides/setup/first-steps', 'guides' ] );
	const slug = ( route ) => rowOf( m, route ).slug;
	assert.equal( parentOfRoute( m, 'products/widgets' ), slug( 'products' ), 'products/widgets sits under products' );
	assert.equal( parentOfRoute( m, 'products/widgets/blue' ), slug( 'products/widgets' ), 'the nearest ancestor wins over a further one' );
	assert.equal( parentOfRoute( m, 'guides/setup/first-steps' ), slug( 'guides' ), 'no page at guides/setup, so the next ancestor up is the parent' );
	assert.equal( parentOfRoute( m, 'products' ), null, 'the top of a branch has no parent' );
	assert.equal( parentOfRoute( m, 'guides' ), null );
	assert.ok( parentsAreRows( m ), 'every parent names a page row of the map' );
} );

test( 'MUST FAIL: a route whose ancestor path holds no page has no parent, and a prefix that is not a path ancestor is not one', () => {
	const m = nested( [ 'solo/deep', 'team-up', 'team/extra' ] );
	assert.equal( parentOfRoute( m, 'solo/deep' ), null, 'no page at solo' );
	assert.equal( parentOfRoute( m, 'team-up' ), null, 'team-up shares letters with team but is no path below it' );
	assert.equal( parentOfRoute( m, 'team/extra' ), rowOf( m, 'team' ).slug, 'a page at team does parent team/extra' );
} );

test( 'MUST FAIL: flat routes stay flat, whatever the menu looks like: no row of the fixture draft has a parent', () => {
	// The draft's menu nests Our team and News under About, and Cleaning and Repairs under a Services item that links to its first child.
	assert.deepEqual( flat.rows.filter( ( r ) => r.parent ).map( ( r ) => r.slug ), [] );
	assert.ok( flat.rows.filter( ( r ) => 'page' === r.postType ).length >= 6, 'and the fixture does hold the pages' );
} );

test( 'MUST FAIL: a menu item with children, with or without a page of its own, never nests them', () => {
	const m = nested( [], ( t ) => t.replace( "{ label: 'Contact', href: '#/contact' }\n    ];", "{ label: 'Contact', href: '#/contact', links: [ { label: 'Our team', href: '#/team' } ] }\n    ];" ) );
	assert.ok( m.rows.some( ( r ) => 'contact' === r.slug ), 'the edited fixture still builds' );
	assert.equal( parentOfRoute( m, 'team' ), null, 'About and Contact both list Our team; neither is its parent' );
	assert.equal( parentOfRoute( m, 'repairs' ), null, 'Services links to Cleaning, its first child: Repairs stays top-level' );
	assert.equal( parentOfRoute( m, 'cleaning' ), null );
} );

test( 'MUST FAIL: only a page row parents or is parented: an article, shop or template row is never the ancestor, and a non-page route is never nested', () => {
	const row = ( route, postType, slug = route ) => ( { route, slug, postType } );
	const rows = [ row( 'blog', 'post' ), row( 'blog/entry', 'page' ), row( 'shop', 'shop' ), row( 'shop/item', 'page' ), row( 'help', 'page' ), row( 'help/missing', 'template' ), row( 'help/more', 'post' ),
		row( 'docs', 'page' ), row( 'docs/guide', 'page' ) ];
	const up = ( route ) => ancestorPage( rows.find( ( r ) => r.route === route ), rows )?.route ?? null;
	assert.equal( up( 'blog/entry' ), null, 'an article row is no page to nest under' );
	assert.equal( up( 'shop/item' ), null, 'a shop row is no page to nest under' );
	assert.equal( up( 'help/missing' ), null, 'a template row makes no post, so it has no parent' );
	assert.equal( up( 'help/more' ), null, 'an article route under a page nests nothing' );
	assert.equal( up( 'docs/guide' ), 'docs', 'negative control: a page route under a page row nests' );
} );

test( 'a route reads the same as a hash key, a hash path or a file route, and an index file is its folder', () => {
	const row = ( route, slug ) => ( { route, slug, postType: 'page' } );
	const up = ( rows, route ) => ancestorPage( rows.find( ( r ) => r.route === route ), rows )?.slug ?? null;
	assert.equal( up( [ row( '#/sectors', 'sectors' ), row( '#/sectors/retail', 'retail' ) ], '#/sectors/retail' ), 'sectors', 'hash paths' );
	assert.equal( up( [ row( 'sectors.dc.html', 'sectors' ), row( 'sectors/retail.dc.html', 'retail' ) ], 'sectors/retail.dc.html' ), 'sectors', 'file routes' );
	assert.equal( up( [ row( 'sectors/index.html', 'sectors' ), row( 'sectors/retail/index.html', 'retail' ) ], 'sectors/retail/index.html' ), 'sectors', 'index files' );
	assert.equal( up( [ row( '', 'home' ), row( 'about', 'about' ) ], 'about' ), null, 'the home route is the root of every address, not the parent of every page' );
	assert.equal( up( [ row( 'Site.dc.html#/sectors', 'sectors' ), row( 'Site.dc.html#/sectors/retail', 'retail' ) ], 'Site.dc.html#/sectors/retail' ), 'sectors', 'a file route with a hash path reads the hash path' );
	assert.equal( up( [ row( 'Site.dc.html', 'home' ), row( 'Site.dc.html#/about', 'about' ) ], 'Site.dc.html#/about' ), null, 'the file alone is the home route, no ancestor' );
	assert.equal( up( [ row( 'Sectors', 'sectors' ), row( 'sectors/Retail', 'retail' ) ], 'sectors/Retail' ), 'sectors', 'case is ignored, as a slug is lower-case' );
	assert.equal( up( [ row( 'index.html', 'home' ), row( 'about', 'about' ) ], 'about' ), null, 'index.html is the home route' );
} );

test( 'in the page map: a page route under an article, or an article route under a page, nests nothing', () => {
	const m = nested( [ 'about/team-notes', 'news/archive', 'post-first/extra' ] );
	assert.equal( rowOf( m, 'post-first' )?.postType, 'post', 'the fixture holds the article row' );
	assert.equal( parentOfRoute( m, 'post-first/extra' ), null );
	assert.equal( parentOfRoute( m, 'about/team-notes' ), 'about' );
	assert.equal( parentOfRoute( m, 'news/archive' ), 'news' );
	assert.ok( parentsAreRows( m ) );
} );

// A draft manifest's `wp.parent` is accepted only when it names a page row and the row is a page row too (the manifest fixture: shop is a shop row, home a page row).
function withManifestParents( parents ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-manifest-' ) );
	try {
		const src = path.join( HERE, 'fixtures', 'intake-pagemap', 'manifest' );
		fs.cpSync( src, dir, { recursive: true } );
		const file = path.join( dir, 'Shop.dc.html' );
		fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( '"parent": "help"', `"parent": ${ JSON.stringify( parents.faq ) }` ).replace( '"slug": "glasses", "parent": null', `"slug": "glasses", "parent": ${ JSON.stringify( parents.shop ?? null ) }` ) );
		return propose( dir );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
}

test( 'MUST FAIL: a manifest parent is taken only when it names a page row; a shop row named as the parent is a gap row, not a parent', () => {
	const shop = withManifestParents( { faq: 'shop' } );
	assert.equal( rowOf( shop, 'shop' )?.postType, 'shop', 'the fixture holds a shop row' );
	assert.equal( parentOfRoute( shop, 'faq' ), null, 'a shop row is no page to nest under' );
	assert.ok( shop.gaps.some( ( g ) => 'page-map' === g.construct && g.error.includes( '"shop"' ) && g.error.includes( 'no page row' ) ), 'and it is reported' );
	const page = withManifestParents( { faq: 'home' } );
	assert.equal( parentOfRoute( page, 'faq' ), 'home', 'negative control: a page row named as the parent is taken' );
	assert.ok( ! page.gaps.some( ( g ) => 'page-map' === g.construct && g.error.includes( 'parent' ) ) );
	const child = withManifestParents( { faq: null, shop: 'home' } );
	assert.equal( parentOfRoute( child, 'shop' ), null, 'a shop row takes no parent, even a page one' );
	assert.ok( child.gaps.some( ( g ) => 'page-map' === g.construct && g.error.includes( 'takes no parent' ) ), 'and it is reported' );
} );

test( 'MUST FAIL: site-build finds a parent by slug before route, so a page whose route equals another page slug is never taken for the parent', () => {
	const row = ( o ) => ( { postType: 'page', parent: null, ...o } );
	// Page "guides" (route "docs") and page "docs" (route "guides"): a child whose parent slug is "docs" is under the page with SLUG docs.
	const rows = [ row( { slug: 'guides', route: 'docs' } ), row( { slug: 'docs', route: 'guides' } ), row( { slug: 'child', route: 'guides/child', parent: 'docs' } ) ];
	assert.equal( parentRow( rows, rows[ 2 ] ).slug, 'docs' );
	assert.equal( parentRow( rows, row( { slug: 'x', route: 'x', parent: 'guides' } ) ).slug, 'guides', 'a parent slug that is also another page route still names the slug' );
	const byRoute = [ row( { slug: 'about-us', route: 'about' } ), row( { slug: 'team', route: 'about/team', parent: 'about' } ) ];
	assert.equal( parentRow( byRoute, byRoute[ 1 ] ).slug, 'about-us', 'a hand-written map naming the route still resolves' );
} );

test( 'Bean saved marks win over the proposed parent: edit:parent= clears it, edit:parent=<slug> sets another', () => {
	const m = nested( [ 'about/history' ] );
	const slug = rowOf( m, 'about/history' ).slug;
	assert.equal( parentOfRoute( m, 'about/history' ), 'about' );
	const cleared = applyMarks( m.rows, new Map( [ [ `page:page:${ slug }`, 'edit:parent=' ] ] ) );
	assert.equal( rowOf( cleared, 'about/history' ).parent, null );
	const moved = applyMarks( m.rows, new Map( [ [ `page:page:${ slug }`, 'edit:parent=team' ] ] ) );
	assert.equal( rowOf( moved, 'about/history' ).parent, 'team' );
	const untouched = applyMarks( m.rows, new Map( [ [ 'page:page:team', 'edit:title=The team' ] ] ) );
	assert.equal( rowOf( untouched, 'about/history' ).parent, 'about' );
} );

for ( const client of [ 'indus-foods', 'mamas-munches-redesign', 'eye-care-ward-end' ] ) {
	test( `real ${ client } draft: its routes carry no path hierarchy, so every page is top-level`, { skip: ! fs.existsSync( real( client ) ) && 'no client exports in this checkout' }, () => {
		const m = propose( real( client ) );
		const pages = m.rows.filter( ( r ) => 'page' === r.postType );
		assert.ok( pages.length >= 5, `${ pages.length } page rows` );
		assert.deepEqual( pages.filter( ( r ) => String( r.route ?? '' ).replace( /^#?\/?/, '' ).includes( '/' ) ).map( ( r ) => r.route ), [], 'the draft states no nested route' );
		assert.deepEqual( m.rows.filter( ( r ) => r.parent ).map( ( r ) => `${ r.slug } < ${ r.parent }` ), [] );
	} );
}
