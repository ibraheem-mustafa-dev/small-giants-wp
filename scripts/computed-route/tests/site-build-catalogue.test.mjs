// Spec 48 FR-48-92, FR-48-55: the catalogue step of the site build (lib/site-build-catalogue.mjs) planned from a site
// state, the read PHP writing nothing, the id record in catalogue.json, and a draft product link resolving to the
// catalogue product's address (lib/draft-link.mjs). Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { catalogueImages, planCatalogue, recordSite, runCatalogue, tallyCatalogue } from '../lib/site-build-catalogue.mjs';
import { catalogueApplyPhp, catalogueStatePhp } from '../lib/site-build-catalogue-php.mjs';
import { linkContext, resolveDraftLink, linkWrite } from '../lib/draft-link.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';

const ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];
const setup = () => {
	const repo = repoWith( 'shared' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: ROWS } );
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( catalogue, null, 2 ) }\n` );
	return { repo, catalogue };
};
const site = ( products = [], extra = {} ) => ( { woocommerce: true, products, images: {}, productBase: 'product', brandTaxonomy: true, plugins: [], ...extra } );
const found = ( p, extra = {} ) => ( { draftId: p.draftId, id: 40, how: 'sku', fixture: false, type: p.type, status: 'publish', sku: p.sku, price: String( p.price ), image: 7, gallery: p.gallery.length, categories: p.categories, brand: p.brand ? [ p.brand ] : [], rrp: null === p.rrp ? '' : String( p.rrp ), draftMeta: p.draftId, attributes: [], variations: p.variations.map( ( v ) => v.sku ), permalink: `https://x.test/product/${ p.slug }/`, ...extra } );

test( 'an empty site plans a create per product; a complete one plans nothing to make', () => {
	const { catalogue } = setup();
	const empty = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	assert.deepEqual( tallyCatalogue( empty ), { create: 3, complete: 0, exists: 0, left: 0 } );
	assert.match( empty.actions[ 0 ].say, /create jar \(sgs-draft-jar\) variable "Honey Jar" at \/product\/honey-jar\/: price 4, 4 variations of Pack size \(6\/12\) x Grain/ );
	const full = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => found( p ) ) ) );
	assert.deepEqual( tallyCatalogue( full ), { create: 0, complete: 0, exists: 3, left: 0 } );
	assert.equal( full.productBase, null );
} );

test( 'a found product lacking a price, an image, a variation or its draft id is completed with exactly those', () => {
	const { catalogue } = setup();
	const [ jar, box ] = catalogue.products;
	const plan = planCatalogue( catalogue, site( [ found( jar, { variations: jar.variations.slice( 1 ).map( ( v ) => v.sku ) } ), found( box, { price: '', image: 0, draftMeta: '', how: 'slug', sku: 'OTHER' } ) ] ) );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.draftId, a.action ] ), [ [ 'jar', 'complete' ], [ 'box', 'complete' ], [ 'voucher', 'create' ] ] );
	assert.match( plan.actions[ 0 ].say, /lacks 1 of 4 variations$/ );
	assert.match( plan.actions[ 1 ].say, /found by slug\) lacks price 12, image, its draft id$/ );
} );

test( 'a product found by slug that has its own variations keeps them; one with none gets the catalogue\'s', () => {
	const { catalogue } = setup();
	const jar = catalogue.products[ 0 ];
	const own = planCatalogue( catalogue, site( [ found( jar, { sku: 'SEEDED', how: 'slug', variations: [ 'SEEDED-a' ] } ) ] ) );
	assert.equal( own.actions[ 0 ].action, 'exists' );
	const none = planCatalogue( catalogue, site( [ found( jar, { sku: 'SEEDED', how: 'slug', variations: [] } ) ] ) );
	assert.match( none.actions[ 0 ].say, /4 of 4 variations/ );
} );

test( 'a fixture or calibration product is left; a dropped product is not planned; a site without WooCommerce stops', () => {
	const { catalogue } = setup();
	const plan = planCatalogue( { ...catalogue, dropped: [ 'voucher' ] }, site( [ found( catalogue.products[ 0 ], { fixture: true, how: 'slug' } ), { draftId: 'box', id: 0 } ] ) );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.draftId, a.action ] ), [ [ 'jar', 'left' ], [ 'box', 'create' ] ] );
	assert.ok( plan.notes.some( ( n ) => /fixture or calibration product, left/.test( n ) ) );
	assert.deepEqual( planCatalogue( catalogue, { woocommerce: false } ).problems, [ 'the site has no active WooCommerce' ] );
} );

test( 'the product base the catalogue names is planned when the site differs; plugin notes say whether a gap stands', () => {
	const { catalogue } = setup();
	const plan = planCatalogue( { ...catalogue, productBase: 'goods' }, site( [], { productBase: '' } ) );
	assert.deepEqual( plan.productBase, { from: 'product', to: 'goods' } );
	assert.ok( plan.notes.some( ( n ) => /no subscriptions plugin is active.*switch gap\(s\) of jar stand/.test( n ) ) );
	assert.ok( plan.notes.some( ( n ) => /no gift-card plugin is active.*open-amount gap\(s\) of voucher stand/.test( n ) ) );
	const withPlugin = planCatalogue( catalogue, site( [], { plugins: [ 'woocommerce-subscriptions/woocommerce-subscriptions.php' ] } ) );
	assert.ok( withPlugin.notes.some( ( n ) => /woocommerce-subscriptions\.php is active/.test( n ) ) );
} );

