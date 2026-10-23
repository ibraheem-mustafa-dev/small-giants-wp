// The minimum fixture products for the shop proofs (Spec 48 section 16): one simple and one variable WooCommerce product
// with a price, stock and an image, created through the WooCommerce REST API so the buy box, filter, basket drawer and
// toast render on a test site. Each product carries a SKU and a `_sgs_fixture` meta key (`<client>:<kind>`), so a rerun
// finds what exists and creates nothing twice. Content is generic: fixtures name no client.
import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_TYPES, mediaAssets } from './media-upload.mjs';

export class ShopFixturesError extends Error {}

export const META_KEY = '_sgs_fixture';
const PHOTO = /photo|product|frame|hero/i;
const RASTER = new Set( [ '.jpg', '.jpeg', '.png', '.webp' ] );
const json = async ( res ) => {
	try {
		return await res.json();
	} catch {
		return null;
	}
};

export const skuFor = ( client, kind ) => `sgs-fixture-${ client }-${ kind }`;

// The fixture definitions, without the image id: a simple product and a variable one with two sizes.
export function fixtureDefs( client ) {
	const tag = ( kind ) => [ { key: META_KEY, value: `${ client }:${ kind }` } ];
	return [
		{ kind: 'simple', body: { name: 'Fixture simple product', type: 'simple', status: 'publish', sku: skuFor( client, 'simple' ), regular_price: '12.50', manage_stock: true, stock_quantity: 25, short_description: 'A simple product for the shop proofs.', meta_data: tag( 'simple' ) }, variations: [] },
		{ kind: 'variable', body: { name: 'Fixture variable product', type: 'variable', status: 'publish', sku: skuFor( client, 'variable' ), short_description: 'A variable product for the shop proofs.', attributes: [ { name: 'Size', visible: true, variation: true, options: [ 'Small', 'Large' ] } ], meta_data: tag( 'variable' ) }, variations: [ { option: 'Small', regular_price: '10.00', stock_quantity: 20 }, { option: 'Large', regular_price: '14.00', stock_quantity: 15 } ] },
	];
}

// The image a fixture shows: the site's entry in the client's media-map.json when it has one, else a raster file from the
// draft's assets (a photograph by name first). Returns `{ source: 'media-map', id }`, `{ source: 'asset', asset }` or null.
export function imageChoice( repo, client, site ) {
	const mapFile = path.join( repo, 'sites', client, 'build', 'media-map.json' );
	if ( fs.existsSync( mapFile ) ) {
		const hit = ( JSON.parse( fs.readFileSync( mapFile, 'utf8' ) ).sites?.[ site ]?.files || [] ).find( ( f ) => f.id && RASTER.has( path.extname( f.asset ).toLowerCase() ) );
		if ( hit ) {
			return { source: 'media-map', id: hit.id, asset: hit.asset };
		}
	}
	const rasters = mediaAssets( repo, client ).filter( ( a ) => RASTER.has( path.extname( a ).toLowerCase() ) );
	const asset = rasters.find( ( a ) => PHOTO.test( path.basename( a ) ) ) || rasters[ 0 ];
	return asset ? { source: 'asset', asset } : null;
}

// Refuses a site without WooCommerce: its REST index lists no `wc/v3` namespace.
export async function requireWooCommerce( { creds, fetchImpl = fetch } ) {
	const res = await fetchImpl( `${ creds.url }/wp-json/` );
	const index = res.ok ? await json( res ) : null;
	if ( ! index ) {
		throw new ShopFixturesError( `${ creds.url } did not answer its REST index (status ${ res.status })` );
	}
	if ( ! ( index.namespaces || [] ).includes( 'wc/v3' ) ) {
		throw new ShopFixturesError( `${ creds.url } has no WooCommerce REST API (wc/v3): activate WooCommerce on the site before creating fixture products` );
	}
}

