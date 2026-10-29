// The shop's sort control, result count and category chips (Spec 48 FR-48-61, FR-48-87): the draft's sort control and count are
// WooCommerce's catalog-sorting and product-results-count in a toolbar row at the top of the product collection (found by the
// shop parts record's stamps), a sort order WooCommerce cannot express is a missing feature, and chips that narrow the
// listing and are labelled with the catalogue's categories are WooCommerce's category filter. Synthetic inventories in the
// reader's shape. Tests marked MUST FAIL fail on the writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';
import { skeletonMissing } from '../lib/intake-missing.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: [ ...( x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [] ), ...( x.imported ? [ { kind: 'inside-import', template: x.template } ] : [] ) ], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements, commerce ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce, db } );
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
const card = ( i, y ) => [
	el( `Root/9#${ i }`, 'Root/8#0', 'div', '', { depth: 3, loop: 9, all: `Box ${ i } £12.00`, box: place( i % 4 * 300, y ) } ),
	el( `Root>ProductCard@9#${ i }/2#0`, `Root/9#${ i }`, 'div', '£12.00', { depth: 4, template: 'ProductCard', imported: true } ),
];
// A shop: a heading, a toolbar row (the count, then a wrapper holding a "Sort" label and the sort control with its options),
// and the grid of mounted product cards.
const SHOP = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Shop' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/4#0', 'Root/3#0', 'span', '12 products', { depth: 2 } ),
	el( 'Root/5#0', 'Root/3#0', 'label', '', { depth: 2 } ),
	el( 'Root/6#0', 'Root/5#0', 'span', 'Sort', { depth: 3 } ),
	el( 'Root/7#0', 'Root/5#0', 'select', '', { depth: 3 } ),
	el( 'Root/10#0', 'Root/7#0', 'option', 'Featured', { depth: 4, attrs: { value: 'featured' }, keep: true } ),
	el( 'Root/11#0', 'Root/7#0', 'option', 'Price: low to high', { depth: 4, attrs: { value: 'low' }, keep: true } ),
	el( 'Root/12#0', 'Root/7#0', 'option', 'Biggest saving', { depth: 4, attrs: { value: 'save' }, keep: true } ),
	el( 'Root/8#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...card( 0, 300 ), ...card( 1, 300 ), ...card( 2, 300 ), ...card( 3, 300 ), ...card( 4, 500 ),
];
const COMMERCE = { role: 'shop', checkout: null, toolbar: { sort: [ 7 ], count: [ 4 ] } };

test( 'MUST FAIL: the shop\'s result count and sort control are WooCommerce\'s, in a toolbar row at the top of the product collection', () => {
	const { skeleton, proposal, problems } = run( SHOP, COMMERCE );
	assert.deepEqual( problems, [] );
	const pc = find( skeleton, 'woocommerce/product-collection' );
	assert.deepEqual( pc.innerBlocks.map( ( n ) => n.name ), [ 'sgs/container', 'woocommerce/product-template' ], 'the toolbar comes before the product template' );
	const bar = pc.innerBlocks[ 0 ];
	assert.equal( bar.attributes.className, 'sgs-shop-toolbar' );
	assert.equal( bar.draftRef, undefined, 'the toolbar row does not read the product card\'s look' );
	assert.deepEqual( bar.innerBlocks.map( ( n ) => n.name ), [ 'woocommerce/product-results-count', 'woocommerce/catalog-sorting' ], 'in the draft\'s order' );
	assert.equal( pc.innerBlocks[ 1 ].innerBlocks[ 0 ].draftRef.tpl, 'Root/9#0', 'the product card is still read at the draft\'s first card' );
	assert.deepEqual( [ proposal.commerceRegion.toolbar.sort, proposal.commerceRegion.toolbar.count ], [ 'Root/7#0', 'Root/4#0' ] );
	assert.equal( find( skeleton, 'sgs/form-field-select' ), null, 'no SGS select imitates the sorting' );
	const absorbed = proposal.rows.filter( ( r ) => 'absorbed' === r.action && 'shopToolbar' === r.rule ).map( ( r ) => r.key );
	assert.ok( absorbed.includes( 'Root/3#0' ), 'the row holding only the count and the sort is drawn by the collection' );
	assert.ok( proposal.rows.filter( ( r ) => [ 'Root/4#0', 'Root/5#0', 'Root/6#0', 'Root/7#0' ].includes( r.key ) ).every( ( r ) => 'absorbed' === r.action ), 'the count, the label and the control are absorbed' );
	assert.equal( find( skeleton, 'sgs/heading' ).attributes.content, 'Shop', 'the heading stays' );
} );

test( 'MUST FAIL: a sort order WooCommerce cannot express is a missing-features row on its option; the orders it can are not', () => {
	const { proposal } = run( SHOP, COMMERCE );
	assert.deepEqual( proposal.commerceRegion.toolbar.missing.map( ( x ) => x.key ), [ 'Root/12#0' ] );
	const listed = skeletonMissing( proposal.rows );
	assert.deepEqual( listed.map( ( x ) => x.key ), [ 'Root/12#0' ] );
	assert.match( listed[ 0 ].line, /Biggest saving.*value save/ );
} );

