// Spec 48 FR-48-61: a true-or-false catalogue facet is the theme's on-off filter, so the catalogue step of the site build
// sets the theme mods the theme's toggle reads (lib/site-build-catalogue-toggle.mjs), fills only what the site lacks, never
// overwrites a differing value, and reads its write back. Against an in-memory site. The test marked MUST FAIL fails on
// the catalogue step before the toggle; tests/fixtures/catalogue/toggle-mutations.json breaks each mechanism.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { runCatalogue } from '../lib/site-build-catalogue.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { planToggle, runToggle, toggleApplyPhp, toggleFacet, toggleStatePhp, TOGGLE_MODS } from '../lib/site-build-catalogue-toggle.mjs';

const facet = ( slug, label, kind = 'value', extra = {} ) => ( { field: slug, key: slug, label, slug, kind, terms: [ { name: label, swatch: null } ], wildcard: null, toggleLabel: null, axis: false, files: [ 'Store.dc.html' ], ...extra } );
const CATALOGUE = ( ...extra ) => ( { facets: [ facet( 'kind', 'Kind' ), facet( 'polarised', 'Polarised', 'boolean' ), ...extra ] } );
const decode = ( php ) => JSON.parse( Buffer.from( /base64_decode\( '([^']+)' \)/.exec( php )[ 1 ], 'base64' ).toString() );

// An in-memory site: its theme mods, and the term slug WooCommerce gave the facet's term (when the attribute exists).
function siteWith( mods = {}, termSlug = 'polarised', { sticky = true } = {} ) {
	const writes = [];
	const runPhp = ( php ) => {
		if ( /set_theme_mod/.test( php ) ) {
			const set = decode( php );
			writes.push( set );
			sticky && Object.assign( mods, set );
			return JSON.stringify( { set: Object.keys( set ) } );
		}
		assert.match( php, /get_theme_mod/ );
		return JSON.stringify( { mods: Object.fromEntries( decode( php ).mods.map( ( m ) => [ m, mods[ m ] ?? null ] ) ), termSlug } );
	};
	return { runPhp, writes, mods };
}
const lines = () => {
	const out = [];
	return { out, log: ( l ) => out.push( l ), error: ( l ) => out.push( `E ${ l }` ) };
};

test( 'the boolean facet\'s toggle is set on a site without one: enabled, from the attribute, its slug and term slug; the theme labels it', () => {
	const s = siteWith();
	const l = lines();
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: s.runPhp, apply: true, log: l.log, error: l.error } ), 0 );
	assert.deepEqual( s.writes, [ { sgs_shop_filter_boolean_enabled: true, sgs_shop_filter_boolean_source: 'attribute', sgs_shop_filter_boolean_attribute: 'polarised', sgs_shop_filter_boolean_term: 'polarised' } ] );
	assert.ok( l.out.some( ( x ) => /done: on-off filter: pa_polarised is the theme's toggle/.test( x ) ) );
	assert.ok( l.out.some( ( x ) => /the theme labels it "<term> only"/.test( x ) ) );
} );

test( 'the draft\'s toggle text is the label; the term slug is the one WooCommerce gave the term', () => {
	const s = siteWith( {}, 'polarised-2' );
	const catalogue = { facets: [ facet( 'polarised', 'Polarised', 'boolean', { toggleLabel: 'Polarised lenses only', terms: [ { name: 'Polarised lenses', swatch: null } ] } ) ] };
	assert.equal( runToggle( { catalogue, runPhp: s.runPhp, apply: true, log: () => {}, error: () => {} } ), 0 );
	assert.equal( s.writes[ 0 ].sgs_shop_filter_boolean_label, 'Polarised lenses only' );
	assert.equal( s.writes[ 0 ].sgs_shop_filter_boolean_term, 'polarised-2' );
	assert.deepEqual( decode( toggleStatePhp( catalogue.facets[ 0 ] ) ), { mods: TOGGLE_MODS, tax: 'pa_polarised', term: 'Polarised lenses' } );
} );

test( 'a site already holding the toggle plans nothing and writes nothing; a dry run never writes', () => {
	const set = { sgs_shop_filter_boolean_enabled: '1', sgs_shop_filter_boolean_source: 'attribute', sgs_shop_filter_boolean_attribute: 'polarised', sgs_shop_filter_boolean_term: 'polarised' };
	const s = siteWith( { ...set } );
	assert.equal( planToggle( CATALOGUE(), { mods: set, termSlug: 'polarised' } ).action, 'exists' );
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: s.runPhp, apply: true, log: () => {}, error: () => {} } ), 0 );
	assert.deepEqual( s.writes, [] );
	const dry = siteWith();
	const l = lines();
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: dry.runPhp, apply: false, log: l.log, error: l.error } ), 0 );
	assert.deepEqual( dry.writes, [] );
	assert.ok( l.out.some( ( x ) => /on-off filter: theme mods for pa_polarised term polarised/.test( x ) ) );
} );

