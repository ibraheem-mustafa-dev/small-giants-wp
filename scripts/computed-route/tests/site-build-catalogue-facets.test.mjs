// Spec 48 FR-48-92: the catalogue step's facets (lib/site-build-catalogue-facets.mjs): each facet planned from a site
// state as a global attribute to create or complete, a product lacking its filter terms completed, the read writing
// nothing, the write making attributes, terms and swatches and filter-only product attributes, and the attribute ids
// recorded in catalogue.json. Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { planCatalogue, recordSite, runCatalogue } from '../lib/site-build-catalogue.mjs';
import { catalogueApplyPhp, catalogueStatePhp } from '../lib/site-build-catalogue-php.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';

const ROWS = [ { route: 'shop', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'product', slug: 'product', postType: 'product', collection: 'live' } ];
const setup = () => {
	const repo = repoWith( 'facets' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: ROWS } );
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( catalogue, null, 2 ) }\n` );
	return { repo, catalogue };
};
const allFacets = ( catalogue, extra = {} ) => Object.fromEntries( catalogue.facets.map( ( f, i ) => [ f.slug, { id: 10 + i, label: f.label, reserved: false, terms: Object.fromEntries( f.terms.map( ( t ) => [ t.name, t.swatch || '' ] ) ) } ] ).map( ( [ k, v ] ) => [ k, { ...v, ...( extra[ k ] || {} ) } ] ) );
const site = ( products = [], extra = {} ) => ( { woocommerce: true, products, images: {}, productBase: 'product', brandTaxonomy: true, plugins: [], facets: {}, ...extra } );
const found = ( p, extra = {} ) => ( { draftId: p.draftId, id: 40, how: 'sku', fixture: false, type: p.type, status: 'publish', sku: p.sku, price: String( p.price ), image: 7, gallery: p.gallery.length, categories: p.categories, brand: [], rrp: '', draftMeta: p.draftId, attributes: [ ...p.attributes.map( ( a ) => `pa_${ a.slug }` ), ...Object.keys( p.facets ).map( ( k ) => `pa_${ k }` ) ], facets: p.facets, variations: p.variations.map( ( v ) => v.sku ), permalink: `https://x.test/product/${ p.slug }/`, ...extra } );

test( 'a site without the facets plans each attribute with its terms and swatches; each created product names its filters', () => {
	const { catalogue } = setup();
	const plan = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	assert.deepEqual( plan.facets.map( ( a ) => [ a.slug, a.action ] ), [ [ 'kind', 'create' ], [ 'shade', 'create' ], [ 'size-filter', 'create' ], [ 'lined', 'create' ], [ 'fits', 'create' ], [ 'pick-a-theme', 'create' ] ] );
	assert.match( plan.facets[ 1 ].say, /create attribute pa_shade "Shade" \(multi\) with 3 term\(s\): Ink #101820, Sand #d8c3a5, Moss #4a5d23/ );
	assert.match( plan.facets[ 4 ].say, /"Anyone" carries every term/ );
	assert.match( plan.actions[ 0 ].say, /; filters Kind Cap, Shade Ink\/Sand\/Moss, Size Small, Lined Lined, Fits Adults\/Children, Pick a theme By the sea$/ );
} );

test( 'a facet lacking a term or a swatch is completed with exactly those; a whole one exists; a reserved slug stops the run', () => {
	const { catalogue } = setup();
	const facets = allFacets( catalogue, { shade: { terms: { Ink: '', Sand: '#d8c3a5' } } } );
	const plan = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => found( p ) ), { facets } ) );
	const tone = plan.facets.find( ( a ) => 'shade' === a.slug );
	assert.equal( tone.say, 'complete attribute pa_shade (id 11): add term(s) Moss and the swatch of Ink' );
	assert.ok( plan.facets.filter( ( a ) => 'shade' !== a.slug ).every( ( a ) => 'exists' === a.action ) );
	assert.deepEqual( plan.actions.map( ( a ) => a.action ), [ 'exists', 'exists', 'exists' ] );
	const reserved = planCatalogue( catalogue, site( [], { facets: allFacets( catalogue, { kind: { reserved: true } } ) } ) );
	assert.deepEqual( reserved.problems, [ 'facet "Kind": WooCommerce reserves the attribute slug "kind"' ] );
	const renamed = planCatalogue( catalogue, site( [], { facets: allFacets( catalogue, { fits: { label: 'Who for' } } ) } ) );
	assert.ok( renamed.notes.some( ( n ) => /pa_fits is named "Who for" on the site/.test( n ) ) );
} );

test( 'a found product lacking a filter attribute or one of its terms is completed; another author\'s product keeps the terms it has', () => {
	const { catalogue } = setup();
	const [ cap ] = catalogue.products;
	const facets = allFacets( catalogue );
	const noAttr = planCatalogue( catalogue, site( [ found( cap, { attributes: [ 'pa_size' ] } ) ], { facets } ) );
	assert.match( noAttr.actions[ 0 ].say, /lacks filter Kind Cap, filter Shade Ink\/Sand\/Moss, filter Size Small, filter Lined Lined, filter Fits Adults\/Children, filter Pick a theme By the sea$/ );
	const short = planCatalogue( catalogue, site( [ found( cap, { facets: { ...cap.facets, shade: [ 'Ink' ] } } ) ], { facets } ) );
	assert.match( short.actions[ 0 ].say, /lacks filter Shade Sand\/Moss$/ );
	const theirs = planCatalogue( catalogue, site( [ found( cap, { sku: 'SEEDED', how: 'slug', facets: { ...cap.facets, shade: [ 'Ink' ] } } ) ], { facets } ) );
	assert.equal( theirs.actions[ 0 ].action, 'exists' );
	const theirsBare = planCatalogue( catalogue, site( [ found( cap, { sku: 'SEEDED', how: 'slug', facets: { ...cap.facets, shade: [] } } ) ], { facets } ) );
	assert.match( theirsBare.actions[ 0 ].say, /lacks filter Shade Ink\/Sand\/Moss$/ );
} );

