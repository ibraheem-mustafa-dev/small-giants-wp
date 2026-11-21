// Spec 48 FR-48-92: what the catalogue step plans for a found variable product when the catalogue gained a choice
// (lib/site-build-catalogue-axes.mjs, planCatalogue): a route-made product (its SKU is the catalogue's `sgs-draft-*`) lacks the
// choice, its terms and its variations and has old variations that miss a choice to trash or, when an order holds one, to set
// private; a product another author made is only noted; a state without the attribute detail plans as before. The write is
// run under php in tests/site-build-catalogue-axes-php.test.mjs. Tests marked MUST FAIL fail on the planner before the rule.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { planCatalogue } from '../lib/site-build-catalogue.mjs';
import { axisActs, axisChanges, axisLacks, axisNotes, routeMade } from '../lib/site-build-catalogue-axes.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';

const ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];
const setup = () => {
	const repo = repoWith( 'shared' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: ROWS } );
	return { jar: catalogue.products[ 0 ], catalogue: { ...catalogue, products: [ catalogue.products[ 0 ] ], gaps: [] } };
};
const row = ( id, sku, options, extra = {} ) => ( { id, sku, status: 'publish', options, ordered: false, ...extra } );
// The jar as the site holds it with the Pack size choice only: everything else the catalogue gives it is there.
const found = ( jar, extra = {} ) => ( {
	draftId: jar.draftId, id: 50, how: 'sku', fixture: false, type: 'variable', status: 'publish', sku: jar.sku, price: '', image: 7, gallery: 1, categories: jar.categories, brand: [], rrp: '', draftMeta: jar.draftId, photoToCome: false,
	attributes: [ 'pa_pack-size', 'pa_origin' ], variesBy: { 'pa_pack-size': [ 'size', 'size' ] }, variations: [ 'sgs-draft-jar-6', 'sgs-draft-jar-12' ], permalink: 'https://x.test/product/honey-jar/', facets: jar.facets,
	variationAttributes: [ 'pa_pack-size' ], attributeTerms: { 'pa_pack-size': [ '6', '12' ] }, variationRows: [ row( 51, 'sgs-draft-jar-6', { 'pa_pack-size': '6' } ), row( 52, 'sgs-draft-jar-12', { 'pa_pack-size': '12' } ) ], ...extra,
} );
const site = ( products ) => ( { woocommerce: true, products, images: {}, productBase: 'product', brandTaxonomy: true, plugins: [], facets: { origin: { id: 9, label: 'Origin', reserved: false, terms: { hills: '' } } } } );
const say = ( catalogue, s ) => planCatalogue( catalogue, site( [ s ] ) );
// The jar with both choices, every catalogue variation and nothing else.
const whole = ( jar, extra = {} ) => found( jar, {
	variationAttributes: [ 'pa_pack-size', 'pa_grain' ], attributeTerms: { 'pa_pack-size': [ '6', '12' ], pa_grain: [ 'Fine set', 'Coarse set' ] }, variesBy: { 'pa_pack-size': [ 'size', 'size' ], pa_grain: [ 'x' ] },
	attributes: [ 'pa_pack-size', 'pa_grain', 'pa_origin' ], variations: jar.variations.map( ( v ) => v.sku ),
	variationRows: jar.variations.map( ( v, i ) => row( 60 + i, v.sku, { 'pa_pack-size': v.options[ 'pack-size' ], pa_grain: 'x' } ) ), ...extra,
} );

test( 'MUST FAIL: a route-made product lacking a choice is completed with the choice, its variations and the trash of the old ones, each named', () => {
	const { jar, catalogue } = setup();
	const plan = say( catalogue, found( jar ) );
	assert.equal( plan.actions[ 0 ].action, 'complete' );
	assert.deepEqual( plan.notes.filter( ( n ) => /not made by the route/.test( n ) ), [], 'a route-made product is never noted as made by another author' );
	assert.match( plan.actions[ 0 ].say, /^complete jar: product 50 \(found by sku\) lacks the choice Grain \(Fine set\/Coarse set\), 4 of 4 variations; trashes 2 old variation\(s\) that miss a choice \(sgs-draft-jar-6, sgs-draft-jar-12\)$/ );
} );

