// The site's own template copies (Spec 48 FR-48-56): what a copy holds, which templates a site serves, how site build,
// the manifest and the site run make them. Tests marked MUST FAIL fail on the code before the copies were built.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DERIVED, POST_CONTENT, commonChain, contentUnder, copySource, copyTree, framed, pageTemplateOf, parseBlocks, servedTemplates, splitShell, themeContent, THEME_TEMPLATES } from '../lib/template-copies.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { buildManifest, templateSurfaces } from '../lib/manifest-build.mjs';
import { copyTrees, liveAddress, runKeys, surfaceReach } from '../site-run.mjs';
import { templateRecordPhp } from '../lib/site-build-apply.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [ 'cart', 'checkout' ] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [], wooDefaults: {}, ...o,
} );
const repoWith = ( files = {} ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'template-copies-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};
const names = ( tree ) => tree.map( ( n ) => n.name );
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
const BG = { name: 'sgs/container', attributes: { tagName: 'div', backgroundColour: 'cream' } };
const SECTION = ( t ) => ( { name: 'sgs/container', attributes: { tagName: 'section' }, innerBlocks: [ { name: 'sgs/heading', attributes: { content: t } } ] } );
// A Filled page tree: one background wrapper holding its sections.
const PAGE = ( ...ts ) => [ { ...BG, innerBlocks: ts.map( SECTION ) } ];

test( 'the shell is the run of single-child containers from the root; the content is what sits below it', () => {
	const { chain, content } = splitShell( PAGE( 'A', 'B' ) );
	assert.deepEqual( chain, [ BG ] );
	assert.deepEqual( content.map( ( n ) => n.innerBlocks[ 0 ].attributes.content ), [ 'A', 'B' ] );
	assert.deepEqual( splitShell( [ SECTION( 'A' ), SECTION( 'B' ) ] ).chain, [], 'two roots: no shell' );
	assert.deepEqual( splitShell( [ { name: 'sgs/hero', innerBlocks: [ SECTION( 'A' ) ] } ] ).chain, [], 'only an sgs/container is a shell wrapper' );
} );

test( 'a template several pages share takes the wrappers every one has; a page under it keeps only what is below them', () => {
	const other = [ { name: 'sgs/container', attributes: { tagName: 'div', backgroundColour: 'white' }, innerBlocks: [ SECTION( 'C' ), SECTION( 'D' ) ] } ];
	assert.deepEqual( commonChain( [ splitShell( PAGE( 'A', 'B' ) ).chain, splitShell( PAGE( 'C', 'D' ) ).chain ] ), [ BG ] );
	assert.deepEqual( commonChain( [ splitShell( PAGE( 'A', 'B' ) ).chain, splitShell( other ).chain ] ), [], 'a different background is no shared shell' );
	assert.equal( contentUnder( PAGE( 'A', 'B' ), [ BG ] ).length, 2 );
	assert.deepEqual( contentUnder( other, [] ), other );
	assert.throws( () => contentUnder( other, [ BG ] ), /does not start with the template's shell/ );
} );

test( 'MUST FAIL: a copy is the header and footer parts around the shell, holding the page content or the theme template\'s own content', () => {
	const page = copyTree( { slug: 'page', chain: [ BG ] } );
	assert.deepEqual( names( page ), [ 'core/template-part', 'sgs/container', 'core/template-part' ] );
	assert.deepEqual( [ page[ 0 ].attributes.slug, page[ 2 ].attributes.slug ], [ 'header', 'footer' ] );
	assert.equal( page[ 1 ].attributes.tagName, 'main', 'the theme main wraps a shell that is not itself a main' );
	assert.deepEqual( page[ 1 ].innerBlocks[ 0 ].innerBlocks, [ POST_CONTENT ] );
	const front = copyTree( { slug: 'front-page', chain: [] } );
	assert.deepEqual( front[ 1 ].innerBlocks, [ POST_CONTENT ], 'the front page holds only the shell around its content, never a section' );
	const single = copyTree( { slug: 'single', chain: [ BG ] } );
	assert.ok( find( single, 'core/post-content' ) && find( single, 'core/post-featured-image' ), 'single holds the theme\'s post blocks, so every post shows its own content' );
	const home = copyTree( { slug: 'home', chain: [] } );
	assert.ok( find( home, 'core/query' ), 'the posts page lists the posts' );
	const main = { name: 'sgs/container', attributes: { tagName: 'main', backgroundColour: 'cream' } };
	assert.equal( copyTree( { slug: 'page', chain: [ main ] } )[ 1 ].attributes.backgroundColour, 'cream', 'a draft main is the main itself, never nested in a second one' );
} );

test( 'a shop template is its whole tree in the frame; a tree already holding a template part is left as it is', () => {
	assert.deepEqual( names( framed( [ SECTION( 'Shop' ) ] ) ), [ 'core/template-part', 'sgs/container', 'core/template-part' ] );
	const own = [ { name: 'core/template-part', attributes: { slug: 'header' } }, SECTION( 'X' ) ];
	assert.equal( framed( own ), own );
	assert.deepEqual( names( copyTree( { slug: 'archive-product', whole: [ SECTION( 'Shop' ) ] } ) ), [ 'core/template-part', 'sgs/container', 'core/template-part' ] );
} );

test( 'every theme template parses into blocks, and the derived templates keep their own content', () => {
	for ( const f of fs.readdirSync( THEME_TEMPLATES ).filter( ( x ) => x.endsWith( '.html' ) ) ) {
		assert.ok( parseBlocks( fs.readFileSync( path.join( THEME_TEMPLATES, f ), 'utf8' ) ).length, f );
	}
	assert.ok( find( themeContent( '404' ), 'core/search' ), 'the not-found message and its search' );
	assert.ok( find( themeContent( 'search' ), 'core/query' ), 'the results list' );
	assert.deepEqual( parseBlocks( '<!-- wp:group {"a":1} --><div><!-- wp:paragraph /--></div><!-- /wp:group -->' ), [ { name: 'core/group', attributes: { a: 1 }, innerBlocks: [ { name: 'core/paragraph' } ] } ] );
	assert.throws( () => parseBlocks( '<!-- wp:group --><!-- /wp:columns -->' ), /closes core\/columns/ );
} );

const INDUS = [ row( { slug: 'home', route: 'home', template: 'front-page', id: 1 } ), row( { slug: 'blog', template: 'home', collection: 'live', id: 2 } ), row( { slug: 'about', template: 'page', id: 3 } ), row( { slug: 'contact', template: 'page', id: 4 } ), row( { slug: 'news-1', postType: 'post', template: 'single', id: 5 } ) ];
// The rows as a fresh site sees them (no post made yet).
const fresh = ( rows ) => rows.map( ( r ) => ( { ...r, id: null } ) );
const SHOP = [ row( { slug: 'shop', postType: 'shop', template: 'archive-product', collection: 'live', id: 10 } ), row( { slug: 'product', postType: 'product', template: 'single-product', collection: 'live' } ), row( { slug: 'cart', template: 'cart', id: 11 } ), row( { slug: 'checkout', template: 'checkout', id: 12 } ), row( { slug: 'my-account', template: 'page-my-account', id: 13 } ), row( { slug: 'order-confirmation', route: 'Confirmation.dc.html', postType: 'template', template: 'order-confirmation' } ), row( { slug: 'help', template: 'page', id: 14 } ) ];

test( 'the site serves each template a row names, page, 404 and search everywhere, single and archive with posts, and the shop set with a shop', () => {
	assert.deepEqual( servedTemplates( INDUS ), [ 'front-page', 'home', 'page', 'single', 'archive', 'search', '404' ] );
	assert.deepEqual( servedTemplates( SHOP ), [ 'page', 'search', '404', 'archive-product', 'single-product', 'product-search-results', 'taxonomy-product_attribute', 'cart', 'checkout', 'order-confirmation', 'page-my-account' ] );
	assert.deepEqual( DERIVED.map( ( s ) => copySource( INDUS, s ) ), [ 'page', 'page', 'page', 'page', 'page' ] );
	assert.equal( copySource( SHOP, 'archive-product' ), 'whole' );
	assert.equal( copySource( SHOP, 'cart' ), 'shell' );
} );

test( 'MUST FAIL: a template the hierarchy reaches is never a page template; a registered custom one still is', () => {
	assert.deepEqual( [ 'front-page', 'home', 'page', 'page-my-account', 'cart' ].map( ( t ) => pageTemplateOf( row( { slug: 'my-account', template: t } ) ) ), [ '', '', '', '', 'cart' ] );
	const p = planBuild( { rows: fresh( INDUS ), state: state( { posts: {} } ), repo: repoWith(), client: 'c' } );
	assert.deepEqual( p.problems, [], 'page, front-page and home rows plan with no "not one the theme registers" stop' );
} );

test( 'MUST FAIL: site build builds the single copy as the frame around the first post\'s shell, with the theme\'s post blocks in it', () => {
	const tree = PAGE( 'Article' );
	const p = planBuild( { rows: fresh( INDUS ), state: state(), repo: repoWith( { 'sites/c/build/trees/post/news-1.json': tree } ), client: 'c' } );
	const single = p.actions.find( ( a ) => 'template' === a.type && 'single' === a.template );
	assert.ok( single, 'the single copy is planned' );
	assert.deepEqual( [ single.tree[ 0 ].attributes.slug, single.tree.at( -1 ).attributes.slug ], [ 'header', 'footer' ] );
	assert.ok( find( single.tree, 'core/post-content' ), 'each post shows its own content, not the first post\'s' );
	assert.equal( find( single.tree, 'sgs/heading' )?.attributes?.content === 'Article', false, 'no post\'s article is baked into the template' );
} );

test( 'MUST FAIL: site build builds a run\'s copy file once, derives 404/search/archive from the page copy\'s shell, and reports what has no copy', () => {
	const copy = copyTree( { slug: 'page', chain: [ BG ] } );
	const files = { 'sites/c/build/trees/template/page.json': copy, 'sites/c/build/trees/template/page.shell.json': { chain: [ BG ], surfaces: { about: [ BG ] } } };
	const p = planBuild( { rows: fresh( INDUS ), state: state(), repo: repoWith( files ), client: 'c' } );
	const built = p.actions.filter( ( a ) => 'template' === a.type );
	assert.deepEqual( built.map( ( a ) => a.template ), [ 'page', 'archive', 'search', '404' ] );
	assert.deepEqual( built[ 0 ].tree, copy );
	assert.deepEqual( find( built.find( ( a ) => '404' === a.template ).tree, 'sgs/container' ).attributes.tagName, 'main' );
	assert.equal( find( built.find( ( a ) => '404' === a.template ).tree, 'core/search' ) !== null, true, 'the not-found message stays in the derived copy' );
	assert.deepEqual( p.uncopied.map( ( u ) => u.slug ), [ 'front-page', 'home', 'single' ] );
	assert.match( p.uncopied[ 0 ].why, /the site run builds it from page:home/ );
	const again = planBuild( { rows: fresh( INDUS ), state: state( { templateHashes: Object.fromEntries( built.map( ( a ) => [ a.template, a.hash ] ) ), customTemplates: built.map( ( a ) => a.template ) } ), repo: repoWith( files ), client: 'c' } );
	assert.deepEqual( again.actions.filter( ( a ) => 'template' === a.type ), [], 'a second run rebuilds nothing' );
	assert.deepEqual( planBuild( { rows: fresh( INDUS ), state: state(), repo: repoWith(), client: 'c' } ).uncopied.map( ( u ) => u.slug ), [ 'front-page', 'home', 'page', 'single', 'archive', 'search', '404' ] );
} );

test( 'a template row and an account row make no post and no page template; WooCommerce\'s pages keep their content', () => {
	const p = planBuild( { rows: fresh( SHOP ), state: state(), repo: repoWith(), client: 'c' } );
	assert.equal( p.actions.some( ( a ) => 'create' === a.type && 'template:order-confirmation' === a.key ), false );
	assert.deepEqual( p.problems, [] );
	assert.equal( p.actions.find( ( a ) => 'page:my-account' === a.key && a.fields )?.fields?.page_template, undefined );
} );

const target = { envFile: 'e.env', envKey: 'K' };
const rec = ( id, page_key, route ) => ( { id, kind: 'page', name: page_key, page_key, route, states: [ { name: 'Default', keys: {} } ], dc: 'Site' } );
const records = [ rec( 'S-1', 'home', '/' ), rec( 'S-2', 'blog', '/blog' ), rec( 'S-3', 'about', '/about' ), rec( 'S-4', 'contact', '/contact' ), rec( 'S-5', 'news-1', '/news-1' ), rec( 'S-6', 'cart', '/cart' ), rec( 'S-7', 'Confirmation', 'Confirmation.dc.html' ) ];
const manifest = ( rows ) => buildManifest( { client: 'c', site: 's', rows, records, target, entryFile: 'Site.dc.html', vocab: [ { state: 'hover' } ] } );

test( 'MUST FAIL: the manifest gives one template surface per served template, each made from what plays it', () => {
	const out = manifest( INDUS );
	assert.deepEqual( out.entries[ 'template-page' ].copy, { from: 'pages', surfaces: [ 'about', 'contact' ] } );
	assert.deepEqual( out.entries[ 'template-front-page' ].copy, { from: 'pages', surfaces: [ 'home' ] } );
	assert.deepEqual( out.entries[ 'template-home' ].copy, { from: 'pages', surfaces: [ 'blog' ] } );
	assert.deepEqual( out.entries[ 'template-single' ].copy, { from: 'fill', row: 'post:news-1' } );
	assert.deepEqual( [ 'template-404', 'template-search', 'template-archive' ].map( ( k ) => out.entries[ k ].copy.from ), [ 'page', 'page', 'page' ] );
	assert.deepEqual( [ out.entries.about.shell, out.entries.home.shell, out.entries.blog.shell ], [ 'page', 'front-page', 'home' ] );
	assert.deepEqual( out.entries[ 'template-page' ].target, { template: 'page' } );
	const shop = manifest( SHOP );
	assert.deepEqual( shop.entries[ 'template-cart' ].copy, { from: 'fill', row: 'page:cart' } );
	assert.deepEqual( shop.entries[ 'template-order-confirmation' ].copy, { from: 'fill', row: 'template:order-confirmation' } );
	assert.equal( shop.matched[ 'template-order-confirmation' ], 'S-7' );
	assert.equal( 'template-archive-product' in shop.entries, false, 'the shop row is its own template\'s surface' );
	assert.deepEqual( shop.entries.shop.copy, { from: 'whole' } );
	assert.equal( 'shell' in shop.entries.cart, false, 'WooCommerce\'s page keeps its own content' );
	assert.deepEqual( templateSurfaces( SHOP ).map( ( c ) => c.key ), [ 'template-page', 'template-search', 'template-404', 'template-product-search-results', 'template-taxonomy-product_attribute', 'template-cart', 'template-checkout', 'template-order-confirmation', 'template-page-my-account' ] );
} );

test( 'MUST FAIL: a template copy Filled on its own is read at the row playing it, and a template row has its template\'s address', () => {
	const r = surfaceReach( { key: 'template-cart', entry: { copy: { from: 'fill', row: 'page:cart' }, target: { template: 'cart' } }, skel: null, rows: SHOP } );
	assert.equal( r.row.slug, 'cart' );
	assert.equal( r.hash, '#/cart' );
	assert.equal( r.skip, null );
	const c = surfaceReach( { key: 'template-order-confirmation', entry: { copy: { from: 'fill', row: 'template:order-confirmation' }, target: { template: 'order-confirmation' } }, skel: null, rows: SHOP, routing: { adapter: 'files' } } );
	assert.equal( c.row.postType, 'template' );
	assert.equal( liveAddress( c.row, SHOP ), null, 'the confirmation shows only at an order endpoint' );
	assert.equal( liveAddress( row( { slug: 'search', postType: 'template', template: 'search' } ), [] ), '/?s=sgs' );
	assert.equal( liveAddress( SHOP[ 6 ], SHOP ), '/help/' );
} );

test( 'MUST FAIL: the run makes each copy from its pages\' shared shell, its own Fill, or the page copy, and adds the copy a named page sits in', () => {
	const surfaces = manifest( INDUS ).entries;
	assert.deepEqual( runKeys( surfaces, [ 'about' ] ), [ 'about', 'template-page', 'template-archive', 'template-search', 'template-404' ], 'its page copy, and the copies made from that copy\'s shell' );
	assert.deepEqual( runKeys( surfaces, [ 'template-page' ] ).sort(), [ 'template-404', 'template-archive', 'template-page', 'template-search' ] );
	const buildDir = fs.mkdtempSync( path.join( os.tmpdir(), 'copies-' ) );
	const other = [ { name: 'sgs/container', attributes: { tagName: 'div', backgroundColour: 'white' }, innerBlocks: [ SECTION( 'C' ) ] } ];
	const keys = Object.keys( surfaces );
	const out = copyTrees( { surfaces, keys, filled: { about: PAGE( 'A', 'B' ), contact: PAGE( 'C' ), home: PAGE( 'Hero', 'Story' ), 'template-single': PAGE( 'Post' ) }, buildDir } );
	assert.deepEqual( out.page.shell.chain, [ BG ] );
	assert.deepEqual( out.page.tree, copyTree( { slug: 'page', chain: [ BG ] } ) );
	assert.deepEqual( out[ 'front-page' ].tree[ 1 ].innerBlocks[ 0 ].innerBlocks, [ POST_CONTENT ], 'the home sections stay in the home page' );
	assert.deepEqual( out[ '404' ].tree, copyTree( { slug: '404', chain: [ BG ] } ) );
	assert.ok( find( out.single.tree, 'core/post-content' ) );
	assert.equal( 'home' in out, false, 'a copy with none of its pages Filled is not made' );
	const mixed = copyTrees( { surfaces, keys, filled: { about: PAGE( 'A' ), contact: other }, buildDir } );
	assert.deepEqual( mixed.page.shell.chain, [], 'pages with different backgrounds share no shell, so neither is wrapped in the other\'s' );
} );

test( 'the site run records a copy as the site build does: the tree hash and the saved content hash', () => {
	const php = templateRecordPhp( 'page', 'a'.repeat( 64 ) );
	assert.match( php, /sgs_site_build_templates/ );
	assert.match( php, /\$h\['page'\] = 'a{64}'/ );
	assert.match( php, /sgs_site_build_template_content/ );
	assert.doesNotMatch( templateRecordPhp( 'page' ), /sgs_site_build_templates'/ );
	assert.throws( () => templateRecordPhp( "page'; drop", null ), /not plain/ );
} );
