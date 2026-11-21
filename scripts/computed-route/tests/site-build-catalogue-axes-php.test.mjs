// Spec 48 FR-48-92: a product the route made gains a choice (variation axis) the catalogue added later
// (lib/site-build-catalogue-axes.mjs, lib/site-build-catalogue-php.mjs). The catalogue step's own read and write PHP runs
// under php against a stand-in WooCommerce (tests/fixtures/catalogue/wc-stub.php, state kept between runs), through
// lib/site-build-catalogue.mjs::runCatalogue: a dry run plans, an apply writes, and a fresh read must plan nothing.
// Tests marked MUST FAIL fail on the catalogue step before the rule. Needs `php` on PATH.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { catalogueImages, planCatalogue, readCatalogueState } from '../lib/site-build-catalogue.mjs';
import { catalogueApplyPhp } from '../lib/site-build-catalogue-php.mjs';
import { FOUR, children, norm, run, seed, setup, shop, term } from './fixtures/catalogue/php-shop.mjs';

test( 'MUST FAIL: an existing route-made product gains the missing choice and its variations, and its old variations that miss it are trashed; a fresh read plans nothing', () => {
	const { repo } = setup();
	const s = shop( seed() );
	const dry = run( repo, s.runPhp, false );
	assert.equal( dry.code, 0 );
	const line = dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) );
	assert.match( line, / lacks the choice Grain \(Fine set\/Coarse set\), .*4 of 4 variations.*; trashes 2 old variation\(s\) that miss a choice \(sgs-draft-jar-6, sgs-draft-jar-12\)$/ );
	assert.equal( norm( s.state() ), norm( seed() ), 'a dry run writes nothing' );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /a fresh read plans 0/.test( l ) ) );
	const st = s.state();
	// The choice is on the product as a variation attribute, with every term, and the product carries the terms.
	const grain = st.posts[ 50 ].attrs.pa_grain;
	assert.deepEqual( [ grain.variation, grain.visible, grain.options.length ], [ true, true, 2 ] );
	assert.deepEqual( st.objterms[ 50 ].pa_grain, grain.options );
	assert.deepEqual( st.posts[ 50 ].defaults, { 'pa_pack-size': '6', pa_grain: 'fine-set' } );
	// The four catalogue variations exist, each with both choices; the two old ones are in the trash.
	const kids = children( st );
	assert.deepEqual( kids.filter( ( k ) => 'publish' === k.status ).map( ( k ) => k.sku ).sort(), [ ...FOUR ].sort() );
	assert.ok( kids.filter( ( k ) => 'publish' === k.status ).every( ( k ) => k.set[ 'pa_pack-size' ] && k.set.pa_grain ) );
	assert.deepEqual( kids.filter( ( k ) => 'trash' === k.status ).map( ( k ) => k.sku ).sort(), [ 'sgs-draft-jar-12', 'sgs-draft-jar-6' ] );
	const cat = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), 'utf8' ) );
	assert.equal( planCatalogue( cat, readCatalogueState( s.runPhp, cat, {} ) ).actions[ 0 ].action, 'exists' );
} );

test( 'MUST FAIL: an old variation an order holds is set private and reported, never trashed; a fresh read plans nothing', () => {
	const { repo } = setup();
	const s = shop( seed( { orders: [ 51 ] } ) );
	const dry = run( repo, s.runPhp, false );
	assert.match( dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) ), /; trashes 1 old variation\(s\) that miss a choice \(sgs-draft-jar-12\); sets 1 old variation\(s\) that miss a choice private, an order holds it \(sgs-draft-jar-6\)$/ );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /done: jar: variation 51 \(sgs-draft-jar-6\) set private, an order holds it/.test( l ) ), 'the private one is reported' );
	const kids = children( s.state() );
	assert.equal( kids.find( ( k ) => 51 === k.id ).status, 'private' );
	assert.equal( kids.find( ( k ) => 52 === k.id ).status, 'trash' );
	assert.equal( kids.filter( ( k ) => 'publish' === k.status ).length, 4 );
	// A later run leaves it private and plans nothing (a note says it stays).
	const again = run( repo, s.runPhp, false );
	assert.ok( again.out.some( ( l ) => /exists jar:/.test( l ) ) );
	assert.ok( again.out.some( ( l ) => /note: jar: 1 old variation\(s\) that miss a choice stay private \(sgs-draft-jar-6\)/.test( l ) ) );
	assert.equal( children( s.state() ).find( ( k ) => 51 === k.id ).status, 'private' );
	// An apply over it again leaves the private variation as it is and reports nothing more.
	const settled = s.state();
	const third = run( repo, s.runPhp, true );
	assert.equal( third.code, 0 );
	assert.ok( ! third.out.some( ( l ) => /set private|trashed/.test( l ) ), 'nothing is swept twice' );
	assert.equal( norm( s.state().posts ), norm( settled.posts ) );
} );