test( 'MUST FAIL: an old variation an order holds is set private, not trashed; one already private is left and noted, and plans nothing', () => {
	const { jar, catalogue } = setup();
	const held = say( catalogue, found( jar, { variationRows: [ row( 51, 'sgs-draft-jar-6', { 'pa_pack-size': '6' }, { ordered: true } ), row( 52, 'sgs-draft-jar-12', { 'pa_pack-size': '12' } ) ] } ) );
	assert.match( held.actions[ 0 ].say, /; trashes 1 old variation\(s\) that miss a choice \(sgs-draft-jar-12\); sets 1 old variation\(s\) that miss a choice private, an order holds it \(sgs-draft-jar-6\)$/ );
	// Everything the catalogue gives is there and the one old variation left is private: nothing to do, and a note.
	const settled = whole( jar, { variations: [ 'sgs-draft-jar-6', ...jar.variations.map( ( v ) => v.sku ) ] } );
	settled.variationRows.unshift( row( 51, 'sgs-draft-jar-6', { 'pa_pack-size': '6' }, { status: 'private', ordered: true } ) );
	const plan = say( catalogue, settled );
	assert.equal( plan.actions[ 0 ].action, 'exists' );
	assert.ok( plan.notes.some( ( n ) => /jar: 1 old variation\(s\) that miss a choice stay private \(sgs-draft-jar-6\)/.test( n ) ) );
	// A private variation no order holds is left too (a person hid it): it is never trashed.
	const hidden = whole( jar, { variations: [ 'sgs-draft-jar-6', ...jar.variations.map( ( v ) => v.sku ) ] } );
	hidden.variationRows.unshift( row( 51, 'sgs-draft-jar-6', { 'pa_pack-size': '6' }, { status: 'private' } ) );
	assert.equal( say( catalogue, hidden ).actions[ 0 ].action, 'exists' );
} );

test( 'MUST FAIL: a term the catalogue\'s choice has and the product\'s attribute lacks is planned on that choice', () => {
	const { jar, catalogue } = setup();
	const plan = say( catalogue, whole( jar, { attributeTerms: { 'pa_pack-size': [ '6' ], pa_grain: [ 'Fine set', 'Coarse set' ] } } ) );
	assert.match( plan.actions[ 0 ].say, / lacks 12 on its Pack size choice$/ );
} );

test( 'a product another author made is never changed this way: its missing choice is a note, its old variations stay', () => {
	const { jar, catalogue } = setup();
	const plan = say( catalogue, found( jar, { sku: 'SEEDED', how: 'slug' } ) );
	assert.doesNotMatch( plan.actions[ 0 ].say, /choice|trash|private/ );
	assert.ok( plan.notes.some( ( n ) => /jar: product 50 \(SKU SEEDED\) was not made by the route, so its missing choice\(s\) Grain are left as they are/.test( n ) ) );
	// The SKU alone does not make it the route's: the prefix and the catalogue's own SKU both count.
	assert.equal( routeMade( jar, { sku: 'SEEDED' } ), false );
	assert.equal( routeMade( jar, { sku: 'sgs-draft-other' } ), false );
	assert.equal( routeMade( jar, { sku: jar.sku } ), true );
	assert.equal( routeMade( { sku: 'plain-jar' }, { sku: 'plain-jar' } ), false, 'the route prefix counts' );
} );

test( 'a product whose choices and variations match plans no axis step; a state without the attribute detail, or a catalogue product with no variation, plans none', () => {
	const { jar, catalogue } = setup();
	const done = whole( jar );
	assert.deepEqual( axisChanges( jar, done ), { axes: [], terms: [], trash: [], priv: [], kept: [] } );
	assert.deepEqual( [ axisLacks( axisChanges( jar, done ) ), axisActs( axisChanges( jar, done ) ), axisNotes( jar, done, axisChanges( jar, done ), true ) ], [ [], [], [] ] );
	const older = { ...found( jar ), variationAttributes: undefined };
	assert.equal( axisChanges( jar, older ), null );
	assert.doesNotMatch( say( catalogue, older ).actions[ 0 ].say, /choice|trash/ );
	assert.deepEqual( axisChanges( { ...jar, variations: [] }, found( jar ) ).trash, [], 'a product the catalogue gives no variation is never swept bare' );
	assert.equal( axisChanges( { ...jar, type: 'simple' }, found( jar ) ), null );
	assert.equal( axisChanges( jar, found( jar, { type: 'simple' } ) ), null );
	assert.equal( axisChanges( { ...jar, attributes: [] }, found( jar ) ), null );
} );

test( 'MUST FAIL: an old variation that misses a choice does not hold the place of its SKU: the catalogue variation with that SKU is still planned', () => {
	const { jar, catalogue } = setup();
	const plan = say( catalogue, found( jar, {
		variations: [ 'sgs-draft-jar-6-fine-set', 'sgs-draft-jar-12' ],
		variationRows: [ row( 51, 'sgs-draft-jar-6-fine-set', { 'pa_pack-size': '6' }, { status: 'private', ordered: true } ), row( 52, 'sgs-draft-jar-12', { 'pa_pack-size': '12' } ) ],
	} ) );
	assert.match( plan.actions[ 0 ].say, / 4 of 4 variations; trashes 1 old variation\(s\) that miss a choice \(sgs-draft-jar-12\)$/ );
} );
