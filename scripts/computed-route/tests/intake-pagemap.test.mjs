// Spec 48 FR-48-30 (the page map), FR-48-35 (the intake record schema), lib/intake-pagemap.mjs,
// lib/intake-pagemap-surfaces.mjs and lib/intake-ast-eval.mjs. Done when: every route and every CPT surface has one
// row, every link resolves to a row or a gap row, and the map validates against data/page-map.schema.json. Each
// check runs with a negative control that turns it red. The real exports are read last, read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems, classifyRoute, drawerRepeatsHeader } from '../lib/intake-pagemap.mjs';
import { readRouting } from '../lib/intake-routing.mjs';
import { loadDraft, evalStr, keyName } from '../lib/intake-ast.mjs';
import { evalDeep } from '../lib/intake-ast-eval.mjs';
import { loadAjv, schemaProblems } from '../lib/handoff.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const DATA = ( f ) => path.join( HERE, '..', 'data', f );
const real = ( slug ) => path.resolve( HERE, '../../../sites', slug, 'handoff' );
const ajv = loadAjv();
const CPT = /^sgs_/;

// The done-when checks as problem lists (empty = met).
function rowProblems( result, routing, extraRoutes = [] ) {
	const routes = new Set( result.rows.filter( ( r ) => r.route ).map( ( r ) => r.route ) );
	const linked = new Set( result.linkMap.filter( ( l ) => 'row' === l.kind ).map( ( l ) => l.slug ) );
	const out = [ ...routing.routes.map( ( r ) => r.key ), ...extraRoutes ].filter( ( k ) => ! routes.has( k ) && ! result.rows.some( ( r ) => linked.has( r.slug ) && r.route === k ) )
		.map( ( k ) => `route ${ k } has no row` );
	const counts = new Map();
	result.rows.forEach( ( r ) => r.route && counts.set( r.route, ( counts.get( r.route ) || 0 ) + 1 ) );
	counts.forEach( ( n, k ) => n > 1 && out.push( `route ${ k } has ${ n } rows` ) );
	return out;
}
function linkProblems( result ) {
	const slugs = new Set( result.rows.map( ( r ) => r.slug ) );
	return result.linkMap.filter( ( l ) => ( 'row' === l.kind && ! slugs.has( l.slug ) ) || ( 'gap' === l.kind && ! result.gaps.some( ( g ) => g.draftId === l.from ) )
		|| ! [ 'row', 'external', 'control', 'gap' ].includes( l.kind ) ).map( ( l ) => `${ l.from } ${ l.href } (${ l.kind }) is unaccounted` );
}
const bySlug = ( result, slug ) => result.rows.find( ( r ) => r.slug === slug );

const hashRouting = readRouting( { folder: FIX( 'hash' ) } );
const hashMap = proposePageMap( { folder: FIX( 'hash' ), routing: hashRouting } );

test( 'MUST FAIL: every route and every CPT surface has one row', () => {
	assert.deepEqual( rowProblems( hashMap, hashRouting, [ 'post-first', 'post-second' ] ), [] );
	assert.deepEqual( hashMap.rows.filter( ( r ) => CPT.test( r.postType ) ).map( ( r ) => `${ r.postType }:${ r.slug }` ).sort(), [
		'sgs_drawer:drawer-site-menu', 'sgs_footer:footer', 'sgs_form:form-contact', 'sgs_form:form-enquiry',
		'sgs_header:header', 'sgs_mega_menu:mega-menu-about', 'sgs_mega_menu:mega-menu-services', 'sgs_modal:modal-size-guide' ] );
	const dropped = { ...hashMap, rows: hashMap.rows.filter( ( r ) => 'team' !== r.route ) };
	assert.deepEqual( rowProblems( dropped, hashRouting ), [ 'route team has no row' ] );
	const doubled = { ...hashMap, rows: [ ...hashMap.rows, { ...bySlug( hashMap, 'team' ), slug: 'team-2' } ] };
	assert.deepEqual( rowProblems( doubled, hashRouting ), [ 'route team has 2 rows' ] );
} );