test( 'MUST FAIL: a filter-only attribute of the choice\'s slug becomes the choice with its terms kept', () => {
	const { repo } = setup();
	const grain = { id: 3, name: 'pa_grain', options: [ 20 ], position: 1, visible: false, variation: false };
	const s = shop( seed( { grain } ) );
	const dry = run( repo, s.runPhp, false );
	assert.match( dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) ), /lacks the choice Grain \(Fine set\/Coarse set\), .*4 of 4 variations.*; trashes 2 old/ );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const st = s.state();
	assert.deepEqual( [ st.posts[ 50 ].attrs.pa_grain.variation, st.posts[ 50 ].attrs.pa_grain.visible ], [ true, true ] );
	assert.deepEqual( st.posts[ 50 ].attrs.pa_grain.options, [ 20, 21 ], 'the term it had stays, the other is added once' );
	assert.equal( Object.values( st.terms ).filter( ( t ) => 'pa_grain' === t.tax ).length, 2, 'no term is made twice' );
} );

test( 'a product the route did not make is never changed this way: its choices, terms and variations stay, and a note says so', () => {
	const { repo } = setup();
	const s = shop( seed( { sku: 'SEEDED' } ) );
	const before = s.state();
	const dry = run( repo, s.runPhp, false );
	assert.ok( dry.out.some( ( l ) => /note: jar: product 50 \(SKU SEEDED\) was not made by the route, so its missing choice\(s\) Grain are left as they are/.test( l ) ) );
	assert.doesNotMatch( dry.out.find( ( l ) => /^ {2}(complete|exists) jar: product 50/.test( l ) ), /choice|trash|private|Grain/, 'its plan line asks nothing of its choices or old variations' );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const st = s.state();
	// Its filter-only terms are filled in as for any product (the facet step); its choices are not touched.
	assert.deepEqual( st.posts[ 50 ].attrs[ 'pa_pack-size' ], before.posts[ 50 ].attrs[ 'pa_pack-size' ] );
	assert.deepEqual( Object.keys( st.posts[ 50 ].attrs ).filter( ( t ) => st.posts[ 50 ].attrs[ t ].variation ), [ 'pa_pack-size' ] );
	assert.deepEqual( children( st ), children( before ) );
	assert.ok( ! ( 'pa_grain' in st.posts[ 50 ].attrs ) );
} );

test( 'a product whose choices and variations already match plans nothing and is not written', () => {
	const { repo } = setup();
	const s0 = shop( seed() );
	run( repo, s0.runPhp, true );
	const settled = s0.state();
	const s = shop( settled );
	const dry = run( repo, s.runPhp, false );
	assert.ok( dry.out.some( ( l ) => /exists jar: product 50/.test( l ) ) );
	assert.ok( dry.out.some( ( l ) => /0 to create, 0 to complete, 1 existing/.test( l ) ) );
	const again = run( repo, s.runPhp, true );
	assert.equal( again.code, 0 );
	assert.ok( ! again.out.some( ( l ) => /choice|term\(s\)|trashed|private/.test( l ) ), 'a settled product reports no choice step' );
	assert.equal( norm( s.state().posts ), norm( settled.posts ), 'an apply over a settled product changes no post' );
} );