test( 'a differing value the site holds is never overwritten: the toggle is left and named', () => {
	const s = siteWith( { sgs_shop_filter_boolean_enabled: true, sgs_shop_filter_boolean_attribute: 'lens-type', sgs_shop_filter_boolean_term: 'polarised' } );
	const l = lines();
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: s.runPhp, apply: true, log: l.log, error: l.error } ), 0 );
	assert.deepEqual( s.writes, [] );
	assert.ok( l.out.some( ( x ) => /left the on-off filter: the site's sgs_shop_filter_boolean_attribute is "lens-type"/.test( x ) ) );
	// A switched-off toggle is unset, not a differing choice.
	assert.equal( planToggle( CATALOGUE(), { mods: { sgs_shop_filter_boolean_enabled: false }, termSlug: 'polarised' } ).action, 'set' );
	// A term not made yet (a dry run before the facets) never reads as a differing term.
	assert.equal( planToggle( CATALOGUE(), { mods: { sgs_shop_filter_boolean_term: 'polarised' }, termSlug: '' } ).action, 'set' );
} );

test( 'a write the site does not keep fails the step; a term not made yet is planned and fails an apply', () => {
	const s = siteWith( {}, 'polarised', { sticky: false } );
	const l = lines();
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: s.runPhp, apply: true, log: l.log, error: l.error } ), 1 );
	assert.ok( l.out.some( ( x ) => /E FAILED: the on-off filter is not set after the write/.test( x ) ) );
	const plan = planToggle( CATALOGUE(), { mods: {}, termSlug: '' } );
	assert.equal( plan.action, 'set' );
	assert.equal( 'sgs_shop_filter_boolean_term' in plan.set, false );
	assert.match( plan.say, /term the slug of "Polarised" once made/ );
	assert.equal( runToggle( { catalogue: CATALOGUE(), runPhp: siteWith( {}, '' ).runPhp, apply: true, log: () => {}, error: () => {} } ), 1 );
} );

test( 'no boolean facet, nothing to do; a second boolean facet is a note; an axis never counts', () => {
	assert.equal( toggleFacet( { facets: [ facet( 'kind', 'Kind' ), facet( 'lined', 'Lined', 'boolean', { axis: true } ) ] } ).facet, null );
	assert.equal( runToggle( { catalogue: { facets: [ facet( 'kind', 'Kind' ) ] }, runPhp: () => assert.fail( 'no read' ), apply: true, log: () => {}, error: () => {} } ), 0 );
	const two = toggleFacet( CATALOGUE( facet( 'lined', 'Lined', 'boolean' ) ) );
	assert.equal( two.facet.slug, 'polarised' );
	assert.deepEqual( two.notes, [ 'the boolean facet "Lined" has no toggle: the theme holds one on-off filter, given to "Polarised"' ] );
	assert.match( toggleApplyPhp( { sgs_shop_filter_boolean_enabled: true } ), /set_theme_mod\( \$m, \$v \)/ );
} );

test( 'MUST FAIL: the catalogue step plans the toggle in its dry run and sets it in its apply, after the products and facets', () => {
	const repo = repoWith( 'facets' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: [ { route: 'shop', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'product', slug: 'product', postType: 'product', collection: 'live' } ] } );
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( catalogue, null, 2 ) }\n` );
	const facets = Object.fromEntries( catalogue.facets.map( ( f, i ) => [ f.slug, { id: 10 + i, label: f.label, reserved: false, terms: Object.fromEntries( f.terms.map( ( t ) => [ t.name, t.swatch || '' ] ) ) } ] ) );
	const products = catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 40, how: 'sku', fixture: false, type: p.type, status: 'publish', sku: p.sku, price: String( p.price ), image: 7, gallery: p.gallery.length, categories: p.categories, brand: [], rrp: '', draftMeta: p.draftId, attributes: [ ...p.attributes.map( ( a ) => `pa_${ a.slug }` ), ...Object.keys( p.facets ).map( ( k ) => `pa_${ k }` ) ], facets: p.facets, variations: p.variations.map( ( v ) => v.sku ), permalink: `https://x.test/product/${ p.slug }/` } ) );
	const state = JSON.stringify( { woocommerce: true, products, images: {}, productBase: 'product', brandTaxonomy: true, plugins: [], facets } );
	const s = siteWith( {}, 'lined' );
	const runPhp = ( php ) => ( /_theme_mod\(/.test( php ) ? s.runPhp( php ) : /\$steps =/.test( php ) ? JSON.stringify( { done: [], issues: [] } ) : state );
	const dry = lines();
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp, apply: false, log: dry.log, error: dry.error } ), 0 );
	assert.deepEqual( s.writes, [] );
	assert.ok( dry.out.some( ( x ) => /on-off filter: theme mods for pa_lined term lined, label "Lined only"/.test( x ) ) );
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp, apply: true, log: () => {}, error: () => {} } ), 0 );
	assert.deepEqual( s.writes, [ { sgs_shop_filter_boolean_enabled: true, sgs_shop_filter_boolean_source: 'attribute', sgs_shop_filter_boolean_attribute: 'lined', sgs_shop_filter_boolean_term: 'lined', sgs_shop_filter_boolean_label: 'Lined only' } ] );
	const kept = siteWith( {}, 'lined', { sticky: false } );
	const failing = ( php ) => ( /_theme_mod\(/.test( php ) ? kept.runPhp( php ) : runPhp( php ) );
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp: failing, apply: true, log: () => {}, error: () => {} } ), 1, 'a toggle the site does not keep fails the step' );
} );
