// Spec 48 FR-48-30 and FR-48-56: every page-map row names the theme template it matches by what the surface is, read
// from the draft code (lib/intake-pagemap-templates.mjs, lib/intake-pagemap-owners.mjs, lib/intake-pagemap-commerce.mjs).
// Fixtures: templates-hash (a hash export with a posts page, a non-post collection page, a search page, a help page with
// a search field and no results loop, a page whose title alone says search, and a router fallback by `? :`),
// templates-hash-or (a router fallback by `||`), templates-files (a files export whose front page is the header's brand
// link, a not-found page nothing links to, a linked page whose heading says not found, an unlinked page whose title
// alone says 404, and a search page), shop-files and commerce (WooCommerce pages and the order confirmation).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems } from '../lib/intake-pagemap.mjs';
import { runPageMap } from '../lib/intake-pagemap-regen.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const hash = proposePageMap( { folder: FIX( 'templates-hash' ) } );
const hashOr = proposePageMap( { folder: FIX( 'templates-hash-or' ) } );
const files = proposePageMap( { folder: FIX( 'templates-files' ) } );
const shop = proposePageMap( { folder: FIX( 'shop-files' ) } );
const bakery = proposePageMap( { folder: FIX( 'commerce' ) } );
const at = ( map, route ) => map.rows.find( ( r ) => r.route === route );
const shape = ( map, route ) => {
	const r = at( map, route );
	return r ? `${ r.slug }:${ r.postType }:${ r.template }` : 'none';
};
const wordGap = ( map, route ) => map.gaps.some( ( g ) => g.draftId === route && /by its words alone/.test( g.error ) );

test( 'MUST FAIL: the front page is front-page: the empty-hash route, or the site header\'s brand link outside its nav', () => {
	assert.equal( shape( hash, 'home' ), 'home:page:front-page' );
	assert.equal( shape( files, 'Welcome.dc.html' ), 'welcome:page:front-page', 'the logo link outside the nav, not the first nav link, not the first file' );
	assert.equal( shape( files, 'About.dc.html' ), 'about:page:page', 'a loop of links with no search field is no search page' );
	assert.equal( shape( shop, 'Home.dc.html' ), 'home:page:front-page', 'with no brand link the route slugged home is the front page' );
} );

test( 'MUST FAIL: the one page listing the posts is home; a page listing another collection is a page; posts are single', () => {
	assert.equal( shape( hash, 'journal' ), 'journal:page:home' );
	assert.deepEqual( [ at( hash, 'team' ).collection, at( hash, 'team' ).template ], [ 'live', 'page' ], 'the team page lists people, not posts' );
	assert.deepEqual( hash.rows.filter( ( r ) => 'post' === r.postType ).map( ( r ) => r.template ), [ 'single', 'single' ] );
	assert.equal( hash.rows.some( ( r ) => 'listsPosts' in r ), false, 'the working flag leaves no trace in a row' );
} );

test( 'MUST FAIL: the account page (a password field, or WooCommerce\'s added my-account row) is an ordinary page', () => {
	assert.equal( shape( shop, 'Account.dc.html' ), 'my-account:page:page' );
	assert.equal( shape( bakery, 'Account.dc.html' ), 'my-account:page:page' );
	assert.equal( shape( files, 'Account.dc.html' ), 'my-account:page:page', 'on a client with no shop, and its order search does not make it the search page' );
	assert.equal( proposePageMap( { folder: FIX( 'manifest' ) } ).rows.find( ( r ) => 'my-account' === r.slug ).template, 'page', 'a manifest page slugged my-account' );
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-account-' ) );
	fs.cpSync( FIX( 'commerce' ), tmp, { recursive: true } );
	fs.rmSync( path.join( tmp, 'Account.dc.html' ) );
	const added = proposePageMap( { folder: tmp } ).rows.filter( ( r ) => 'my-account' === r.slug );
	assert.deepEqual( added.map( ( r ) => `${ r.route }:${ r.template }` ), [ 'undefined:page' ], 'the my-account row a shop client is given' );
} );

test( 'MUST FAIL: the confirmation the checkout\'s submit leads to is its own order-confirmation row; cart and checkout keep theirs', () => {
	assert.deepEqual( at( shop, 'Confirmation.dc.html' ), { route: 'Confirmation.dc.html', slug: 'order-confirmation', title: 'Order confirmed', parent: null, template: 'order-confirmation', menus: [], postType: 'template', collection: 'static', flags: [], id: null } );
	assert.equal( ( at( shop, 'Checkout.dc.html' ).parts || [] ).some( ( p ) => 'endpoint' === p.kind ), false, 'the checkout has no endpoint part' );
	assert.ok( shop.linkMap.some( ( l ) => 'order-confirmation' === l.slug && l.from.startsWith( 'Checkout.dc.html' ) ), 'the pay handler\'s link resolves to the confirmation row' );
	assert.deepEqual( [ shape( shop, 'Basket.dc.html' ), shape( shop, 'Checkout.dc.html' ) ], [ 'cart:page:cart', 'checkout:page:checkout' ] );
	assert.equal( shape( bakery, 'Done.dc.html' ), 'order-confirmation:template:order-confirmation' );
	assert.equal( shape( bakery, 'Terms.dc.html' ), 'terms:page:page', 'a page the checkout only links to stays a page' );
} );

