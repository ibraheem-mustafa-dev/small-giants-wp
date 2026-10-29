// Spec 48 FR-48-92: the draft catalogue read from the draft code (lib/catalogue-read.mjs). Two exports: one keeping its
// records in a shared script the pages load (a looked-up list, choices on the product page, a switch with a gated
// choice, a multi-choice, an amount picked as the price), one keeping them as a class property (a recommended retail
// price, images from an address table, a brand, a manifest product route). Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { FLOW_ROWS, withFlow } from './fixtures/catalogue/flow.mjs';
import { readCatalogue, productAddress, skuOf, slugify, variesByOf } from '../lib/catalogue-read.mjs';
import { catalogueProblems, catalogueRecord, catalogueSummary, droppedIds } from '../lib/intake-catalogue-run.mjs';
import { reviewRows, markProblem } from '../lib/intake-review.mjs';

const SHARED_ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];
const SINGLE_ROWS = [ { route: 'shop', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'product', slug: 'product', postType: 'product', collection: 'live' } ];

const read = ( name, rows, edit, facts = undefined ) => readCatalogue( { repo: repoWith( name, edit ), client: 'demo', rows, facts } );
const byId = ( cat, id ) => cat.products.find( ( p ) => p.draftId === id );

test( 'shared script: the looked-up, priced list is the catalogue; a list with no price and a list nothing looks up are not', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	assert.deepEqual( catalogue.products.map( ( p ) => p.draftId ), [ 'jar', 'box', 'voucher' ] );
	assert.deepEqual( catalogue.source, { files: [ 'data.js' ], productPage: 'Item.dc.html', idKey: 'id' } );
	const box = byId( catalogue, 'box' );
	assert.deepEqual( [ box.type, box.price, box.rrp, box.sku, box.slug, box.name ], [ 'simple', 12, null, 'sgs-draft-box', 'tea-box', 'Tea Box' ] );
	assert.equal( box.shortDescription, 'Twelve loose-leaf teas in a tin box, posted through the letterbox.' );
	assert.deepEqual( box.image, { asset: 'sites/demo/handoff/assets/box.svg' } );
	assert.equal( byId( catalogue, 'jar' ).gallery.length, 2 );
	assert.deepEqual( catalogueProblems( catalogue ), [] );
} );

test( 'categories come from the array field the shop page filters on, named by the code\'s own label pairs; any other filter field is a facet', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	assert.deepEqual( byId( catalogue, 'jar' ).categories, [ 'Pantry', 'Sweet things' ] );
	assert.deepEqual( byId( catalogue, 'jar' ).facets, { origin: [ 'hills' ] } );
	assert.deepEqual( catalogue.facets.map( ( f ) => [ f.slug, f.kind, f.key, f.terms.map( ( t ) => t.name ) ] ), [ [ 'origin', 'value', 'origin', [ 'hills', 'coast' ] ] ] );
	assert.equal( catalogue.gaps.filter( ( g ) => 'facet' === g.kind ).length, 0 );
} );