test( 'rows carry the route data: titles, parents from menu grouping, post rows from the getter, live collections, menus', () => {
	assert.equal( bySlug( hashMap, 'about' ).title, 'About us', 'crumb is the title' );
	assert.equal( bySlug( hashMap, 'first-article' ).title, 'First article', 'a crumb shared by every article falls through to hero.title' );
	assert.deepEqual( [ bySlug( hashMap, 'first-article' ).postType, bySlug( hashMap, 'first-article' ).route ], [ 'post', 'post-first' ] );
	assert.equal( bySlug( hashMap, 'team' ).parent, 'about', 'About links to its own page and holds Our team' );
	assert.equal( bySlug( hashMap, 'repairs' ).parent, null, 'Services only links to its first child, so it parents nothing' );
	assert.equal( bySlug( hashMap, 'news' ).collection, 'live', 'the news page lists the articles that have their own routes' );
	assert.equal( bySlug( hashMap, 'about' ).collection, 'static' );
	assert.deepEqual( bySlug( hashMap, 'contact' ).menus, [ { menu: 'header', position: 4, parentItem: null }, { menu: 'footer', position: 1, parentItem: null } ] );
	assert.deepEqual( bySlug( hashMap, 'mega-menu-about' ).menus, [ { menu: 'header', position: 2, parentItem: null } ] );
	assert.deepEqual( hashMap.rows.flatMap( ( r ) => r.menus ).filter( ( m ) => 'drawer' === m.menu ), [], 'the drawer menu repeats the header\'s mega sections, so it adds no entries (the drawer binds the header menu)' );
	assert.equal( hashMap.rows.filter( ( r ) => 'sgs_form' === r.postType && 'form-contact' === r.slug ).length, 1, 'the formOld block the filter drops is not a form' );
	assert.ok( hashMap.rows.every( ( r ) => null === r.id && Array.isArray( r.flags ) && 0 === r.flags.length ) );
} );

test( 'MUST FAIL: every link resolves to a row or a gap row; a planted unresolvable link is a gap row', () => {
	assert.deepEqual( linkProblems( hashMap ), [] );
	const planted = hashMap.linkMap.find( ( l ) => '#/nowhere' === l.href );
	assert.equal( planted.kind, 'gap' );
	assert.ok( hashMap.gaps.some( ( g ) => g.draftId === planted.from && g.error.includes( 'nowhere' ) ) );
	const noGaps = { ...hashMap, gaps: [] };
	assert.equal( linkProblems( noGaps ).length, 1, 'without its gap row the planted link is unaccounted' );
	const wrong = { ...hashMap, linkMap: [ ...hashMap.linkMap, { from: 'x', href: '#/team', kind: 'row', slug: 'no-such-row' } ] };
	assert.equal( linkProblems( wrong ).length, 1 );
} );

test( 'MUST FAIL: loop-variable links resolve through intake-ast-eval (evalStr alone leaves them run-time)', () => {
	const before = hashRouting.gaps.filter( ( g ) => g.error.includes( 'built at run time' ) ).map( ( g ) => g.draftId );
	assert.equal( before.length, 2, 'the routing reader leaves the sector and article links as gap rows' );
	for ( const from of before ) {
		assert.ok( hashMap.linkMap.filter( ( l ) => l.from === from ).every( ( l ) => 'row' === l.kind ), from );
		assert.ok( ! hashMap.gaps.some( ( g ) => g.draftId === from ), `${ from } is no longer a gap row` );
	}
	assert.deepEqual( hashMap.linkMap.filter( ( l ) => before[ 0 ] === l.from ).map( ( l ) => l.slug ).sort(), [ 'cleaning', 'repairs' ] );
	const d = loadDraft( FIX( 'hash' ), 'Site.dc.html' );
	const node = d.idx.all.find( ( n ) => 'ObjectProperty' === n.type && 'href' === keyName( n ) && 'BinaryExpression' === n.value.type && '#/' === n.value.left.value ).value;
	assert.deepEqual( evalStr( d.idx, node ).values, [], 'evalStr is unchanged: a loop variable stays unresolved' );
	assert.deepEqual( evalDeep( d.idx, node ).values, [ '#/cleaning', '#/repairs' ] );
} );

