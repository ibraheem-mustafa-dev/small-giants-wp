// Proves Spec 48 section 16 ("Minimum fixture products"): a simple and a variable product are created through the
// WooCommerce REST API, each findable on a rerun so nothing is created twice. MUST FAIL controls: a rerun against an
// in-memory REST stub plans 0 creates and posts nothing; a site without WooCommerce is refused with a clear message; a
// variable product that lost a size gets only that size back; the image comes from the site's media-map entry; the variable
// product's size is the global `pa_size` attribute and its terms carry `_sgs_variesby_value` (SGS product preflight Check 6,
// no_variesby), written once, never over a value a term already has.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VARIESBY_VALUES, variesByOf } from '../lib/catalogue-read.mjs';
import { SIZE_ATTRIBUTE, ShopFixturesError, applyFixtures, imageChoice, planFixtures, ensureImage } from '../lib/shop-fixtures.mjs';
import { VariesByError, applyVariesBy, planVariesBy } from '../lib/shop-fixtures-variesby.mjs';
import { wpFetch } from '../lib/shop-fixtures-wp.mjs';

const CREDS = { url: 'https://shop.test', auth: 'Basic x' };
const reply = ( status, data ) => ( { status, ok: status >= 200 && status < 300, json: async () => data, text: async () => JSON.stringify( data ) } );

// An in-memory WooCommerce REST API: products by SKU, variations per product, media by title.
function stub( { woo = true, attachments = [ 77 ] } = {} ) {
	const products = [];
	const variations = {};
	const media = attachments.map( ( id ) => ( { id, title: { rendered: `attachment-${ id }` } } ) );
	const posts = [];
	const attrs = [];
	const terms = { Small: { id: 1, meta: '' }, Large: { id: 2, meta: '' } };
	const writes = [];
	const sanitise = ( v ) => ( [ 'color', 'size', 'material', 'pattern', 'suggestedAge', 'suggestedGender' ].includes( v ) ? v : '' );
	// A wp-cli stand-in: the read returns each term's value, the write sets the ones still empty (as the framework's sanitiser would read them).
	const wp = ( args, input ) => {
		const data = JSON.parse( Buffer.from( /base64_decode\( '([^']+)'/.exec( input )[ 1 ], 'base64' ).toString() );
		if ( input.includes( 'update_term_meta' ) ) {
			writes.push( data );
			const done = [];
			for ( const w of data ) {
				const t = Object.values( terms ).find( ( x ) => x.id === w.termId );
				if ( '' === sanitise( t.meta ) && '' !== sanitise( w.value ) ) {
					t.meta = w.value;
					done.push( w.termId );
				}
			}
			return `SGSJSON:${ JSON.stringify( done ) }\n`;
		}
		return `SGSJSON:${ JSON.stringify( data.flatMap( ( a ) => a.options.map( ( name ) => ( { taxonomy: a.taxonomy, term: name, termId: terms[ name ].id, current: sanitise( terms[ name ].meta ) } ) ) ) ) }\n`;
	};
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
		if ( 'GET' === method && 'wc/v3/products/attributes' === route ) {
			return reply( 200, attrs );
		}
		if ( 'POST' === method && 'wc/v3/products/attributes' === route ) {
			posts.push( route );
			attrs.push( { id: 4, name: body.name, slug: `pa_${ body.slug }` } );
			return reply( 201, attrs.at( -1 ) );
		}
		const pm = /^wc\/v3\/products\/(\d+)$/.exec( route );
		if ( pm && 'PUT' === method ) {
			posts.push( route );
			const p = products.find( ( x ) => x.id === Number( pm[ 1 ] ) );
			p.attributes = body.attributes.map( ( a ) => ( { id: a.id, options: a.options } ) );
			// A variation still holding the product-local choice reads back empty once the product's choice is global, as WooCommerce does.
			variations[ p.id ].forEach( ( v ) => {
				if ( ! v.attributes.some( ( a ) => a.id ) ) {
					v.stale = v.attributes[ 0 ].option;
					v.attributes = [];
				}
			} );
			return reply( 200, p );
		}
		const vp = /^wc\/v3\/products\/(\d+)\/variations\/(\d+)$/.exec( route );
		if ( vp && 'PUT' === method ) {
			posts.push( route );
			const v = variations[ vp[ 1 ] ].find( ( x ) => x.id === Number( vp[ 2 ] ) );
			v.attributes = body.attributes;
			return reply( 200, v );
		}
		if ( 'POST' === method && 'wc/v3/products' === route ) {
			posts.push( route );
			const p = { id: 100 + products.length, status: body.status, type: body.type, sku: body.sku, price: body.regular_price || '', stock_quantity: body.stock_quantity ?? null, images: body.images ? [ { id: body.images[ 0 ].id } ] : [], attributes: ( body.attributes || [] ).map( ( a ) => ( { id: a.id, options: a.options } ) ) };
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
		if ( mm && 'GET' === method ) {
			const m = media.find( ( x ) => x.id === Number( mm[ 1 ] ) );
			return m ? reply( 200, { id: m.id } ) : reply( 404, { code: 'rest_post_invalid_id' } );
		}
		if ( mm && 'POST' === method ) {
			media.find( ( m ) => m.id === Number( mm[ 1 ] ) ).title.rendered = body.title;
			return reply( 200, {} );
		}
		return reply( 404, { code: 'rest_no_route' } );
	};
	return { impl, products, variations, posts, attrs, terms, writes, wp };
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
	const first = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( first.created, [ 'simple', 'attribute:pa_size', 'variable', 'variable:Small', 'variable:Large' ] );
	assert.equal( first.imageUploaded, true );
	assert.deepEqual( first.products.map( ( p ) => [ p.kind, p.type, p.status ] ), [ [ 'simple', 'simple', 'publish' ], [ 'variable', 'variable', 'publish' ] ] );
	assert.equal( first.products[ 0 ].stock, 25 );
	assert.ok( first.products[ 0 ].image, 'the simple product reads back with an image' );
	assert.equal( first.products[ 1 ].variations.length, 2 );
	assert.deepEqual( s.variations[ first.products[ 1 ].id ].map( ( v ) => v.attributes[ 0 ].option ), [ 'Small', 'Large' ], 'each variation names its size, through the global attribute' );
	const before = s.posts.length;
	const plan = await planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( plan.map( ( p ) => p.action ), [ 'exists', 'exists' ] );
	assert.equal( plan.flatMap( ( p ) => p.missingVariations ).length, 0 );
	const second = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( second.created, [] );
	assert.equal( s.posts.length, before, 'the rerun posted nothing, not even the image' );
	assert.equal( s.products.length, 2 );
} );

