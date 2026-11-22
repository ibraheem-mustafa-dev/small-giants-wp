// The product's code and rating fields (F-51; lib/catalogue-records.mjs::codeField, ::ratingField) and the catalogue step writing
// the code as `_sgs_code` (lib/site-build-catalogue.mjs and its PHP), which the product page binds as meta._sgs_code because the SKU
// holds the catalogue's own sgs-draft key. Tests marked MUST FAIL fail without the code they name. The PHP half runs under php
// against the stand-in WooCommerce (tests/fixtures/catalogue/php-shop.mjs). Needs `php` on PATH.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { codeField, ratingField } from '../lib/catalogue-records.mjs';
import { catalogueProblems } from '../lib/intake-catalogue-run.mjs';
import { run, seed, setup, shop } from './fixtures/catalogue/php-shop.mjs';

const FRAMES = [
	{ id: 1, name: 'Aviator', brand: 'Ray-Ban', code: 'RB3025 · 001/58', shape: 'Pilot', rating: 4.9, revs: 41, price: 139 },
	{ id: 2, name: 'Wayfarer', brand: 'Ray-Ban', code: 'RB2140 · 901', shape: 'Square', rating: 4.7, revs: 18, price: 129 },
	{ id: 3, name: 'Holbrook', brand: 'Oakley', code: 'OO9102 · 01', shape: 'Square', rating: 5, revs: 9, price: 119 },
];
const TAKEN = [ 'id', 'name', 'price', 'brand' ];

test( 'MUST FAIL: the code is the one words field each record holds differently; the rating the one 0 to 5 number with a fraction', () => {
	assert.equal( codeField( FRAMES, TAKEN ), 'code' );
	assert.equal( ratingField( FRAMES ), 'rating' );
	// Negative controls: a field two records share is no code; two unique words fields are ambiguous; one record says nothing;
	// whole numbers (a review count) or numbers above 5 (a price) are no rating; two rating-like fields are ambiguous.
	assert.equal( codeField( FRAMES.map( ( r ) => ( { ...r, code: 'same' } ) ), TAKEN ), null );
	assert.equal( codeField( FRAMES.map( ( r ) => ( { ...r, sku2: `x${ r.id }` } ) ), TAKEN ), null );
	assert.equal( codeField( FRAMES.slice( 0, 1 ), TAKEN ), null );
	assert.equal( ratingField( FRAMES.map( ( r ) => ( { ...r, rating: 4 } ) ) ), null );
	assert.equal( ratingField( FRAMES.map( ( r ) => ( { ...r, stars: r.rating } ) ) ), null );
} );

test( 'MUST FAIL: the catalogue step writes a route-made product\'s code it lacks, never replacing one it has, and a fresh read plans none', () => {
	const { repo, catalogue } = setup();
	const jar = { ...catalogue.products[ 0 ], code: 'JAR-01' };
	assert.deepEqual( catalogueProblems( { ...catalogue, products: [ jar ] } ), [], 'the record with a code validates' );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( { ...catalogue, products: [ jar ] }, null, 2 ) }\n` );
	const s = shop( seed( { grain: { id: 3, name: 'pa_grain', options: [ 20, 21 ], position: 1, visible: true, variation: true }, extra: { meta: { _sgs_draft_product: 'jar', _sgs_rrp: '' } } } ) );
	const line = run( repo, s.runPhp, false ).out.find( ( l ) => /^ {2}complete jar:/.test( l ) );
	assert.match( line, /its code JAR-01/ );
	assert.equal( run( repo, s.runPhp, true ).code, 0 );
	assert.equal( s.state().posts[ 50 ].meta._sgs_code, 'JAR-01' );
	assert.ok( ! run( repo, s.runPhp, false ).out.some( ( l ) => /its code/.test( l ) ), 'a fresh read plans no code again' );
	// Negative control: a code the product already has is kept.
	const kept = shop( seed( { grain: { id: 3, name: 'pa_grain', options: [ 20, 21 ], position: 1, visible: true, variation: true }, extra: { meta: { _sgs_draft_product: 'jar', _sgs_rrp: '', _sgs_code: 'MINE' } } } ) );
	assert.ok( ! run( repo, kept.runPhp, false ).out.some( ( l ) => /its code/.test( l ) ) );
	assert.equal( run( repo, kept.runPhp, true ).code, 0 );
	assert.equal( kept.state().posts[ 50 ].meta._sgs_code, 'MINE' );
	assert.ok( catalogueProblems( { ...catalogue, products: [ { ...jar, code: '' } ] } ).length, 'an empty code is refused' );
} );
