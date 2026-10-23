// Proves Spec 48 FR-48-60, FR-48-61, FR-48-62: a draft's buy box, filter and basket drawer are matched part by part.
// MUST FAIL controls: each known part maps to its home; an unknown part becomes a missing-features row and no unit is
// silently lost (dropping unmatched units fails the conservation test); a vocabulary entry naming a setting the
// framework DB does not hold, or a block the part or template file does not hold, is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readShopSurfaces } from '../lib/shop-parts-read.mjs';
import { ShopPartsError, buildRecord, loadVocab, resolveVocab } from '../lib/shop-parts.mjs';

const vocabFile = loadVocab();
// The framework facts a vocabulary needs, derived from the vocabulary itself: each anchored settings pattern names one
// attribute, each part or template home names the block comment its file holds.
const envFor = ( vocab ) => {
	const attrs = {};
	const files = {};
	for ( const e of vocab.entries ) {
		for ( const p of e.home.settings || [] ) {
			( attrs[ e.home.block ] ||= new Set() ).add( p.replace( /^\^|\$$/g, '' ) );
		}
		if ( e.home.file ) {
			files[ e.home.file ] = `${ files[ e.home.file ] || '' }<!-- ${ e.home.contains } /-->`;
		}
	}
	return { attrs, files };
};

const DRAFT = `<x-dc>
<main>
  <div>
    <h1>{{ p.name }}</h1>
    <sc-if value="{{ giftable }}"><label><input type="checkbox" onChange="{{ toggleGift }}"><span>Send it as a gift</span></label></sc-if>
    <button onClick="{{ add }}">{{ addLabel }}</button>
    <button onClick="{{ spin }}">Spin the wheel</button>
  </div>
  <div role="group" aria-label="Filter products">
    <span>{{ resultCount }}</span>
    <p>Hand-picked words that no part claims</p>
    <select onChange="{{ onSort }}"><option>Featured</option></select>
    <input type="range" onChange="{{ setPrice }}" aria-label="Maximum price">
    <button onClick="{{ clearFilters }}">Clear all</button>
    <button onClick="{{ randomise }}">Surprise me</button>
  </div>
  <aside aria-label="Basket">
    <div>Your basket <span>({{ count }})</span></div>
    <sc-for list="{{ items }}" as="it"><button onClick="{{ it.rm }}">Remove</button></sc-for>
    <a href="Checkout.dc.html">Checkout securely</a>
    <button onClick="{{ sparkle }}">Add sparkle</button>
  </aside>
</main>
</x-dc>`;
const RECORDS = [ { name: 'Product buy box', dc: 'Page' }, { name: 'Shop filter + sort', dc: 'Page' }, { name: 'Basket drawer (right)', dc: 'Page' } ];
const surfaces = () => readShopSurfaces( { records: RECORDS, sources: { 'Page.dc.html': DRAFT } } );
const record = ( vocab = vocabFile ) => buildRecord( { client: 'planted', surfaces: surfaces(), vocab: resolveVocab( vocab, envFor( vocab ) ) } );
const part = ( rec, kind, id ) => rec.surfaces.find( ( s ) => s.kind === kind ).parts.find( ( p ) => p.id === id );

test( 'each known part of a planted draft maps to its framework home', () => {
	const rec = record();
	assert.equal( part( rec, 'buybox', 'buybox-title' ).home.type, 'part' );
	assert.deepEqual( part( rec, 'buybox', 'buybox-add-to-basket' ).home, { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel', 'addToCartStyle', 'addToCartShowPrice' ] } );
	assert.equal( part( rec, 'filter', 'filter-result-count' ).home.contains, 'wp:woocommerce/product-results-count' );
	assert.equal( part( rec, 'filter', 'filter-sort' ).home.contains, 'wp:woocommerce/catalog-sorting' );
	assert.equal( part( rec, 'filter', 'filter-price' ).home.contains, 'wp:woocommerce/product-filter-price-slider' );
	assert.equal( part( rec, 'filter', 'filter-clear' ).home.contains, 'wp:woocommerce/product-filter-clear-button' );
	assert.deepEqual( part( rec, 'drawer', 'drawer-heading' ).write, { panelHeading: 'Your basket' } );
	assert.deepEqual( part( rec, 'drawer', 'drawer-checkout' ).write, { checkoutLabel: 'Checkout securely' } );
	assert.equal( part( rec, 'drawer', 'drawer-remove' ).home.settings[ 0 ], 'itemRemoveLabel' );
} );

test( 'an unknown part becomes a missing-features row in FR-48-34 shape', () => {
	const rec = record();
	const rows = rec.surfaces.flatMap( ( s ) => s.missing );
	for ( const word of [ 'Spin the wheel', 'Surprise me', 'Add sparkle' ] ) {
		const row = rows.find( ( r ) => r.rowId.toLowerCase().includes( word.toLowerCase() ) );
		assert.ok( row, `${ word } has no missing-features row` );
		assert.deepEqual( Object.keys( row ).sort(), [ 'construct', 'draftId', 'from', 'key', 'line', 'mainFlow', 'rowId', 'why' ] );
	}
	assert.ok( rows.some( ( r ) => r.rowId.includes( 'buybox-gift-note' ) && 'buy' === r.mainFlow ), 'the gift note is a missing row on the buy flow' );
} );

test( 'nothing is silently lost: every read unit lands in a part', () => {
	const rec = record();
	for ( const s of rec.surfaces ) {
		const placed = s.parts.reduce( ( n, p ) => n + p.units, 0 );
		const claimed = s.parts.filter( ( p ) => 'filter-result-count' === p.id ).reduce( ( n, p ) => n + p.units, 0 );
		const dropped = surfaces().find( ( x ) => x.kind === s.kind ).units.filter( ( u ) => 'filter' === s.kind && 'text' === u.kind ).length - claimed;
		assert.equal( placed, s.units - dropped, `${ s.kind }: ${ s.units } units read, ${ dropped } text runs a control-only surface ignores, ${ placed } placed` );
	}
	assert.equal( rec.counts.parts, rec.counts.mapped + rec.counts.missing + rec.counts.elsewhere );
} );

test( 'a setting the framework DB does not hold is refused', () => {
	const env = envFor( vocabFile );
	env.attrs[ 'sgs/cart' ].delete( 'checkoutLabel' );
	assert.throws( () => resolveVocab( vocabFile, env ), ( e ) => e instanceof ShopPartsError && /drawer-checkout: no sgs\/cart attribute matches \^checkoutLabel\$/.test( e.message ) );
} );

test( 'a block the framework DB does not hold, and a template that lost a block, are refused', () => {
	const env = envFor( vocabFile );
	delete env.attrs[ 'sgs/buybox' ];
	assert.throws( () => resolveVocab( vocabFile, env ), /the framework DB holds no block sgs\/buybox/ );
	const env2 = envFor( vocabFile );
	env2.files[ 'theme/sgs-theme/templates/archive-product.html' ] = '';
	assert.throws( () => resolveVocab( vocabFile, env2 ), /archive-product\.html holds no wp:woocommerce\/catalog-sorting/ );
} );

test( 'a surface the reader cannot find stays in the record with its problem', () => {
	const rec = buildRecord( { client: 'planted', surfaces: readShopSurfaces( { records: [], sources: {} } ), vocab: resolveVocab( vocabFile, envFor( vocabFile ) ) } );
	assert.equal( rec.counts.problems, 3 );
	assert.ok( rec.surfaces.every( ( s ) => s.problem && 0 === s.parts.length ) );
} );