test( 'a site without WooCommerce is refused with a clear message', async () => {
	const s = stub( { woo: false } );
	await assert.rejects( planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } ), ( e ) => e instanceof ShopFixturesError && /no WooCommerce REST API \(wc\/v3\).*activate WooCommerce/.test( e.message ) );
	await assert.rejects( applyFixtures( { repo: repoWith(), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } ), ShopFixturesError );
	assert.deepEqual( s.posts, [], 'nothing was created on the refused site' );
} );

test( 'a variable product that lost a size gets only that size back', async () => {
	const s = stub();
	const repo = repoWith();
	await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	const variable = s.products.find( ( p ) => 'variable' === p.type );
	s.variations[ variable.id ].pop();
	const plan = await planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } );
	assert.deepEqual( plan.find( ( p ) => 'variable' === p.kind ).missingVariations, [ 'Large' ] );
	const again = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( again.created, [ 'variable:Large' ] );
	assert.equal( s.products.length, 2 );
} );

test( 'the image is the site\'s media-map entry before any draft asset', async () => {
	assert.deepEqual( imageChoice( repoWith( { mapped: true } ), 'acme', 'acme-test' ), { source: 'media-map', id: 77, asset: 'sites/acme/handoff/assets/photo-one.jpg' } );
	assert.equal( imageChoice( repoWith(), 'acme', 'acme-test' ).source, 'asset' );
	const s = stub();
	const r = await applyFixtures( { repo: repoWith( { mapped: true } ), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.equal( r.imageUploaded, false );
	assert.equal( r.products[ 0 ].image, 77 );
} );

test( 'MUST FAIL: a media-map id is verified on the site before use; a stale one falls back to uploading its asset', async () => {
	const repo = repoWith( { mapped: true } );
	const live = stub();
	assert.deepEqual( await ensureImage( { repo, client: 'acme', choice: imageChoice( repo, 'acme', 'acme-test' ), creds: CREDS, fetchImpl: live.impl, apply: true } ), { id: 77, uploaded: false } );
	const gone = stub( { attachments: [] } );
	const r = await ensureImage( { repo, client: 'acme', choice: imageChoice( repo, 'acme', 'acme-test' ), creds: CREDS, fetchImpl: gone.impl, apply: true } );
	assert.equal( r.uploaded, true, 'the stale attachment is never put on a product' );
	assert.notEqual( r.id, 77 );
	assert.equal( await ensureImage( { repo, client: 'acme', choice: { source: 'media-map', id: 77, asset: 'sites/acme/none.jpg' }, creds: CREDS, fetchImpl: gone.impl, apply: true } ), null );
} );

test( 'MUST FAIL: credentials to a plain-http site are refused before any request; loopback http is allowed', async () => {
	const s = stub();
	let calls = 0;
	const counted = ( url, init ) => {
		calls++;
		return s.impl( url, init );
	};
	await assert.rejects( planFixtures( { client: 'acme', creds: { url: 'http://shop.test', auth: 'Basic x' }, fetchImpl: counted } ), ( e ) => e instanceof ShopFixturesError && /is not https/.test( e.message ) );
	await assert.rejects( ensureImage( { repo: repoWith( { mapped: true } ), client: 'acme', choice: { source: 'media-map', id: 77, asset: 'x' }, creds: { url: 'http://shop.test', auth: 'Basic x' }, fetchImpl: counted, apply: true } ), /is not https/ );
	await assert.rejects( ensureImage( { repo: repoWith(), client: 'acme', choice: { source: 'asset', asset: 'sites/acme/handoff/assets/photo-one.jpg' }, creds: { url: 'http://shop.test', auth: 'Basic x' }, fetchImpl: counted, apply: true } ), /is not https/ );
	assert.equal( calls, 0 );
	assert.equal( ( await planFixtures( { client: 'acme', creds: { url: 'http://localhost:8080', auth: 'Basic x' }, fetchImpl: s.impl } ) ).length, 2 );
} );

test( 'MUST FAIL: the size terms carry the framework variesBy axis, written once and never over a value a term already has', async () => {
	const s = stub();
	s.terms.Small.meta = 'color';
	const repo = repoWith();
	const first = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( first.variesBy.map( ( v ) => [ v.term, v.action ] ), [ [ 'Small', 'has' ], [ 'Large', 'write' ] ] );
	assert.deepEqual( s.writes, [ [ { termId: 2, value: 'size' } ] ], 'only the term with no value is written, with the catalogue\'s axis for "Size"' );
	assert.equal( s.terms.Small.meta, 'color', 'an existing value is left' );
	assert.equal( s.terms.Large.meta, 'size' );
	const again = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( again.created, [] );
	assert.equal( s.writes.length, 1, 'a rerun writes no term meta' );
	assert.ok( again.variesBy.every( ( v ) => 'has' === v.action ) );
} );

test( 'MUST FAIL: the variable product uses the global size attribute, never a product-local one (a local attribute has no terms to carry a variesBy axis)', async () => {
	const s = stub();
	await applyFixtures( { repo: repoWith(), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	const variable = s.products.find( ( p ) => 'variable' === p.type );
	assert.deepEqual( variable.attributes, [ { id: 4, options: [ 'Small', 'Large' ] } ] );
	assert.deepEqual( s.attrs.map( ( a ) => a.slug ), [ 'pa_size' ] );
	assert.ok( s.variations[ variable.id ].every( ( v ) => 4 === v.attributes[ 0 ].id ) );
} );

test( 'a fixture made with a product-local size is converted to the global attribute with its sizes kept, once', async () => {
	const s = stub();
	const repo = repoWith();
	await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	const variable = s.products.find( ( p ) => 'variable' === p.type );
	variable.attributes = [ { id: 0, options: [ 'Small', 'Large' ] } ];
	s.variations[ variable.id ].forEach( ( v ) => {
		v.attributes = [ { id: 0, name: 'Size', option: v.attributes[ 0 ].option } ];
	} );
	s.terms.Small.meta = '';
	s.terms.Large.meta = '';
	const plan = await planFixtures( { client: 'acme', creds: CREDS, fetchImpl: s.impl } );
	assert.equal( plan.find( ( p ) => 'variable' === p.kind ).convert, true );
	assert.deepEqual( plan.find( ( p ) => 'variable' === p.kind ).missingVariations, [] );
	const r = await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } );
	assert.deepEqual( r.created, [ 'variable:global-size' ] );
	assert.deepEqual( s.variations[ variable.id ].map( ( v ) => v.attributes[ 0 ].option ), [ 'Small', 'Large' ], 'the sizes survive the move' );
	assert.equal( s.terms.Small.meta, 'size' );
	assert.equal( s.terms.Large.meta, 'size' );
	assert.deepEqual( ( await applyFixtures( { repo, client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl, wp: s.wp } ) ).created, [] );
} );

test( 'without a wp-cli runner the writer refuses before creating anything', async () => {
	const s = stub();
	await assert.rejects( applyFixtures( { repo: repoWith(), client: 'acme', site: 'acme-test', creds: CREDS, fetchImpl: s.impl } ), /wp-cli runner is required/ );
	assert.deepEqual( s.posts, [] );
} );

test( 'the fixture size axis is the catalogue\'s mapping of "Size", a Google variesBy value', () => {
	assert.equal( SIZE_ATTRIBUTE.variesBy, variesByOf( 'Size', 'size', false ) );
	assert.ok( VARIESBY_VALUES.includes( SIZE_ATTRIBUTE.variesBy ) );
	assert.equal( SIZE_ATTRIBUTE.taxonomy, 'pa_size' );
} );

test( 'a choice with no Google axis is refused before any term is written', () => {
	const s = stub();
	let calls = 0;
	const counted = ( args, input ) => {
		calls++;
		return s.wp( args, input );
	};
	assert.throws( () => applyVariesBy( counted, [ { taxonomy: 'pa_flavour', options: [ 'Small' ], variesBy: null } ] ), VariesByError );
	assert.throws( () => applyVariesBy( counted, [ { taxonomy: 'pa_size', options: [ 'Small' ], variesBy: 'taste' } ] ), VariesByError );
	assert.equal( calls, 0, 'the site was not even read' );
	assert.deepEqual( s.writes, [] );
} );

test( 'a term the site does not have yet is reported missing and stops the run; a write that did not stick stops it too', () => {
	const none = () => `SGSJSON:${ JSON.stringify( [ { taxonomy: 'pa_size', term: 'Small', termId: 0, current: '' } ] ) }\n`;
	assert.deepEqual( planVariesBy( none, [ SIZE_ATTRIBUTE ] ).map( ( r ) => r.action ), [ 'missing' ] );
	assert.throws( () => applyVariesBy( none, [ SIZE_ATTRIBUTE ] ), /still carry no variesBy value: pa_size:Small \(missing\)/ );
	const lost = ( args, input ) => ( input.includes( 'update_term_meta' ) ? 'SGSJSON:[]\n' : `SGSJSON:${ JSON.stringify( [ { taxonomy: 'pa_size', term: 'Small', termId: 1, current: '' } ] ) }\n` );
	assert.throws( () => applyVariesBy( lost, [ SIZE_ATTRIBUTE ] ), /still carry no variesBy value: pa_size:Small \(write\)/ );
	assert.throws( () => applyVariesBy( () => 'no marker', [ SIZE_ATTRIBUTE ] ), /answered no result/ );
} );

test( 'a mirror\'s REST requests are dispatched in-process through wp-cli: the route, query and JSON body reach WordPress and its status and data come back', async () => {
	const seen = [];
	const wp = ( args, input ) => {
		seen.push( JSON.parse( Buffer.from( /base64_decode\( '([^']+)'/.exec( input )[ 1 ], 'base64' ).toString() ) );
		return `Notice: noise\nSGSREST:${ JSON.stringify( { status: 201, data: { id: 9 } } ) }\n`;
	};
	const f = wpFetch( wp );
	const res = await f( 'http://localhost/wp-json/wc/v3/products?sku=a%20b&status=any', { method: 'POST', body: JSON.stringify( { name: 'x' } ) } );
	assert.deepEqual( seen, [ { method: 'POST', route: '/wc/v3/products', query: { sku: 'a b', status: 'any' }, body: { name: 'x' } } ] );
	assert.equal( res.status, 201 );
	assert.equal( res.ok, true );
	assert.equal( ( await wpFetch( () => 'SGSREST:{"status":404,"data":{}}' )( 'http://localhost/wp-json/x' ) ).ok, false );
	assert.deepEqual( await res.json(), { id: 9 } );
	await assert.rejects( f( 'http://localhost/wp-json/wp/v2/media', { method: 'POST', body: Buffer.from( 'png' ) } ), /binary upload cannot go through wp-cli/ );
	await assert.rejects( wpFetch( () => 'no result' )( 'http://localhost/wp-json/' ), /answered no REST result/ );
} );