test( 'a facet a variation attribute already is, is neither planned nor written', () => {
	const { catalogue } = setup();
	const axis = { ...catalogue, facets: catalogue.facets.map( ( f ) => ( 'kind' === f.slug ? { ...f, axis: true } : f ) ) };
	const plan = planCatalogue( axis, site( axis.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	assert.ok( ! plan.facets.some( ( a ) => 'kind' === a.slug ) );
	assert.doesNotMatch( plan.actions[ 0 ].say, /Kind Cap/ );
	assert.doesNotMatch( catalogueApplyPhp( [], {}, {}, null, axis ), /"slug":"kind"/ );
} );

test( 'the read PHP reads the facets and writes nothing; the write makes filter-only attributes, ordered terms and swatches it never overwrites', () => {
	const { catalogue } = setup();
	const read = catalogueStatePhp( [], {}, catalogue );
	assert.doesNotMatch( read, /update_|wp_insert|wp_set_|->save\(|delete_|wp_update|set_post_thumbnail|media_sideload|wc_create/ );
	assert.match( read, /wc_check_if_attribute_name_is_reserved/ );
	assert.match( read, /'facets' => \(object\) \$facets/ );
	assert.match( read, /\$row\['facets'\] = \$sgs_product_facets\( \$id \);/ );
	const decoded = ( php ) => [ ...php.matchAll( /base64_decode\( '([^']+)' \)/g ) ].map( ( m ) => JSON.parse( Buffer.from( m[ 1 ], 'base64' ).toString() ) );
	assert.ok( decoded( read ).some( ( v ) => JSON.stringify( v ) === JSON.stringify( [ 'kind', 'shade', 'size-filter', 'lined', 'fits', 'pick-a-theme' ] ) ) );
	const write = catalogueApplyPhp( [], {}, {}, null, catalogue );
	assert.ok( decoded( write ).some( ( v ) => Array.isArray( v ) && v.some( ( f ) => 'shade' === f.slug && '#101820' === f.terms[ 0 ].swatch ) ) );
	assert.match( write, /\$a->set_visible\( false \);\s+\$a->set_variation\( false \);/ );
	assert.match( write, /if \( \$ft\['swatch'\] && '' === \(string\) get_term_meta\( \$t->term_id, '_sgs_swatch_color', true \) \)/ );
	assert.match( write, /if \( ! \$had \) \{ update_term_meta\( \$t->term_id, 'order', \(int\) \$pos \);/ );
	assert.match( write, /if \( isset\( \$attrs\[ \$tax \] \) && \$attrs\[ \$tax \]->get_variation\(\) \) \{ continue; \}/ );
	assert.match( write, /if \( \$have && ! \$ours && isset\( \$attrs\[ \$tax \] \) \) \{ continue; \}/ );
	// The facets are made before any product and each product gets its terms before it is published.
	assert.ok( write.indexOf( '$facet_tax[ $f[\'slug\'] ] = $tax;' ) < write.indexOf( 'foreach ( $steps as $s )' ) );
	assert.ok( write.indexOf( '$sgs_assign_facets( $id, $p, $ours );' ) < write.lastIndexOf( "'post_status' => 'publish'" ) );
	assert.ok( write.indexOf( '$sgs_assign_facets( $id, $p, $ours );' ) > write.indexOf( 'foreach ( $steps as $s )' ) );
} );

test( 'recordSite records each facet\'s attribute id; an apply that leaves a facet to make fails', () => {
	const { repo, catalogue } = setup();
	const facets = allFacets( catalogue, { lined: { id: 0 } } );
	const dry = [];
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp: () => JSON.stringify( site( catalogue.products.map( ( p ) => found( p ) ), { facets: allFacets( catalogue, { lined: { id: 0 }, shade: { terms: {} } } ) } ) ), apply: false, log: ( l ) => dry.push( l ), error: ( l ) => dry.push( l ) } ), 0 );
	assert.ok( dry.some( ( l ) => /filter attributes 1 to create, 1 to complete, 4 existing \(dry run/.test( l ) ) );
	recordSite( repo, 'demo', 'local', site( [], { facets } ), catalogue );
	const after = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), 'utf8' ) );
	assert.deepEqual( after.sites.local.attributes, { kind: 10, shade: 11, 'size-filter': 12, fits: 14, 'pick-a-theme': 15 } );
	const done = catalogue.products.map( ( p ) => found( p ) );
	const runPhp = ( php ) => ( /\$steps =/.test( php ) ? JSON.stringify( { done: [], issues: [] } ) : JSON.stringify( site( done, { facets } ) ) );
	const errors = [];
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp, apply: true, log: () => {}, error: ( l ) => errors.push( l ) } ), 1 );
	assert.ok( errors.some( ( l ) => /still plans 1 product or filter step\(s\): create attribute pa_lined/.test( l ) ) );
	const writes = [];
	const whole = ( php ) => ( /\$steps =/.test( php ) ? ( writes.push( php ), JSON.stringify( { done: [], issues: [] } ) ) : JSON.stringify( site( done, { facets: allFacets( catalogue ) } ) ) );
	assert.equal( runCatalogue( { repo, client: 'demo', site: 'local', runPhp: whole, apply: true, log: () => {}, error: () => {} } ), 0 );
	// The write is handed the catalogue's facets (an empty list encodes as W10=).
	assert.match( writes[ 0 ], /\$facet_defs = json_decode\( base64_decode\( '(?!W10=)/ );
} );