const api = ( creds, fetchImpl ) => async ( method, route, body ) => {
	const res = await fetchImpl( `${ creds.url }/wp-json/${ route }`, { method, headers: { Authorization: creds.auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify( body ) : undefined } );
	const data = await json( res );
	if ( ! res.ok ) {
		throw new ShopFixturesError( `${ method } ${ route } answered ${ res.status }: ${ JSON.stringify( data ).slice( 0, 300 ) }` );
	}
	return data;
};

// The existing fixture product for a definition (by SKU, any status) and, for a variable one, the sizes it already has.
async function existingFor( call, def ) {
	const [ product ] = await call( 'GET', `wc/v3/products?sku=${ encodeURIComponent( def.body.sku ) }&status=any` );
	if ( ! product ) {
		return null;
	}
	const have = def.variations.length ? ( await call( 'GET', `wc/v3/products/${ product.id }/variations?per_page=100` ) ).map( ( v ) => v.attributes?.[ 0 ]?.option ) : [];
	return { id: product.id, haveOptions: have };
}

// What a run would do, from the site's current state: per fixture `create` (new product, all its variations) or
// `exists` (with the variations still missing). Reads only.
export async function planFixtures( { client, creds, fetchImpl = fetch } ) {
	await requireWooCommerce( { creds, fetchImpl } );
	const call = api( creds, fetchImpl );
	const plan = [];
	for ( const def of fixtureDefs( client ) ) {
		const found = await existingFor( call, def );
		plan.push( { kind: def.kind, sku: def.body.sku, action: found ? 'exists' : 'create', id: found?.id ?? null, missingVariations: def.variations.filter( ( v ) => ! ( found?.haveOptions || [] ).includes( v.option ) ).map( ( v ) => v.option ) } );
	}
	return plan;
}

// The attachment id for an image choice: a media-map id as is, else the attachment already titled for this asset, else
// the asset uploaded now. Returns `{ id, uploaded }`; null when `apply` is off and an upload would be needed.
export async function ensureImage( { repo, client, choice, creds, fetchImpl = fetch, apply } ) {
	if ( ! choice ) {
		return null;
	}
	if ( 'media-map' === choice.source ) {
		return { id: choice.id, uploaded: false };
	}
	const call = api( creds, fetchImpl );
	const title = `sgs-fixture-${ client }-${ path.basename( choice.asset ) }`;
	const found = ( await call( 'GET', `wp/v2/media?search=${ encodeURIComponent( title ) }&per_page=20` ) ).find( ( m ) => m.title?.rendered === title );
	if ( found ) {
		return { id: found.id, uploaded: false };
	}
	if ( ! apply ) {
		return null;
	}
	const name = path.basename( choice.asset );
	const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media`, { method: 'POST', headers: { Authorization: creds.auth, 'Content-Type': IMAGE_TYPES[ path.extname( name ).toLowerCase() ], 'Content-Disposition': `attachment; filename="${ name.replace( /[^\x20-\x7e]|["\\]/g, '_' ) }"` }, body: fs.readFileSync( path.join( repo, choice.asset ) ) } );
	const media = await json( res );
	if ( 201 !== res.status ) {
		throw new ShopFixturesError( `uploading ${ choice.asset } answered ${ res.status }: ${ JSON.stringify( media ).slice( 0, 300 ) }` );
	}
	await call( 'POST', `wp/v2/media/${ media.id }`, { title } );
	return { id: media.id, uploaded: true };
}

// Creates what the plan lacks, then reads every fixture product back (GET) and returns `{ kind, id, type, price, stock,
// image, variations }` per product. A rerun creates nothing: `created` is empty.
export async function applyFixtures( { repo, client, site, creds, fetchImpl = fetch } ) {
	const plan = await planFixtures( { client, creds, fetchImpl } );
	const call = api( creds, fetchImpl );
	const image = await ensureImage( { repo, client, choice: imageChoice( repo, client, site ), creds, fetchImpl, apply: true } );
	const created = [];
	for ( const def of fixtureDefs( client ) ) {
		const step = plan.find( ( p ) => p.kind === def.kind );
		let id = step.id;
		if ( 'create' === step.action ) {
			id = ( await call( 'POST', 'wc/v3/products', { ...def.body, ...( image ? { images: [ { id: image.id } ] } : {} ) } ) ).id;
			created.push( def.kind );
		}
		for ( const v of def.variations.filter( ( x ) => step.missingVariations.includes( x.option ) ) ) {
			await call( 'POST', `wc/v3/products/${ id }/variations`, { regular_price: v.regular_price, manage_stock: true, stock_quantity: v.stock_quantity, attributes: [ { name: 'Size', option: v.option } ], ...( image ? { image: { id: image.id } } : {} ) } );
			created.push( `${ def.kind }:${ v.option }` );
		}
	}
	const products = [];
	for ( const def of fixtureDefs( client ) ) {
		const [ p ] = await call( 'GET', `wc/v3/products?sku=${ encodeURIComponent( def.body.sku ) }&status=any` );
		if ( ! p ) {
			throw new ShopFixturesError( `${ def.body.sku } did not read back after creation` );
		}
		const variations = def.variations.length ? ( await call( 'GET', `wc/v3/products/${ p.id }/variations?per_page=100` ) ).map( ( v ) => ( { id: v.id, option: v.attributes?.[ 0 ]?.option, price: v.price, stock: v.stock_quantity } ) ) : [];
		products.push( { kind: def.kind, id: p.id, type: p.type, status: p.status, price: p.price, stock: p.stock_quantity, image: p.images?.[ 0 ]?.id ?? null, variations } );
	}
	return { created, imageUploaded: !! image?.uploaded, products };
}