test( 'MUST FAIL: the page map validates against its schema; a bad slug, a missing key, a duplicate slug and a dangling parent are refused', () => {
	assert.deepEqual( pageMapProblems( hashMap.rows, ajv ), [] );
	const rows = structuredClone( hashMap.rows );
	rows[ 0 ].slug = 'Bad Slug';
	delete rows[ 1 ].id;
	rows[ 2 ].slug = rows[ 3 ].slug;
	rows[ 2 ].postType = rows[ 3 ].postType;
	rows[ 4 ].parent = 'nowhere';
	const p = pageMapProblems( rows, ajv );
	assert.ok( p.some( ( x ) => x.startsWith( '/0/slug' ) ), p.join( '\n' ) );
	assert.ok( p.some( ( x ) => x.startsWith( '/1 ' ) && x.includes( "'id'" ) ), p.join( '\n' ) );
	assert.ok( p.some( ( x ) => x.includes( 'used by more than one' ) ), p.join( '\n' ) );
	assert.ok( p.some( ( x ) => x.includes( 'parent "nowhere" names no' ) ), p.join( '\n' ) );
	// A page and a form (another post type) may share a slug; two pages may not, and a page's parent is a page.
	const shared = structuredClone( hashMap.rows );
	shared.push( { ...structuredClone( shared[ 3 ] ), postType: 'sgs_form', parent: null } );
	assert.deepEqual( pageMapProblems( shared, ajv ), [] );
	shared.push( structuredClone( shared[ 3 ] ) );
	assert.ok( pageMapProblems( shared, ajv ).some( ( x ) => x.includes( 'used by more than one' ) ) );
	const orphan = [ ...structuredClone( hashMap.rows ), { ...structuredClone( hashMap.rows[ 3 ] ), slug: 'only-a-form', postType: 'sgs_form', parent: null } ];
	orphan[ 4 ].parent = 'only-a-form';
	assert.ok( pageMapProblems( orphan, ajv ).some( ( x ) => x.includes( 'parent "only-a-form" names no' ) ) );
} );

test( 'MUST FAIL: a surface one source lacks is still a row plus a surfaces-disagree gap row; with no hint there are none', () => {
	const gaps = hashMap.gaps.filter( ( g ) => 'surfaces-disagree' === g.construct );
	assert.deepEqual( gaps.map( ( g ) => g.draftId ).sort(), [ 'Site.dc.html:18:1 <div aria-label="Size guide">', 'surfaces.json S-08' ] );
	assert.match( gaps.find( ( g ) => 'surfaces.json S-08' === g.draftId ).error, /no matching surface in the draft code/ );
	const none = proposePageMap( { folder: FIX( 'hash' ), routing: hashRouting, surfacesHint: null } );
	assert.equal( none.gaps.filter( ( g ) => 'surfaces-disagree' === g.construct ).length, 0 );
	assert.ok( ! none.rows.some( ( r ) => 'sgs_choice_flow' === r.postType ), 'the hint-only choice flow comes only from the hint' );
} );

test( 'MUST FAIL: an embedded data-sgs-manifest is the proposal; the rules fill what it lacks', () => {
	const m = proposePageMap( { folder: FIX( 'manifest' ) } );
	const routes = m.rows.filter( ( r ) => r.route ).map( ( r ) => `${ r.route }:${ r.slug }:${ r.postType }` );
	assert.deepEqual( routes, [ 'home:home:page', 'shop:shop:shop', 'signin:my-account:page', 'faq:faq:page' ], 'wp slugs and types come from the manifest' );
	assert.equal( bySlug( m, 'glasses' ).template, 'archive-product' );
	assert.ok( m.linkMap.some( ( l ) => 'my-account' === l.slug ), 'the signed-in view shares the one my-account row' );
	assert.ok( m.gaps.some( ( g ) => 'page-map' === g.construct && g.error.includes( '"help"' ) ), 'a manifest parent naming no row is a gap row' );
	assert.equal( bySlug( m, 'faq' ).parent, null );
	assert.deepEqual( pageMapProblems( m.rows, ajv ), [] );
	assert.deepEqual( linkProblems( m ), [] );
} );