test( 'the read reports each variation of a route-made product: its choices, status and whether an order holds it', () => {
	const { repo, catalogue } = setup();
	const s = shop( seed( { orders: [ 52 ] } ) );
	const state = readCatalogueState( s.runPhp, catalogue, catalogueImages( repo, catalogue ) );
	const jar = state.products[ 0 ];
	assert.deepEqual( jar.variationAttributes, [ 'pa_pack-size' ] );
	assert.deepEqual( jar.attributeTerms, { 'pa_pack-size': [ '6', '12' ] } );
	assert.deepEqual( jar.variationRows.map( ( r ) => [ r.id, r.sku, r.status, r.options, r.ordered ] ), [ [ 51, 'sgs-draft-jar-6', 'publish', { 'pa_pack-size': '6' }, false ], [ 52, 'sgs-draft-jar-12', 'publish', { 'pa_pack-size': '12' }, true ] ] );
	// Another author's product is not read for variations (nothing of it is ever swept).
	const theirs = readCatalogueState( shop( seed( { sku: 'SEEDED' } ) ).runPhp, catalogue, catalogueImages( repo, catalogue ) ).products[ 0 ];
	assert.deepEqual( theirs.variationRows, [] );
} );

test( 'MUST FAIL: a term the catalogue\'s choice has and the product\'s attribute lacks is added, and only the variations that miss are made', () => {
	const { repo } = setup();
	const grain = { id: 3, name: 'pa_grain', options: [ 20, 21 ], position: 1, visible: true, variation: true };
	const st = seed( { grain, variations: false } );
	st.posts[ 50 ].attrs[ 'pa_pack-size' ].options = [ 10 ];
	st.objterms[ 50 ][ 'pa_pack-size' ] = [ 10 ];
	[ [ 51, 'sgs-draft-jar-6-fine-set', 'fine-set' ], [ 52, 'sgs-draft-jar-6-coarse-set', 'coarse-set' ] ].forEach( ( [ id, sku, g ] ) => {
		st.posts[ id ] = { type: 'variation', parent: 50, status: 'publish', name: '', slug: '', sku, price: '4', thumb: 0, gallery: [], attrs: {}, defaults: {}, vattrs: { 'pa_pack-size': '6', pa_grain: g }, meta: {} };
	} );
	const s = shop( st );
	const dry = run( repo, s.runPhp, false );
	const line = dry.out.find( ( l ) => /^ {2}complete jar:/.test( l ) );
	assert.match( line, / lacks 12 on its Pack size choice, .*2 of 4 variations/ );
	assert.doesNotMatch( line, /trash|private/, 'both old variations cover every choice, so none is swept' );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	assert.ok( done.out.some( ( l ) => /done: jar: term\(s\) 12 added to choice pa_pack-size/.test( l ) ), 'the added term is reported' );
	const after = s.state();
	assert.deepEqual( after.posts[ 50 ].attrs[ 'pa_pack-size' ].options, [ 10, 11 ] );
	assert.deepEqual( children( after ).filter( ( k ) => 'publish' === k.status ).map( ( k ) => k.sku ).sort(), [ ...FOUR ].sort() );
	assert.deepEqual( children( after ).filter( ( k ) => 'publish' !== k.status ), [] );
	assert.equal( Object.values( after.terms ).filter( ( t ) => 'pa_pack-size' === t.tax ).length, 2, 'no term is made twice' );
} );

test( 'a product carrying the catalogue SKU without the route prefix is not the route product: the write changes nothing of its choices or variations', () => {
	// The catalogue schema makes every SKU `sgs-draft-*`, so the product is planned and written without the schema's check.
	const { repo, catalogue } = setup();
	const plain = { ...catalogue, products: [ { ...catalogue.products[ 0 ], sku: 'plain-jar', variations: catalogue.products[ 0 ].variations.map( ( v ) => ( { ...v, sku: v.sku.replace( 'sgs-draft-', 'plain-' ) } ) ) } ] };
	const s = shop( seed( { sku: 'plain-jar' } ) );
	const images = catalogueImages( repo, plain );
	const plan = planCatalogue( plain, readCatalogueState( s.runPhp, plain, images ) );
	assert.ok( plan.notes.some( ( n ) => /jar: product 50 \(SKU plain-jar\) was not made by the route/.test( n ) ) );
	assert.doesNotMatch( plan.actions[ 0 ].say, /choice|trash|private|Grain/ );
	s.runPhp( catalogueApplyPhp( plan.actions.filter( ( a ) => 'complete' === a.action ), images, {}, null, plain ) );
	const after = s.state();
	// Its old variations stay published (the write's older path may still make the variations it lacks, as for any product with the catalogue's SKU).
	assert.deepEqual( children( after ).filter( ( k ) => [ 'plain-jar-6', 'plain-jar-12' ].includes( k.sku ) ).map( ( k ) => k.status ), [ 'publish', 'publish' ] );
	assert.ok( children( after ).every( ( k ) => 'trash' !== k.status && 'private' !== k.status ) );
	assert.deepEqual( Object.keys( after.posts[ 50 ].attrs ).filter( ( t ) => after.posts[ 50 ].attrs[ t ].variation ), [ 'pa_pack-size' ] );
	assert.deepEqual( readCatalogueState( s.runPhp, plain, images ).products[ 0 ].variationRows, [], 'the read gathers no variation rows of a product without the prefix' );
} );