test( 'MUST FAIL (RC16): an unpriced choice a choice flow asks, the multi-choice included, is an answer attribute; only the priced choice creates variations', () => {
	const { catalogue } = read( 'shared', FLOW_ROWS, withFlow );
	const jar = byId( catalogue, 'jar' );
	assert.equal( jar.type, 'variable' );
	assert.deepEqual( jar.attributes.map( ( a ) => [ a.key, a.label, a.slug, a.packSize, a.variation ] ), [ [ 'pack', 'Pack size', 'pack-size', true, true ], [ 'grain', 'Grain', 'grain', false, false ], [ 'tops', 'Top', 'top', false, false ] ] );
	assert.deepEqual( jar.attributes[ 2 ].options.map( ( o ) => [ o.value, o.term, o.price ] ), [ [ 'nuts', 'Nuts', null ], [ 'seeds', 'Seeds', null ], [ 'comb', 'Comb', null ] ] );
	assert.deepEqual( jar.attributes.map( ( a ) => a.default ), [ '6', 'Fine set', null ] );
	assert.deepEqual( jar.variations.map( ( v ) => [ v.sku, v.options, v.price ] ), [ [ 'sgs-draft-jar-6', { 'pack-size': '6' }, 4 ], [ 'sgs-draft-jar-12', { 'pack-size': '12' }, 7.5 ] ] );
	assert.ok( ! catalogue.gaps.some( ( g ) => 'multi-choice' === g.kind ), 'the multi-choice the flow asks travels as its answer' );
	assert.deepEqual( catalogueProblems( catalogue ), [] );
	// Negative control: the same flow without its page-map row asks nothing, so the grain stays a variation axis and the
	// multi-choice a gap row.
	const off = byId( read( 'shared', SHARED_ROWS, withFlow ).catalogue, 'jar' );
	assert.deepEqual( [ off.attributes.map( ( a ) => [ a.key, a.variation ] ), off.variations.length ], [ [ [ 'pack', true ], [ 'grain', true ] ], 4 ] );
	// A choice the flow's basket call reads for another product is not asked for this one.
	const other = byId( read( 'shared', FLOW_ROWS, ( to ) => {
		withFlow( to );
		const f = path.join( to, 'Builder.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( "add: () => D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.pack })", "add: () => { D.basket.add({ key: 'jar', id: 'jar', tops: S.tops, pack: S.pack }); D.basket.add({ key: 'box', id: 'box', grain: S.grain }); }" ) );
	} ).catalogue, 'jar' );
	assert.deepEqual( other.attributes.map( ( a ) => [ a.key, a.variation ] ), [ [ 'pack', true ], [ 'grain', true ], [ 'tops', false ] ] );
} );

test( 'a priced whole-number choice is a pack size; with a second choice no flow asks every combination is a variation priced by the pack', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	const jar = byId( catalogue, 'jar' );
	assert.equal( jar.type, 'variable' );
	assert.deepEqual( jar.attributes.map( ( a ) => [ a.key, a.label, a.slug, a.packSize, a.variation ] ), [ [ 'pack', 'Pack size', 'pack-size', true, true ], [ 'grain', 'Grain', 'grain', false, true ] ] );
	assert.deepEqual( jar.attributes[ 0 ].options.map( ( o ) => [ o.term, o.price, o.badge ] ), [ [ '6', 4, null ], [ '12', 7.5, 'Popular' ] ] );
	assert.deepEqual( jar.attributes[ 1 ].options.map( ( o ) => [ o.term, o.swatch ] ), [ [ 'Fine set', '#E8C468' ], [ 'Coarse set', '#B8862B' ] ] );
	assert.deepEqual( [ jar.attributes[ 0 ].default, jar.attributes[ 1 ].default ], [ '6', 'Fine set' ] );
	assert.deepEqual( jar.variations.map( ( v ) => [ v.sku, v.price ] ), [ [ 'sgs-draft-jar-6-fine-set', 4 ], [ 'sgs-draft-jar-6-coarse-set', 4 ], [ 'sgs-draft-jar-12-fine-set', 7.5 ], [ 'sgs-draft-jar-12-coarse-set', 7.5 ] ] );
	assert.equal( jar.price, 4 );
} );

test( 'a multi-choice no flow asks, a switch with its price factor and gated choice, and an amount picked as the price are gap rows; the quantity is none', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	const kinds = catalogue.gaps.filter( ( g ) => '*' !== g.draftId ).map( ( g ) => `${ g.draftId }:${ g.kind }` );
	assert.deepEqual( kinds, [ 'jar:multi-choice', 'jar:switch', 'voucher:open-amount', 'voucher:no-variesby' ] );
	const sw = catalogue.gaps.find( ( g ) => 'switch' === g.kind );
	assert.match( sw.detail, /"gift".*multiplies the price by 0\.8.*"every" \(1, 2\)/ );
	assert.match( catalogue.gaps.find( ( g ) => 'multi-choice' === g.kind ).detail, /Nuts, Seeds, Comb/ );
	const voucher = byId( catalogue, 'voucher' );
	assert.deepEqual( [ voucher.type, voucher.attributes[ 0 ].packSize, voucher.attributes[ 0 ].variation, voucher.variations.map( ( v ) => v.price ) ], [ 'variable', false, true, [ 10, 20 ] ] );
	assert.equal( byId( catalogue, 'box' ).attributes.length, 0 );
} );