test( 'classifyRoute: shop, product category, single product, cart, checkout, article, page', () => {
	assert.equal( classifyRoute( 'shop' ).postType, 'shop' );
	assert.equal( classifyRoute( 'catalogue Request Catalogue' ).postType, 'page', 'a catalogue with no priced items is a page' );
	assert.equal( classifyRoute( 'catalogue', { prices: true } ).postType, 'product_cat' );
	assert.deepEqual( classifyRoute( 'Product.dc.html' ), { postType: 'product', template: 'single-product', collection: 'live' }, 'a single product is a product row, never the shop' );
	assert.equal( classifyRoute( 'product archive' ).postType, 'shop' );
	assert.equal( classifyRoute( 'Basket' ).template, 'cart' );
	assert.equal( classifyRoute( 'checkout' ).template, 'checkout' );
	assert.equal( classifyRoute( 'post' ).postType, 'post' );
	assert.deepEqual( classifyRoute( 'about' ), { postType: 'page', template: null, collection: 'static' } );
} );

test( 'MUST FAIL: an empty-but-shaped intake record validates; one missing review, or with an off-list row type, is refused', () => {
	const schema = DATA( 'intake.schema.json' );
	const record = {
		schemaVersion: '1', client: 'test-client', takenOn: '2026-10-12T00:00:00.000Z', manifest: { schema_version: '1.0', files: {} },
		tools: { playwright: '1.0.0', browser: 'chromium 1', runtime: 'abc' }, harness: { clock: '2026-10-12T00:00:00.000Z', seed: 1, stepMs: 16 },
		census: [], inventory: { animations: [], surfaces: [] }, routing: { adapter: 'hash', routes: [], links: [] }, breakpoints: [],
		pageMap: hashMap.rows, palette: { tokens: [], rows: [], unused: [], oneOff: [] }, siteInfo: { rows: [], refused: [] },
		flags: [], draftDefects: [], notDefects: [], missingFeatures: [], skeletons: {}, notices: { prose: [], blockedHosts: [] }, gaps: [],
		review: [ { rowId: 'page:home', rowType: 'page-map', contentHash: 'h1', mark: null, markedOn: null, carriedFrom: null } ],
	};
	assert.deepEqual( schemaProblems( ajv, schema, record ), [] );
	const noReview = { ...record };
	delete noReview.review;
	assert.ok( schemaProblems( ajv, schema, noReview ).some( ( p ) => p.includes( "'review'" ) ) );
	const offList = { ...record, review: [ { ...record.review[ 0 ], rowType: 'colour' } ] };
	assert.ok( schemaProblems( ajv, schema, offList ).some( ( p ) => p.startsWith( '/review/0/rowType' ) ) );
	const badRow = { ...record, pageMap: [ { ...hashMap.rows[ 0 ], postType: 'attachment' } ] };
	assert.ok( schemaProblems( ajv, schema, badRow ).some( ( p ) => p.startsWith( '/pageMap/0/postType' ) ) );
	const flagNoId = { ...record, flags: [ { draftId: 'x' } ] };
	assert.ok( schemaProblems( ajv, schema, flagNoId ).some( ( p ) => p.includes( "'rowId'" ) ) );
} );

test( 'intake.schema.json inlines the page-map row unchanged (page-map.schema.json stays the single source)', () => {
	const intake = JSON.parse( fs.readFileSync( DATA( 'intake.schema.json' ), 'utf8' ) );
	const pageMap = JSON.parse( fs.readFileSync( DATA( 'page-map.schema.json' ), 'utf8' ) );
	assert.deepEqual( intake.$defs.pageMapRow, pageMap.items );
	assert.deepEqual( intake.properties.pageMap, { type: 'array', items: { $ref: '#/$defs/pageMapRow' } } );
} );