test( 'the read PHP writes nothing; the apply PHP publishes last and writes the pack meta', () => {
	const { repo, catalogue } = setup();
	const images = catalogueImages( repo, catalogue );
	assert.deepEqual( Object.keys( images ).sort(), [ 'sites/demo/handoff/assets/box.png', 'sites/demo/handoff/assets/card.png', 'sites/demo/handoff/assets/jar-side.png', 'sites/demo/handoff/assets/jar.png' ] );
	assert.equal( images[ 'sites/demo/handoff/assets/jar.png' ].sha.length, 64 );
	const read = catalogueStatePhp( catalogue.products.map( ( p ) => ( { draftId: p.draftId, sku: p.sku, slug: p.slug } ) ), images );
	assert.doesNotMatch( read, /update_|wp_insert|wp_set_|->save\(|delete_|wp_update|set_post_thumbnail|media_sideload/ );
	const write = catalogueApplyPhp( [], images, {}, null );
	// A new product is saved as a draft and published only after its variations and image exist (the preflight gate).
	assert.match( write, /\$wc->set_status\( 'draft' \)/ );
	assert.ok( write.indexOf( "'post_status' => 'publish'" ) > write.indexOf( 'WC_Product_Variable::sync' ) );
	assert.match( write, /_sgs_unit_divisor/ );
	assert.match( write, /_sgs_pack_size_axis/ );
} );

test( 'a dry run reads once and writes nothing; an apply that leaves work fails and still records what exists', () => {
	const { repo, catalogue } = setup();
	const calls = [];
	const runPhp = ( php ) => {
		calls.push( php );
		return JSON.stringify( site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	};
	const out = [];
	assert.equal( runCatalogue( { repo, client: 'demo', site: 's', runPhp, apply: false, log: ( l ) => out.push( l ), error: ( l ) => out.push( l ) } ), 0 );
	assert.equal( calls.length, 1 );
	assert.ok( out.some( ( l ) => /3 to create/.test( l ) ) );
	const applyCalls = [];
	const applyPhp = ( php ) => {
		applyCalls.push( php );
		return /\$steps =/.test( php ) ? JSON.stringify( { done: [], issues: [] } ) : JSON.stringify( site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	};
	assert.equal( runCatalogue( { repo, client: 'demo', site: 's', runPhp: applyPhp, apply: true, log: () => {}, error: () => {} } ), 1 );
	assert.equal( applyCalls.length, 3 );
} );

test( 'recordSite writes the site\'s product ids into catalogue.json, skipping fixtures, and keeps the file valid', () => {
	const { repo, catalogue } = setup();
	const [ jar, box ] = catalogue.products;
	assert.equal( recordSite( repo, 'demo', 'local', site( [ found( jar, { id: 11 } ), found( box, { id: 12, fixture: true } ), { draftId: 'voucher', id: 0 } ] ), catalogue ), 1 );
	const after = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), 'utf8' ) );
	assert.deepEqual( after.sites.local.products, { jar: { id: 11, permalink: 'https://x.test/product/honey-jar/', variations: 4 } } );
	assert.deepEqual( after.products, catalogue.products );
} );

test( 'a draft product link resolves to its catalogue product; a choice query becomes the WooCommerce preselection; other queries drop; a dropped or unknown id stays a product-data handover', () => {
	const { catalogue } = setup();
	const ctx = linkContext( { rows: ROWS, catalogue } );
	assert.deepEqual( resolveDraftLink( 'Item.dc.html?id=box', ctx, { file: 'Shop.dc.html' } ), { kind: 'address', value: '/product/tea-box/', route: 'Item.dc.html' } );
	assert.equal( resolveDraftLink( 'Item.dc.html?id=jar&pack=12', ctx, { file: 'Shop.dc.html' } ).value, '/product/honey-jar/?attribute_pa_pack-size=12' );
	const gift = resolveDraftLink( 'Item.dc.html?id=jar&gift=1', ctx, { file: 'Shop.dc.html' } );
	assert.deepEqual( [ gift.value, gift.dropped ], [ '/product/honey-jar/', '?gift=1' ] );
	assert.equal( linkWrite( gift, 'Item.dc.html?id=jar&gift=1' ).handover.owner, 'behaviour' );
	assert.equal( resolveDraftLink( 'Item.dc.html?id=jar&pack=99', ctx, { file: 'Shop.dc.html' } ).dropped, '?pack=99' );
	for ( const [ href, c ] of [ [ 'Item.dc.html?id=gone', ctx ], [ 'Item.dc.html?id=box', linkContext( { rows: ROWS, catalogue: { ...catalogue, dropped: [ 'box' ] } } ) ], [ 'Item.dc.html?id=box', linkContext( { rows: ROWS } ) ] ] ) {
		const r = resolveDraftLink( href, c, { file: 'Shop.dc.html' } );
		assert.deepEqual( [ r.kind, r.owner ], [ 'unresolved', 'product-data' ] );
	}
} );
