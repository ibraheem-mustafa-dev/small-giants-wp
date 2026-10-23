// Proves Spec 48 section 16 ("Minimum fixture products"): a simple and a variable product are created through the
// WooCommerce REST API, each findable on a rerun so nothing is created twice. MUST FAIL controls: a rerun against an
// in-memory REST stub plans 0 creates and posts nothing; a site without WooCommerce is refused with a clear message; a
// variable product that lost a size gets only that size back; the image comes from the site's media-map entry.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ShopFixturesError, applyFixtures, imageChoice, planFixtures } from '../lib/shop-fixtures.mjs';

const CREDS = { url: 'https://shop.test', auth: 'Basic x' };
const reply = ( status, data ) => ( { status, ok: status >= 200 && status < 300, json: async () => data, text: async () => JSON.stringify( data ) } );

// An in-memory WooCommerce REST API: products by SKU, variations per product, media by title.
function stub( { woo = true } = {} ) {
	const products = [];
	const variations = {};
	const media = [];
	const posts = [];
	const impl = async ( url, init = {} ) => {
		const u = new URL( url );
		const route = u.pathname.replace( '/wp-json/', '' );
		const method = init.method || 'GET';
		const body = init.body && 'string' === typeof init.body ? JSON.parse( init.body ) : null;
		if ( '' === route ) {
			return reply( 200, { namespaces: woo ? [ 'wp/v2', 'wc/v3' ] : [ 'wp/v2' ] } );
		}
		if ( 'GET' === method && 'wc/v3/products' === route ) {
			return reply( 200, products.filter( ( p ) => p.sku === u.searchParams.get( 'sku' ) ) );
		}
		if ( 'POST' === method && 'wc/v3/products' === route ) {
			posts.push( route );
			const p = { id: 100 + products.length, status: body.status, type: body.type, sku: body.sku, price: body.regular_price || '', stock_quantity: body.stock_quantity ?? null, images: body.images ? [ { id: body.images[ 0 ].id } ] : [] };
			products.push( p );
			variations[ p.id ] = [];
			return reply( 201, p );
		}
		const vm = /^wc\/v3\/products\/(\d+)\/variations$/.exec( route );
		if ( vm && 'GET' === method ) {
			return reply( 200, variations[ vm[ 1 ] ] );
		}
		if ( vm && 'POST' === method ) {
			posts.push( route );
			const v = { id: 500 + variations[ vm[ 1 ] ].length, attributes: body.attributes, price: body.regular_price, stock_quantity: body.stock_quantity };
			variations[ vm[ 1 ] ].push( v );
			return reply( 201, v );
		}
		if ( 'GET' === method && 'wp/v2/media' === route ) {
			return reply( 200, media.filter( ( m ) => m.title.rendered === u.searchParams.get( 'search' ) ) );
		}
		if ( 'POST' === method && 'wp/v2/media' === route ) {
			posts.push( route );
			media.push( { id: 900 + media.length, title: { rendered: '' } } );
			return reply( 201, media.at( -1 ) );
		}
		const mm = /^wp\/v2\/media\/(\d+)$/.exec( route );
		if ( mm && 'POST' === method ) {
			media.find( ( m ) => m.id === Number( mm[ 1 ] ) ).title.rendered = body.title;
			return reply( 200, {} );
		}
		return reply( 404, { code: 'rest_no_route' } );
	};
	return { impl, products, variations, posts };
}

const repoWith = ( { mapped = false } = {} ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'shop-fx-' ) );
	const assets = path.join( repo, 'sites', 'acme', 'handoff', 'assets' );
	fs.mkdirSync( assets, { recursive: true } );
	fs.writeFileSync( path.join( assets, 'photo-one.jpg' ), 'jpg-bytes' );
	if ( mapped ) {
		fs.mkdirSync( path.join( repo, 'sites', 'acme', 'build' ), { recursive: true } );
		fs.writeFileSync( path.join( repo, 'sites', 'acme', 'build', 'media-map.json' ), JSON.stringify( { sites: { 'acme-test': { files: [ { asset: 'sites/acme/handoff/assets/photo-one.jpg', id: 77 } ] } } } ) );
	}
	return repo;
};

test( 'a rerun finds the fixture products and plans 0 creates', async () => {
	const s = stub();
	const repo = repoWith();
	const first = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( first.created, [ 'simple', 'variable', 'variable:Small', 'variable:Large' ] );
	assert.equal( first.imageUploaded, true );
	assert.deepEqual( first.products.map( ( p ) => [ p.kind, p.type, p.status ] ), [ [ 'simple', 'simple', 'publish' ], [ 'variable', 'variable', 'publish' ] ] );
	assert.equal( first.products[ 0 ].stock, 25 );
	assert.ok( first.products[ 0 ].image, 'the simple product reads back with an image' );
	assert.equal( first.products[ 1 ].variations.length, 2 );
	const before = s.posts.length;
	const plan = await planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( plan.map( ( p ) => p.action ), [ 'exists', 'exists' ] );
	assert.equal( plan.flatMap( ( p ) => p.missingVariations ).length, 0 );
	const second = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( second.created, [] );
	assert.equal( s.posts.length, before, 'the rerun posted nothing, not even the image' );
	assert.equal( s.products.length, 2 );
} );

test( 'a site without WooCommerce is refused with a clear message', async () => {
	const s = stub( { woo: false } );
	await assert.rejects( planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } ), ( e ) => e instanceof ShopFixturesError && /no WooCommerce REST API \(wc\/v3\).*activate WooCommerce/.test( e.message ) );
	await assert.rejects( applyFixtures( { repo: repoWith(), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } ), ShopFixturesError );
	assert.deepEqual( s.posts, [], 'nothing was created on the refused site' );
} );

test( 'a variable product that lost a size gets only that size back', async () => {
	const s = stub();
	const repo = repoWith();
	await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } );
	const variable = s.products.find( ( p ) => 'variable' === p.type );
	s.variations[ variable.id ].pop();
	const plan = await planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( plan.find( ( p ) => 'variable' === p.kind ).missingVariations, [ 'Large' ] );
	const again = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( again.created, [ 'variable:Large' ] );
	assert.equal( s.products.length, 2 );
} );

test( 'the image is the site\'s media-map entry before any draft asset', async () => {
	assert.deepEqual( imageChoice( repoWith( { mapped: true } ), 'acme', 'acme-test' ), { source: 'media-map', id: 77, asset: 'sites/acme/handoff/assets/photo-one.jpg' } );
	assert.equal( imageChoice( repoWith(), 'acme', 'acme-test' ).source, 'asset' );
	const s = stub();
	const r = await applyFixtures( { repo: repoWith( { mapped: true } ), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } );
	assert.equal( r.imageUploaded, false );
	assert.equal( r.products[ 0 ].image, 77 );
} );