test( 'real exports: Indus, Eye Care and Mama\'s page maps', { skip: ! fs.existsSync( real( 'indus-foods' ) ) && 'no client exports in this checkout' }, () => {
	const routing = readRouting( { folder: real( 'indus-foods' ) } );
	assert.equal( routing.gaps.length, 3, 'before: the routing reader leaves 3 link gap rows' );
	const a = proposePageMap( { folder: real( 'indus-foods' ), routing } );
	const count = ( r, t ) => r.rows.filter( ( x ) => x.postType === t ).length;
	assert.ok( count( a, 'page' ) >= 23, `${ count( a, 'page' ) } page rows` );
	assert.equal( count( a, 'post' ), 6, 'one post row per article the pages getter adds' );
	assert.deepEqual( [ 'sgs_header', 'sgs_footer', 'sgs_drawer', 'sgs_mega_menu', 'sgs_form' ].map( ( t ) => count( a, t ) ), [ 1, 1, 1, 4, 4 ] );
	assert.deepEqual( a.rows.filter( ( r ) => 'sgs_mega_menu' === r.postType ).map( ( r ) => r.title ), [ 'About mega menu', 'Sectors mega menu', 'Brands mega menu', 'Trade mega menu' ] );
	assert.equal( a.linkMap.filter( ( l ) => 'gap' === l.kind ).length, 0, 'after: zero unresolved links' );
	assert.deepEqual( linkProblems( a ), [] );
	assert.deepEqual( rowProblems( a, routing ), [] );
	assert.equal( a.rows.find( ( r ) => 'our-story' === r.route ).parent, 'about' );
	assert.equal( a.rows.find( ( r ) => 'blog' === r.route ).collection, 'live' );
	const menuNames = ( r ) => [ ...new Set( r.rows.flatMap( ( x ) => x.menus.map( ( m ) => m.menu ) ) ) ].sort();
	assert.deepEqual( menuNames( a ), [ 'footer', 'header' ], 'Indus\'s drawer repeats its four mega sections: no drawer menu' );
	assert.deepEqual( pageMapProblems( a.rows, ajv ), [] );
	const c = proposePageMap( { folder: real( 'eye-care-ward-end' ) } );
	assert.equal( c.rows.find( ( r ) => 'shop' === r.route ).slug, 'sunglasses', 'Eye Care rows come from its embedded manifest' );
	assert.equal( c.rows.find( ( r ) => 'lenses' === r.route ).slug, 'prescription-lenses' );
	assert.deepEqual( menuNames( c ), [ 'drawer-1', 'drawer-2', 'header' ], 'Eye Care\'s drawer menus are not its mega sections, so they stay' );
	assert.deepEqual( pageMapProblems( c.rows, ajv ), [] );
	assert.deepEqual( linkProblems( c ), [] );
	const m = proposePageMap( { folder: real( 'mamas-munches-redesign' ) } );
	assert.equal( m.rows.filter( ( r ) => r.route ).length, 11 );
	assert.ok( menuNames( m ).includes( 'drawer-menu-links' ), 'Mama\'s drawer menu stays' );
	assert.deepEqual( pageMapProblems( m.rows, ajv ), [] );
	assert.deepEqual( linkProblems( m ), [] );
} );

test( 'MUST FAIL: only a drawer whose every top-level item is a header mega item repeats the header', () => {
	const megas = new Set( [ 'About', 'Brands' ] );
	const menu = ( region, labels ) => ( { region, items: labels.map( ( label ) => ( { label } ) ) } );
	assert.equal( drawerRepeatsHeader( menu( 'drawer', [ 'About', 'Brands' ] ), megas ), true );
	assert.equal( drawerRepeatsHeader( menu( 'drawer', [ 'About', 'Contact' ] ), megas ), false, 'a drawer with an item of its own keeps its menu' );
	assert.equal( drawerRepeatsHeader( menu( 'drawer', [] ), megas ), false );
	assert.equal( drawerRepeatsHeader( menu( 'header', [ 'About', 'Brands' ] ), megas ), false );
} );