test( 'a catalogue variation whose SKU an order-held old variation keeps is reported, not fatal; the others are made', () => {
	const { repo } = setup();
	const st = seed( { orders: [ 51 ] } );
	st.posts[ 51 ].sku = 'sgs-draft-jar-6-fine-set';
	const s = shop( st );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 1 );
	assert.ok( done.out.some( ( l ) => /ERR\s+issue: jar: variation sgs-draft-jar-6-fine-set not made: Invalid or duplicated SKU\./.test( l ) ), done.out.join( '\n' ) );
	const kids = children( s.state() );
	assert.equal( kids.find( ( k ) => 51 === k.id ).status, 'private' );
	assert.deepEqual( kids.filter( ( k ) => 'publish' === k.status ).map( ( k ) => k.sku ).sort(), FOUR.filter( ( k ) => 'sgs-draft-jar-6-fine-set' !== k ).sort() );
} );

test( 'the write is idempotent: run over a product it already settled, with a private old variation, it changes and reports nothing', () => {
	const { repo, catalogue } = setup();
	const s = shop( seed( { orders: [ 51 ] } ) );
	run( repo, s.runPhp, true );
	const settled = s.state();
	assert.equal( children( settled ).find( ( k ) => 51 === k.id ).status, 'private' );
	// The plan would make no step for it, so the write is handed one by hand.
	const images = catalogueImages( repo, catalogue );
	const step = planCatalogue( catalogue, readCatalogueState( s.runPhp, catalogue, images ) ).actions[ 0 ];
	assert.equal( step.action, 'exists' );
	const out = JSON.parse( s.runPhp( catalogueApplyPhp( [ { ...step, action: 'complete' } ], images, {}, null, catalogue ) ) );
	assert.deepEqual( out.issues, [] );
	assert.deepEqual( out.done.filter( ( d ) => /choice|term\(s\)|trashed|private/.test( d ) ), [] );
	assert.equal( norm( s.state().posts ), norm( settled.posts ) );
} );

test( 'MUST FAIL: a route-made product\'s existing filter attribute gains the catalogue\'s term on the product itself, not only as an object term', () => {
	// WooCommerce writes only an attribute list that differs (!==) from the one it holds (the stand-in models this), so the facet
	// step's edit of an existing attribute must be made on a copy (lib/site-build-catalogue-facets.mjs::facetApplyPhp).
	const { repo } = setup();
	const st0 = seed();
	st0.posts[ 50 ].attrs.pa_origin = { id: 4, name: 'pa_origin', options: [ 31 ], position: 1, visible: false, variation: false };
	Object.assign( st0.terms, Object.fromEntries( [ term( 30, 'pa_origin', 'hills', 'hills' ), term( 31, 'pa_origin', 'coast', 'coast' ) ] ) );
	st0.attrs.pa_origin = { id: 4, name: 'Origin' };
	st0.objterms[ 50 ].pa_origin = [ 31 ];
	const s = shop( st0 );
	const done = run( repo, s.runPhp, true );
	assert.equal( done.code, 0, done.out.join( '\n' ) );
	const st = s.state();
	assert.deepEqual( [ ...st.posts[ 50 ].attrs.pa_origin.options ].sort(), [ 30, 31 ], 'the product\'s Origin attribute lists the term it had and the catalogue\'s' );
	assert.equal( st.posts[ 50 ].attrs.pa_origin.variation, false, 'a filter stays a filter' );
} );
