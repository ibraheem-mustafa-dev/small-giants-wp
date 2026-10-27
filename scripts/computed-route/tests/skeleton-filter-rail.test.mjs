// rules.filterRail (Spec 48 FR-48-61): on the shop template's surface the draft's filter rail is the framework's working
// filter, WooCommerce's product filters inside the theme's #sgs-shop-filters aside, one heading and filter per group in
// the draft's order, found by structure from the draft catalogue's facets; a facet's filter names the site's attribute id,
// carried from catalogue.json. Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs) and the committed
// Eye Care shop inventory. Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: [ ...( x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [] ), ...( x.imported ? [ { kind: 'inside-import', template: x.template } ] : [] ) ], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: x.visible || { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const find = ( tree, test ) => {
	for ( const n of tree ) {
		if ( test( n ) ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], test );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const named = ( name ) => ( n ) => n.name === name;

// A group of the rail: the header button holding its label, then (when open) a body.
const group = ( i, label, body = [] ) => [
	el( `Root/6#${ i }`, 'Root/5#0', 'div', '', { depth: 4, loop: 6, all: [ label, ...body.map( ( b ) => b.words || b.all ) ].join( ' ' ) } ),
	el( `Root/7#${ i }`, `Root/6#${ i }`, 'button', '', { depth: 5, loop: 6, all: label } ),
	el( `Root/8#${ i }`, `Root/7#${ i }`, 'span', label, { depth: 6, loop: 6 } ),
	...( body.length ? [ el( `Root/10#${ i }`, `Root/6#${ i }`, 'div', '', { depth: 5, loop: 6, all: body.map( ( b ) => b.words || b.all ).join( ' ' ) } ) ] : [] ),
	...body.map( ( b, k ) => el( `Root/${ 11 + k }#${ i }`, `Root/10#${ i }`, b.tag, b.words || '', { depth: 6, loop: 6, attrs: b.attrs, keep: !! b.attrs } ) ),
];
const card = ( i, y ) => [
	el( `Root/31#${ i }`, 'Root/30#0', 'div', '', { depth: 3, loop: 31, all: `Cap ${ i } £12.00`, box: place( i % 3 * 300, y ) } ),
	el( `Root>Card@31#${ i }/2#0`, `Root/31#${ i }`, 'div', '£12.00', { depth: 4, template: 'Card', imported: true } ),
	// The first card names a filter label in its own text: the listing's words are never a filter label.
	...( i ? [] : [ el( `Root>Card@31#${ i }/3#0`, `Root/31#${ i }`, 'span', 'Shade', { depth: 4, template: 'Card', imported: true } ) ] ),
];
const RAIL = [
	el( 'Root/4#0', 'Root/3#0', 'aside', '', { depth: 2 } ),
	el( 'Root/5#0', 'Root/4#0', 'div', '', { depth: 3 } ),
	...group( 0, 'Shade', [ { tag: 'button', words: 'Ink' }, { tag: 'button', words: 'Sand' } ] ),
	...group( 1, 'Kind' ),
	...group( 2, 'Price', [ { tag: 'span', words: 'up to £40' } ] ),
	...group( 3, 'Brand', [ { tag: 'span', words: 'Acme 4' }, { tag: 'span', words: 'Bolt 2' } ] ),
	...group( 4, 'Fit', [ { tag: 'input', attrs: { type: 'checkbox' } }, { tag: 'span', words: 'Adults' } ] ),
	el( 'Root/20#0', 'Root/5#0', 'label', '', { depth: 4, all: 'Lined only' } ),
	el( 'Root/21#0', 'Root/20#0', 'span', 'Lined only', { depth: 5 } ),
];
const SHOP = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Shop' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...RAIL,
	el( 'Root/29#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	el( 'Root/30#0', 'Root/29#0', 'div', '', { depth: 2 } ),
	...card( 0, 200 ), ...card( 1, 200 ), ...card( 2, 200 ), ...card( 3, 400 ),
];
const facet = ( slug, label, kind = 'value', extra = {} ) => ( { field: slug, key: slug, label, slug, kind, terms: [ { name: label, swatch: null } ], wildcard: null, toggleLabel: null, axis: false, files: [ 'Store.dc.html' ], ...extra } );
const FACETS = [
	facet( 'shade', 'Shade', 'multi', { terms: [ { name: 'Ink', swatch: '#101820' }, { name: 'Sand', swatch: '#d8c3a5' } ] } ),
	facet( 'kind', 'Kind' ),
	facet( 'fit', 'Fit' ),
	facet( 'lined', 'Lined', 'boolean', { toggleLabel: 'Lined only' } ),
	facet( 'size', 'Size', 'value', { axis: true } ),
	facet( 'theme', 'Theme' ),
];
const SHOP_ROLE = ( facets = FACETS ) => ( { role: 'shop', checkout: null, filters: { facets, brands: [ 'Acme', 'Bolt' ], categories: [] } } );
const IDS = { shade: 21, kind: 22, fit: 23 };
const CARRIED = ( ids = IDS ) => ( { logo: () => null, menu: () => null, attribute: ( slug ) => ( ids[ slug ] ? { id: ids[ slug ] } : { reason: `no attribute for ${ slug }` } ) } );
const run = ( elements, commerce, carried = CARRIED() ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce, carried, db } );
const groupsOf = ( pf ) => pf.innerBlocks.slice( 1 ).map( ( n ) => ( 'sgs/heading' === n.name ? `h:${ n.attributes.content }` : n.name.replace( 'woocommerce/product-filter-', '' ) + ( n.attributes.attributeId ? `#${ n.attributes.attributeId }` : '' ) ) );