test( 'the product page\'s basket line wins over a quick-add elsewhere; without the page row\'s file every line counts', () => {
	const edit = ( to ) => {
		const shop = path.join( to, 'Shop.dc.html' );
		fs.writeFileSync( shop, fs.readFileSync( shop, 'utf8' ).replace( 'const top =', 'const quick = () => D.basket.add({ id: \'jar\', price: 4 });\n    const top =' ) );
	};
	assert.equal( byId( read( 'shared', SHARED_ROWS, edit ).catalogue, 'jar' ).type, 'variable' );
	const off = read( 'shared', [ SHARED_ROWS[ 0 ], { ...SHARED_ROWS[ 1 ], route: 'Elsewhere.dc.html' } ], edit ).catalogue;
	assert.equal( byId( off, 'jar' ).type, 'simple' );
	assert.ok( off.gaps.some( ( g ) => 'jar' === g.draftId && 'basket-line' === g.kind ) );
	// The quick-add names jar by a literal id, so it never competes for another product's line.
	assert.ok( ! off.gaps.some( ( g ) => 'box' === g.draftId ) );
} );

test( 'two choices that each carry a price are a gap row and the product is made with neither; an answer a flow asks stays', () => {
	const pricedGrain = ( to ) => {
		const f = path.join( to, 'Item.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( "grains: pickOne(D ? D.grains : [], 'grain'),", 'grains: (D ? D.grains : []).map(o => ({ ...o, t: money(o.add), pick: () => this.setState({ grain: o.id }) })),' ) );
	};
	const { catalogue } = read( 'shared', SHARED_ROWS, pricedGrain );
	const jar = byId( catalogue, 'jar' );
	assert.deepEqual( [ jar.type, jar.attributes.length ], [ 'simple', 0 ] );
	assert.match( catalogue.gaps.find( ( g ) => 'priced-choices' === g.kind ).detail, /pack, grain/ );
	const asked = byId( read( 'shared', FLOW_ROWS, ( to ) => ( withFlow( to ), pricedGrain( to ) ) ).catalogue, 'jar' );
	assert.deepEqual( [ asked.type, asked.attributes.map( ( a ) => [ a.key, a.variation ] ) ], [ 'simple', [ [ 'tops', false ] ] ] );
} );

test( 'class property: two price fields give price and RRP, images come from the address table, brand from the filtered brand field, the base from the manifest', () => {
	const { catalogue } = read( 'single', SINGLE_ROWS );
	assert.equal( catalogue.productBase, 'goods' );
	assert.deepEqual( catalogue.products.map( ( p ) => [ p.draftId, p.price, p.rrp, p.brand, p.slug ] ), [ [ '1', 30, 40, 'Northline', 'northline-ridge-cap' ], [ '2', 32, 32, 'Northline', 'northline-ridge-cap-2' ], [ '3', 45, 60, 'Saltway', 'saltway-harbour-hat' ] ] );
	assert.deepEqual( catalogue.products.map( ( p ) => p.image ), [ { url: 'https://images.example.test/a.jpg' }, null, { url: 'https://images.example.test/b.jpg' } ] );
	assert.deepEqual( catalogue.products[ 0 ].attributes.map( ( a ) => [ a.label, a.options.map( ( o ) => o.term ), a.default ] ), [ [ 'Size', [ 'S', 'M', 'L' ], 'M' ] ] );
	assert.ok( catalogue.gaps.some( ( g ) => 'slug' === g.kind && '2' === g.draftId ) );
	assert.deepEqual( catalogue.facets.map( ( f ) => [ f.field, f.slug, f.terms.map( ( t ) => `${ t.name }${ t.swatch || '' }` ) ] ), [ [ 'fit', 'fit', [ 'Snug', 'Loose' ] ], [ 'cols', 'col', [ 'Black#111111', 'Red#aa2222' ] ] ] );
	assert.deepEqual( catalogue.products[ 0 ].facets, { fit: [ 'Snug' ], col: [ 'Black', 'Red' ] } );
	assert.deepEqual( catalogue.products[ 0 ].categories, [] );
	assert.equal( productAddress( catalogue, catalogue.products[ 2 ] ), '/goods/saltway-harbour-hat/' );
	assert.deepEqual( catalogueProblems( catalogue ), [] );
} );

test( 'no live product row: no catalogue and a note; a live row with no priced records: a no-records gap', () => {
	const none = read( 'single', [ SINGLE_ROWS[ 0 ], { ...SINGLE_ROWS[ 1 ], collection: 'static' } ] );
	assert.deepEqual( [ none.catalogue.products.length, none.catalogue.source ], [ 0, null ] );
	assert.match( none.notes[ 0 ], /no live product row/ );
	const bare = read( 'single', SINGLE_ROWS, ( to ) => {
		const f = path.join( to, 'Store.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( /price: (\d+), rrp: (\d+)/g, 'cost: \'$1\', was: \'$2\'' ).replace( /this\.gbp\(p\.(price|rrp)\)/g, 'p.cost' ) );
	} );
	assert.deepEqual( bare.catalogue.products, [] );
	assert.deepEqual( bare.catalogue.gaps.map( ( g ) => g.kind ), [ 'no-records' ] );
} );