test( 'a wrapper that holds other content stays: only the control and the label beside it are drawn', () => {
	const els = [ ...SHOP, el( 'Root/13#0', 'Root/5#0', 'a', 'Size guide', { depth: 3 } ) ];
	const { proposal } = run( els, COMMERCE );
	const row = ( k ) => proposal.rows.find( ( r ) => r.key === k );
	assert.notEqual( row( 'Root/5#0' ).action, 'absorbed', 'the label wrapper also holds a link, so it is not drawn by the sorting' );
	assert.equal( row( 'Root/7#0' ).action, 'absorbed' );
} );

test( 'negative control: without the record\'s stamps, with stamps the page does not show, or on a stamp inside the listing, nothing is placed', () => {
	for ( const commerce of [ { role: 'shop', checkout: null }, { role: 'shop', checkout: null, toolbar: { sort: [ 99 ], count: [ 98 ] } } ] ) {
		const { skeleton, proposal } = run( SHOP, commerce );
		assert.equal( find( skeleton, 'woocommerce/catalog-sorting' ), null );
		assert.equal( proposal.commerceRegion.toolbar, undefined );
		assert.equal( find( skeleton, 'woocommerce/product-collection' ).innerBlocks.length, 1 );
	}
	const hidden = SHOP.map( ( e ) => ( 'Root/7#0' === e.key ? { ...e, visible: { 375: false, 768: false, 1440: false } } : e ) );
	assert.equal( find( run( hidden, COMMERCE ).skeleton, 'woocommerce/catalog-sorting' ), null, 'a control never shown is no evidence' );
	const inside = run( SHOP, { role: 'shop', checkout: null, toolbar: { sort: [ 9 ], count: [] } } );
	assert.equal( find( inside.skeleton, 'woocommerce/catalog-sorting' ), null, 'a stamp that is a product card is never the sort control' );
	const onlySort = run( SHOP.filter( ( e ) => 'Root/4#0' !== e.key ), COMMERCE );
	assert.deepEqual( find( onlySort.skeleton, 'woocommerce/product-collection' ).innerBlocks[ 0 ].innerBlocks.map( ( n ) => n.name ), [ 'woocommerce/catalog-sorting' ], 'a draft with no count gets the sorting alone' );
} );

test( 'the toolbar keeps the order of the draft: a sort control before the count comes first', () => {
	const count = SHOP.find( ( e ) => 'Root/4#0' === e.key );
	const els = SHOP.filter( ( e ) => e !== count );
	els.splice( els.findIndex( ( e ) => 'Root/12#0' === e.key ) + 1, 0, count );
	const { skeleton } = run( els, COMMERCE );
	const bar = find( skeleton, 'woocommerce/product-collection' ).innerBlocks[ 0 ];
	assert.deepEqual( bar.innerBlocks.map( ( n ) => n.name ), [ 'woocommerce/catalog-sorting', 'woocommerce/product-results-count' ] );
} );

test( 'commerceOf gives the shop its sort and count stamps from the shop parts record, and the product none', () => {
	const record = { surfaces: [ { kind: 'filter', parts: [ { id: 'filter-sort', home: { contains: 'wp:woocommerce/catalog-sorting' }, locators: [ 'Shop/7' ] }, { id: 'filter-result-count', home: { contains: 'wp:woocommerce/product-results-count' }, locators: [ 'Shop/4' ] } ] } ] };
	assert.deepEqual( commerceOf( { target: { template: 'archive-product' } }, [], null, record ).toolbar, { sort: [ 7 ], count: [ 4 ] } );
	assert.equal( commerceOf( { target: { template: 'archive-product' } }, [], null, null ).toolbar, undefined );
	assert.equal( commerceOf( { target: { template: 'single-product' } }, [], null, record ).toolbar, undefined );
} );