test( 'MUST FAIL: the shop\'s filter rail is WooCommerce\'s product filters inside the theme\'s aside, one heading and filter per group in the draft\'s order', () => {
	const { skeleton, proposal, problems } = run( SHOP, SHOP_ROLE() );
	assert.deepEqual( problems, [] );
	const aside = find( skeleton, ( n ) => 'sgs-shop-filters' === n.attributes?.anchor );
	assert.ok( aside, 'the rail is the #sgs-shop-filters aside' );
	assert.deepEqual( { name: aside.name, tagName: aside.attributes.tagName, className: aside.attributes.className }, { name: 'sgs/container', tagName: 'aside', className: 'sgs-shop-filters' } );
	assert.equal( aside.draftRef.tpl, 'Root/4#0', 'the aside is the draft\'s rail element, read by Fill' );
	const pf = aside.innerBlocks[ 0 ];
	assert.equal( pf.name, 'woocommerce/product-filters' );
	assert.equal( pf.innerBlocks[ 0 ].name, 'woocommerce/product-filter-active', 'the chosen filters and their clear button lead' );
	assert.ok( find( [ pf.innerBlocks[ 0 ] ], ( n ) => 'sgs/button' === n.name && /wp-block-button__link/.test( n.attributes.className ) ), 'the clear button is an sgs/button WooCommerce binds' );
	assert.deepEqual( groupsOf( pf ), [ 'h:Shade', 'attribute#21', 'h:Kind', 'attribute#22', 'h:Price', 'price', 'h:Brand', 'taxonomy', 'h:Fit', 'attribute#23' ] );
	assert.ok( find( skeleton, named( 'woocommerce/product-collection' ) ), 'the listing is still the product collection' );
	assert.equal( aside.innerBlocks.length, 1, 'nothing of the draft\'s rail is built beside the filters' );
	assert.deepEqual( proposal.filterRail.groups.map( ( g ) => [ g.kind, g.facet ?? null ] ), [ [ 'facet', 'shade' ], [ 'facet', 'kind' ], [ 'price', null ], [ 'brand', null ], [ 'facet', 'fit' ] ] );
	assert.deepEqual( proposal.filterRail.attributeIds, IDS );
	assert.ok( proposal.filterRail.notes.some( ( n ) => /Root\/20#0 "Lined only" filters nothing/.test( n ) ), 'the on-off row is the theme\'s toggle, listed, never a block' );
	assert.ok( proposal.rows.some( ( r ) => 'Root/8#0' === r.key && 'absorbed' === r.action ), 'the draft\'s group labels are absorbed into the rail' );
} );

test( 'MUST FAIL: each group heading carries the theme\'s heading class and the draft\'s look; open, swatch and checkbox groups say so', () => {
	const { skeleton } = run( SHOP, SHOP_ROLE() );
	const pf = find( skeleton, named( 'woocommerce/product-filters' ) );
	const heading = ( label ) => pf.innerBlocks.find( ( n ) => 'sgs/heading' === n.name && label === n.attributes.content );
	const after = ( label ) => pf.innerBlocks[ pf.innerBlocks.indexOf( heading( label ) ) + 1 ];
	assert.equal( heading( 'Shade' ).attributes.className, 'sgs-shop-filters__group-heading sgs-filter-open sgs-filter-swatches' );
	assert.equal( heading( 'Kind' ).attributes.className, 'sgs-shop-filters__group-heading', 'a group the draft shows closed starts closed' );
	assert.equal( heading( 'Fit' ).attributes.className, 'sgs-shop-filters__group-heading sgs-filter-open', 'no swatches, no swatch look' );
	assert.equal( heading( 'Shade' ).attributes.level, 'h3' );
	assert.equal( heading( 'Shade' ).draftRef.tpl, 'Root/8#0', 'the heading reads the draft\'s group label' );
	assert.ok( heading( 'Shade' ).draftFingerprint );
	assert.deepEqual( [ after( 'Shade' ).attributes.displayStyle, after( 'Shade' ).innerBlocks[ 0 ].name ], [ 'woocommerce/product-filter-chips', 'woocommerce/product-filter-chips' ] );
	assert.deepEqual( [ after( 'Fit' ).attributes.displayStyle, after( 'Fit' ).innerBlocks[ 0 ].name ], [ 'woocommerce/product-filter-checkbox-list', 'woocommerce/product-filter-checkbox-list' ], 'a group showing checkboxes is a checkbox list' );
	assert.deepEqual( { queryType: after( 'Kind' ).attributes.queryType, sortOrder: after( 'Kind' ).attributes.sortOrder }, { queryType: 'or', sortOrder: 'menu_order-asc' } );
	assert.equal( after( 'Brand' ).attributes.taxonomy, 'product_brand' );
	assert.equal( after( 'Price' ).innerBlocks[ 0 ].name, 'woocommerce/product-filter-price-slider' );
	assert.equal( JSON.stringify( pf ).includes( '"facet"' ), false, 'the facet marker never reaches the tree' );
	assert.equal( JSON.stringify( pf ).includes( 'draftKey' ), false, 'the label marker never reaches the tree' );
} );

test( 'MUST FAIL: a facet\'s attribute id comes from the site\'s record; a site without one is a problem, no site writes none', () => {
	const missing = run( SHOP, SHOP_ROLE(), CARRIED( { shade: 21 } ) );
	assert.deepEqual( missing.problems, [ 'Root/4#0: the filter for facet kind carries no attributeId: no attribute for kind', 'Root/4#0: the filter for facet fit carries no attributeId: no attribute for fit' ] );
	const none = run( SHOP, SHOP_ROLE(), { logo: () => null, menu: () => null, attribute: () => null } );
	assert.deepEqual( none.problems, [] );
	assert.equal( JSON.stringify( none.skeleton ).includes( 'attributeId' ), false );
	assert.deepEqual( none.proposal.filterRail.attributeIds, {} );
} );

test( 'categories the catalogue holds are a category filter; a group the catalogue holds nothing for is listed, not placed', () => {
	const els = SHOP.map( ( e ) => ( 'Root/6#3' === e.key ? { ...e, allText: 'Brand Gifts 4 Bundles 2' } : e ) );
	const cat = run( els, { ...SHOP_ROLE(), filters: { facets: FACETS, brands: [], categories: [ 'Gifts', 'Bundles' ] } } );
	assert.ok( find( cat.skeleton, ( n ) => 'product_cat' === n.attributes?.taxonomy ) );
	const none = run( els, { ...SHOP_ROLE(), filters: { facets: FACETS, brands: [], categories: [] } } );
	assert.ok( none.proposal.filterRail.notes.some( ( n ) => /Root\/6#3 "Brand" filters nothing the catalogue holds/.test( n ) ) );
	assert.equal( find( none.skeleton, named( 'woocommerce/product-filter-taxonomy' ) ), null );
} );

test( 'no rail without the structure: no catalogue, no placeable facet, another page role, labels only in the listing, or labels in two branches', () => {
	const absent = ( r ) => assert.equal( find( r.skeleton, named( 'woocommerce/product-filters' ) ), null );
	const plain = run( SHOP, { role: 'shop', checkout: null } );
	absent( plain );
	assert.equal( plain.proposal.filterRail, undefined );
	absent( run( SHOP, SHOP_ROLE( FACETS.filter( ( f ) => f.axis || 'boolean' === f.kind || 'theme' === f.slug ) ) ) );
	absent( run( SHOP, { ...SHOP_ROLE(), role: 'cart', checkout: 'Checkout.dc.html' } ) );
	absent( run( SHOP, null ) );
	// Only the cards carry the word: the listing's own text is never a filter label.
	absent( run( SHOP.filter( ( e ) => ! e.key.startsWith( 'Root/' ) || ! /^Root\/(4|5|6|7|8|10|11|12|13|20|21)#/.test( e.key ) ), SHOP_ROLE() ) );
	// The Kind label moved out of the rail, beside the heading: the labels sit in two branches.
	const split = SHOP.map( ( e ) => ( 'Root/8#1' === e.key ? { ...e, parentKey: 'Root/1#0', depth: 1 } : e ) );
	const r = run( split, SHOP_ROLE() );
	absent( r );
	assert.match( r.proposal.filterRail.note, /sit in 2 branches beside the product listing/ );
} );

test( 'a facet label shown twice places no group for it and says so; the rest of the rail stands', () => {
	const twice = [ ...SHOP, el( 'Root/25#0', 'Root/5#0', 'span', 'Kind', { depth: 4 } ) ];
	const { skeleton, proposal } = run( twice, SHOP_ROLE() );
	assert.ok( proposal.filterRail.notes.some( ( n ) => /"Kind" is labelled 2 times/.test( n ) ) );
	const pf = find( skeleton, named( 'woocommerce/product-filters' ) );
	assert.ok( ! groupsOf( pf ).includes( 'h:Kind' ) );
	assert.ok( groupsOf( pf ).includes( 'h:Shade' ) );
} );

test( 'MUST FAIL: commerceOf gives the shop the catalogue\'s facets, brands and categories (dropped products left out); other roles none', () => {
	const catalogue = { facets: FACETS, dropped: [ 'b' ], products: [ { draftId: 'a', brand: 'Acme', categories: [ 'Gifts' ] }, { draftId: 'b', brand: 'Gone', categories: [ 'Old' ] }, { draftId: 'c', brand: 'Acme', categories: [] } ] };
	assert.deepEqual( commerceOf( { target: { template: 'archive-product' } }, [], catalogue ).filters, { facets: FACETS, brands: [ 'Acme' ], categories: [ 'Gifts' ] } );
	assert.equal( commerceOf( { target: { template: 'cart' } }, [], catalogue ).filters, undefined );
	assert.equal( commerceOf( { target: { template: 'archive-product' } }, [] ).filters, undefined );
} );

test( 'MUST FAIL: the carried attribute id is the site\'s catalogue.json record, else the record of the site a mirror copies', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-rail-' ) );
	const build = path.join( repo, 'sites', 'demo', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	fs.writeFileSync( path.join( build, 'catalogue.json' ), JSON.stringify( { sites: { 'site-a': { attributes: { shade: 21, bad: 0 } }, 'eye-care-clone-test': { attributes: { shade: 31 } }, 'local-eye-care': { attributes: {} } } } ) );
	const c = carriedIds( { repo, client: 'demo', site: 'site-a' } );
	assert.deepEqual( c.attribute( 'shade' ), { id: 21 } );
	assert.match( c.attribute( 'kind' ).reason, /records no attribute for kind on site-a/ );
	assert.match( c.attribute( 'bad' ).reason, /records no attribute for bad/ );
	assert.match( carriedIds( { repo, client: 'demo', site: 'site-b' } ).attribute( 'shade' ).reason, /records no attributes for site-b/ );
	assert.equal( carriedIds( { repo, client: 'demo', site: null } ).attribute( 'shade' ), null );
	// A mirror (calibration-targets.json mirrorOf) whose own record lacks the facet reads the test site it copies.
	assert.match( carriedIds( { repo, client: 'demo', site: 'local-mamas' } ).attribute( 'shade' ).reason, /records no attributes for local-mamas or mamas-test/ );
	assert.deepEqual( carriedIds( { repo, client: 'demo', site: 'local-eye-care' } ).attribute( 'shade' ), { id: 31 } );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'the rule data is checked: a filter rail block or setting the framework lacks is refused', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const f = facts();
	const bad = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, filterRail: { ...f.decisions.rules.filterRail, heading: { ...f.decisions.rules.filterRail.heading, attributes: { level: 'h3', nope: 1 } }, groups: { ...f.decisions.rules.filterRail.groups, price: {} } } } } };
	const problems = decisionsProblems( bad );
	assert.ok( problems.includes( 'rules.filterRail writes nope on sgs/heading, a setting it does not have' ) );
	assert.ok( problems.includes( 'rules.filterRail.groups.price must name its block' ) );
} );

test( 'MUST FAIL: the committed Eye Care shop inventory places its rail: eight facet groups and the price and brand groups, in the draft\'s order', () => {
	const build = path.join( REPO, 'sites', 'eye-care-ward-end', 'build' );
	const inventory = JSON.parse( fs.readFileSync( path.join( build, 'skeleton', 'shop.inventory.json' ), 'utf8' ) );
	const catalogue = JSON.parse( fs.readFileSync( path.join( build, 'catalogue.json' ), 'utf8' ) );
	const ids = Object.fromEntries( catalogue.facets.map( ( f, i ) => [ f.slug, 100 + i ] ) );
	const commerce = commerceOf( { target: { template: 'archive-product' } }, [], catalogue );
	const { skeleton, problems } = proposeSkeleton( { inventory, facts: facts(), surface: 'page-shop', commerce, carried: CARRIED( ids ), db } );
	assert.deepEqual( problems, [] );
	const pf = find( skeleton, named( 'woocommerce/product-filters' ) );
	const heads = pf.innerBlocks.filter( ( n ) => 'sgs/heading' === n.name ).map( ( n ) => n.attributes.content );
	assert.deepEqual( heads, [ 'Gender', 'Size', 'Colour', 'Price', 'Brand', 'Style', 'Material', 'Frame type', 'Hinge', 'Nose pads' ] );
	const attrs = pf.innerBlocks.filter( named( 'woocommerce/product-filter-attribute' ) ).map( ( n ) => n.attributes.attributeId );
	assert.deepEqual( attrs, [ 'gender', 'size-filter', 'colour', 'style', 'material', 'frame-type', 'hinge', 'nose-pads' ].map( ( s ) => ids[ s ] ) );
	assert.equal( find( skeleton, ( n ) => 'sgs-shop-filters' === n.attributes?.anchor ).name, 'sgs/container' );
} );