test( 'two price fields neither always higher are a price gap, and the list is not read as products', () => {
	const r = read( 'single', SINGLE_ROWS, ( to ) => {
		const f = path.join( to, 'Store.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( 'price: 45, rrp: 60', 'price: 45, rrp: 20' ) );
	} );
	assert.deepEqual( r.catalogue.gaps.map( ( g ) => g.kind ), [ 'price', 'no-records' ] );
} );

test( 'the schema refuses a product with no SKU prefix and a gap of an unknown kind', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	assert.ok( catalogueProblems( { ...catalogue, products: [ { ...catalogue.products[ 0 ], sku: 'jar' } ] } ).length > 0 );
	assert.ok( catalogueProblems( { ...catalogue, gaps: [ { draftId: '*', kind: 'whim', detail: 'x' } ] } ).length > 0 );
	assert.equal( skuOf( 'Big Jar' ), 'sgs-draft-big-jar' );
	assert.equal( slugify( 'Dolce & Gabbana DG1' ), 'dolce-and-gabbana-dg1' );
} );

test( 'the review lists a row per product and per gap; drop is a valid mark and names the dropped id; a rewrite keeps the sites section', () => {
	const { catalogue } = read( 'shared', SHARED_ROWS );
	const intake = { catalogue: catalogueSummary( catalogue ), review: [] };
	const rows = reviewRows( intake ).filter( ( r ) => 'catalogue' === r.rowType );
	assert.equal( rows.length, catalogue.products.length + catalogue.gaps.length );
	assert.equal( rows.find( ( r ) => 'catalogue:box' === r.rowId ).proposed, '/product/tea-box/' );
	assert.equal( markProblem( 'catalogue', 'drop' ), null );
	assert.notEqual( markProblem( 'catalogue', 'edit:x' ), null );
	assert.deepEqual( droppedIds( { review: [ { rowId: 'catalogue:box', rowType: 'catalogue', mark: 'drop' }, { rowId: 'catalogue:jar', rowType: 'catalogue', mark: 'accept' }, { rowId: 'page:page:box', rowType: 'page-map', mark: 'drop' }, { rowId: 'catalogue-gap:*:facet:1', rowType: 'catalogue', mark: 'drop' } ] } ), [ 'box' ] );
	const kept = catalogueRecord( catalogue, { sites: { s: { builtAt: 'x', products: { box: { id: 5, permalink: '/product/tea-box/' } } } } }, [ 'box' ] );
	assert.deepEqual( [ kept.dropped, kept.sites.s.products.box.id ], [ [ 'box' ], 5 ] );
	assert.deepEqual( catalogueProblems( kept ), [] );
} );

test( 'variesBy: a pack size is size, a size or colour axis is named by its own words, an amount or a swatched recipe is none and its product is a no-variesby gap', () => {
	const shared = read( 'shared', SHARED_ROWS ).catalogue;
	assert.deepEqual( byId( shared, 'jar' ).attributes.map( ( a ) => [ a.key, a.variesBy ] ), [ [ 'pack', 'size' ], [ 'grain', null ] ] );
	assert.deepEqual( byId( shared, 'voucher' ).attributes.map( ( a ) => a.variesBy ), [ null ] );
	const held = shared.gaps.filter( ( g ) => 'no-variesby' === g.kind );
	assert.deepEqual( held.map( ( g ) => g.draftId ), [ 'voucher' ] );
	assert.match( held[ 0 ].detail, /"amount".*color, size, material, pattern, suggestedAge, suggestedGender.*no_variesby/ );
	const single = read( 'single', SINGLE_ROWS ).catalogue;
	assert.deepEqual( single.products.map( ( p ) => p.attributes[ 0 ].variesBy ), [ 'size', 'size', 'size' ] );
	assert.ok( ! single.gaps.some( ( g ) => 'no-variesby' === g.kind ) );
	assert.deepEqual( [ variesByOf( 'Frame colour', 'curCol', false ), variesByOf( 'Shade', 'colorPick', false ), variesByOf( 'Finish', 'material', false ), variesByOf( 'Amount', 'amount', false ), variesByOf( 'Amount', 'amount', true ), variesByOf( 'Sizes', 'x', false ), variesByOf( 'Message', 'page', false ) ], [ 'color', 'color', 'material', null, 'size', 'size', null ] );
	assert.deepEqual( catalogueProblems( shared ), [] );
	assert.ok( catalogueProblems( { ...shared, products: [ { ...byId( shared, 'jar' ), attributes: [ { ...byId( shared, 'jar' ).attributes[ 0 ], variesBy: 'flavour' } ] } ] } ).length > 0 );
} );