test( 'MUST FAIL: a search field with a results loop is the search template row; a FAQ filter or a title alone is not', () => {
	assert.equal( shape( hash, 'find' ), 'search:template:search', 'a field in a role="search" landmark' );
	assert.equal( shape( files, 'Results.dc.html' ), 'search:template:search', 'an input type="search"' );
	assert.equal( shape( hash, 'help' ), 'help:page:page', 'a search field over a loop of disclosures holds no results' );
	assert.equal( wordGap( hash, 'help' ), false );
	assert.equal( shape( hash, 'search-tips' ), 'search-tips:page:page' );
	assert.ok( wordGap( hash, 'search-tips' ), '"Search tips" is a gap row' );
} );

test( 'MUST FAIL: the router\'s fallback route, or an unlinked page whose heading says not found, is the 404 template row', () => {
	assert.deepEqual( [ shape( hash, 'help/missing' ), at( hash, 'help/missing' ).parent ], [ '404:template:404', null ], '`pages[ key ] ? key : \'help/missing\'`; a template row takes no parent from its route' );
	assert.equal( shape( hashOr, 'gone' ), '404:template:404', '`pages[ key ] || pages.gone`' );
	assert.equal( shape( files, 'Lost.dc.html' ), '404:template:404', 'nothing links to it and its heading says "Page not found"' );
	assert.equal( shape( files, 'Notes.dc.html' ), 'notes:page:page', 'the header links to it, so a not-found heading does not make it the 404' );
	assert.equal( shape( files, 'Orphan.dc.html' ), 'orphan:page:page' );
	assert.ok( wordGap( files, 'Orphan.dc.html' ), '"Error 404" in its title alone is a gap row' );
	assert.equal( shape( proposePageMap( { folder: FIX( 'hash' ) } ), 'home' ), 'home:page:front-page', 'a router falling back to home has no 404' );
	assert.equal( [ hash, hashOr, files ].every( ( m ) => m.rows.every( ( r ) => 'template' !== r.postType || null === r.parent ) ), true );
} );

test( 'MUST FAIL: every other page is page; layout and CPT rows keep no template; every map validates', () => {
	assert.deepEqual( [ 'about', 'person-ada' ].map( ( r ) => shape( hash, r ) ), [ 'about:page:page', 'ada:page:page' ] );
	assert.deepEqual( [ ...new Set( [ hash, files, shop, bakery ].flatMap( ( m ) => m.rows.filter( ( r ) => /^(sgs_|wp_block)/.test( r.postType ) ).map( ( r ) => r.template ) ) ) ], [ null ] );
	assert.equal( [ hash, files, shop, bakery ].flatMap( ( m ) => m.rows ).filter( ( r ) => /^(page|post|template)$/.test( r.postType ) && ! r.template ).length, 0, 'no route row is left without a template' );
	for ( const m of [ hash, hashOr, files, shop, bakery ] ) {
		assert.deepEqual( pageMapProblems( m.rows ), [] );
	}
} );

test( 'MUST FAIL: regenerating an old map adds the confirmation row with no id, re-applies a mark by its row id and loses nothing', () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-templates-' ) );
	const site = path.join( root, 'sites', 'c' );
	fs.cpSync( FIX( 'shop-files' ), path.join( site, 'handoff' ), { recursive: true } );
	fs.mkdirSync( path.join( site, 'build', 'intake' ), { recursive: true } );
	const row = ( slug, extra ) => ( { slug, title: slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...extra } );
	const old = [ row( 'checkout', { route: 'Checkout.dc.html', template: 'checkout', id: 11, parts: [ { kind: 'endpoint', label: 'Order confirmed', owner: 'woocommerce', draftId: 'Checkout.dc.html:9:1 (logic)' } ] } ), row( 'my-account', { route: 'Account.dc.html', id: 12 } ), row( 'home', { route: 'Home.dc.html', id: 13 } ) ];
	fs.writeFileSync( path.join( site, 'build', 'page-map.json' ), JSON.stringify( old ) );
	fs.writeFileSync( path.join( site, 'build', 'intake', 'intake.json' ), JSON.stringify( { review: [ { rowId: 'page:template:order-confirmation', rowType: 'page-map', contentHash: 'h', mark: 'edit:title=Thanks for your order', markedOn: '2026-10-26', carriedFrom: null } ] } ) );
	const said = [];
	assert.equal( runPageMap( { client: 'c', repo: root }, { log: ( l ) => said.push( l ) } ), 0, said.join( '\n' ) );
	const rows = JSON.parse( fs.readFileSync( path.join( site, 'build', 'page-map.json' ), 'utf8' ) );
	const done = rows.find( ( r ) => 'template' === r.postType && 'order-confirmation' === r.slug );
	assert.deepEqual( [ done.title, done.id, done.template ], [ 'Thanks for your order', null, 'order-confirmation' ] );
	assert.deepEqual( [ 'checkout', 'my-account', 'home' ].map( ( s ) => rows.find( ( r ) => 'page' === r.postType && r.slug === s )?.id ), [ 11, 12, 13 ], 'every id carries' );
	assert.match( said.join( '\n' ), /1 review marks matched/ );
	assert.match( said.join( '\n' ), /added template:order-confirmation/ );
	assert.match( said.join( '\n' ), /page:my-account: template null -> "page"/ );
	assert.doesNotMatch( said.join( '\n' ), /loses rows/ );
} );