// Category chips: the chips' handlers write a state key a list on the surface is filtered by (read from the draft's logic).
const N = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
const rec = ( key, realTag, attrs, parent, realParent, scFor, chain ) => ( { template: { key, component: 'Root', n: key.split( '/' ).pop(), tag: realTag, realTag, attrs, style: { static: [], holes: [] }, pseudo: {}, holes: [], parent, realParent, parentChain: chain, membership: { scIf: [], scFor, dcImport: [] }, own: {}, inHelmet: false, inFor: !! scFor.length, ref: null, hooks: {}, events: [], words: '', srcLine: 1 }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
function build( root ) {
	const elements = [];
	const recs = {};
	let n = 0;
	const walk = ( node, parentKey, depth, chain ) => {
		const id = ++n;
		const tk = `Root/${ id }`;
		const copies = Array.isArray( node.o.words ) ? node.o.words : [ node.o.words || '' ];
		const made = copies.map( ( w, i ) => ( { key: `${ tk }#${ i }`, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: node.o.attrs || {}, words: w, allText: w, membership: [], srcTag: node.tag, srcOwnText: w, snippet: `<${ node.tag } data-dc-tpl="${ id }">${ w }</${ node.tag }>`, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( x ) => [ x, { x: 0, y: id * 30, w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } ) );
		elements.push( ...made );
		const parentTk = parentKey ? parentKey.replace( /#\d+$/, '' ) : null;
		const list = node.o.loop ? ( true === node.o.loop ? 'xs' : node.o.loop ) : null;
		list && ( recs[ `Root/f${ id }` ] = rec( `Root/f${ id }`, 'sc-for', {}, parentTk, parentTk, [], chain ) );
		recs[ tk ] = rec( tk, node.o.real || node.tag, node.o.attrs || {}, list ? `Root/f${ id }` : parentTk, parentTk, list ? [ { key: `Root/f${ id }`, list: `{{ ${ list } }}`, as: 'x' } ] : [], chain );
		const texts = node.kids.map( ( k ) => walk( k, made[ 0 ].key, depth + 1, [ tk, ...chain ] ) );
		made.forEach( ( e ) => ( e.allText = [ e.words, ...texts ].filter( Boolean ).join( ' ' ) ) );
		return made[ 0 ].allText;
	};
	walk( root, null, 0, [] );
	return { inventory: { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements }, recs };
}
const LOGIC = ( write = '{ filter: id }' ) => `class Component {
	state = { filter: 'all', other: 1 };
	renderVals() {
		const { filter } = this.state;
		const shown = [ 'a', 'b' ].filter( ( p ) => 'all' === filter || p === filter );
		return { chips: [ 'a', 'b' ].map( ( id ) => ( { pick: () => this.setState( ${ write } ) } ) ), shown: shown.map( ( p ) => p ) };
	}
}`;
function chipsRun( labels, commerce, write ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'chips-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ LOGIC( write ) }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	const chip = N( 'button', { loop: 'chips', attrs: { 'aria-pressed': '{{ x.on }}' }, words: labels } );
	const b = build( N( 'section', {}, [ N( 'div', {}, [ chip ] ), N( 'ul', {}, [ N( 'li', { loop: 'shown', words: 'item' } ) ] ) ] ) );
	const f = { ...loadFacts( { db, client: 'fixture-client', repo: REPO } ), repo };
	const record = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } } };
	return proposeSkeleton( { inventory: b.inventory, facts: f, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: record, openers: {}, commerce } );
}
const CHIP_COMMERCE = { role: 'shop', checkout: null, filters: { facets: [], brands: [], categories: [ 'Cookies', 'Gifts', 'Vegan' ] } };

test( 'MUST FAIL: chips that narrow the listing and are labelled with the catalogue\'s categories are WooCommerce\'s category filter in its chips look', () => {
	const { skeleton, proposal } = chipsRun( [ 'All', 'Cookies', 'Gifts', 'Vegan' ], CHIP_COMMERCE );
	const filters = find( skeleton, 'woocommerce/product-filters' );
	assert.ok( filters, 'the chips are the product filters block' );
	const tax = filters.innerBlocks[ 0 ];
	assert.equal( tax.name, 'woocommerce/product-filter-taxonomy' );
	assert.deepEqual( [ tax.attributes.taxonomy, tax.attributes.displayStyle, tax.attributes.showCounts ], [ 'product_cat', 'woocommerce/product-filter-chips', false ] );
	assert.equal( tax.innerBlocks[ 0 ].name, 'woocommerce/product-filter-chips' );
	assert.equal( filters.draftRef, undefined, 'WooCommerce draws the filter: Fill reads nothing into it' );
	assert.equal( find( skeleton, 'sgs/option-picker' ), null, 'no SGS option picker imitates the filter' );
	assert.ok( proposal.rows.some( ( r ) => 'categoryChips' === r.rule && 'woocommerce/product-filters' === r.block ) );
} );

test( 'negative control: chips that name fewer than two categories, a page that is not the shop, or no catalogue stay the option picker', () => {
	for ( const [ labels, commerce ] of [
		[ [ 'All', 'Cookies', 'Other', 'More' ], CHIP_COMMERCE ],
		[ [ 'All', 'Cookies', 'Gifts', 'Vegan' ], { ...CHIP_COMMERCE, role: 'product' } ],
		[ [ 'All', 'Cookies', 'Gifts', 'Vegan' ], { role: 'shop', checkout: null } ],
		[ [ 'All', 'Cookies', 'Gifts', 'Vegan' ], null ],
	] ) {
		const { skeleton } = chipsRun( labels, commerce );
		assert.equal( find( skeleton, 'woocommerce/product-filters' ), null );
		assert.ok( find( skeleton, 'sgs/option-picker' ), 'the group is still the option picker' );
	}
	const wired = chipsRun( [ 'All', 'Cookies', 'Gifts', 'Vegan' ], CHIP_COMMERCE, '{ other: id }' );
	assert.equal( find( wired.skeleton, 'woocommerce/product-filters' ), null, 'chips whose choice narrows no list are no filter' );
} );