// A fact record holding the headings the draft shows for the option loops: the product page's grain list (an earlier text
// and a later one beside it) and the flow's toppings list (its heading under a bound line, carrying its step number), and
// another component's grain list with its own heading.
const el = ( component, n, tag, parent, words = '', list = null ) => [ `${ component }/${ n }`, { template: { key: `${ component }/${ n }`, component, n: String( n ), realTag: tag, parent: parent ? `${ component }/${ parent }` : null, words, holes: list ? [ { id: 'attr:list#0', where: 'attr:list', expr: list, path: list, whole: true } ] : [] } } ];
const HEADINGS = { elements: Object.fromEntries( [
	el( 'Other', 1, 'main', null ), el( 'Other', 2, 'p', 1, 'Another grain list' ), el( 'Other', 3, 'sc-for', 1, '', 'grains' ),
	el( 'Item', 1, 'main', null ), el( 'Item', 2, 'p', 1, 'Made by hand' ), el( 'Item', 3, 'p', 1, 'Choose a grain' ), el( 'Item', 4, 'div', 1 ), el( 'Item', 5, 'sc-for', 4, '', 'grains' ), el( 'Item', 6, 'p', 1, 'Ships tomorrow' ),
	el( 'Builder', 1, 'main', null ), el( 'Builder', 2, 'div', 1, '{{ step }}' ), el( 'Builder', 3, 'span', 2, '2 · Toppings' ), el( 'Builder', 4, 'span', 2, 'Pick any' ), el( 'Builder', 5, 'div', 1 ), el( 'Builder', 6, 'sc-for', 5, '', 'tops' ),
] ) };

test( 'MUST FAIL: an attribute is named by the heading the draft shows for its options (the product page, then the flow, less its step number), its slug kept short', () => {
	const jar = byId( read( 'shared', FLOW_ROWS, withFlow, HEADINGS ).catalogue, 'jar' );
	assert.deepEqual( jar.attributes.map( ( a ) => [ a.key, a.label, a.slug ] ), [ [ 'pack', 'Pack size', 'pack-size' ], [ 'grain', 'Choose a grain', 'grain' ], [ 'tops', 'Toppings', 'top' ] ] );
	// Negative control: a choice whose code holds a label keeps it; with no fact record the key names it, and a note says so.
	const coded = byId( read( 'shared', FLOW_ROWS, ( to ) => {
		withFlow( to );
		const f = path.join( to, 'Item.dc.html' );
		fs.writeFileSync( f, fs.readFileSync( f, 'utf8' ).replace( 'const S = this.state,', "const groups = [ { key: 'grain', label: 'Grain size' }, { key: 'tops', label: 'Extras' } ];\n    const S = this.state," ) );
	}, HEADINGS ).catalogue, 'jar' );
	assert.deepEqual( coded.attributes.map( ( a ) => a.label ), [ 'Pack size', 'Grain size', 'Extras' ] );
	const bare = read( 'shared', FLOW_ROWS, withFlow, null );
	assert.deepEqual( byId( bare.catalogue, 'jar' ).attributes.map( ( a ) => a.label ), [ 'Pack size', 'Grain', 'Top' ] );
	assert.ok( bare.notes.some( ( n ) => /choice "tops": neither the code nor the draft's template names it, so its attribute is named "Top" from its key/.test( n ) ) );
} );
