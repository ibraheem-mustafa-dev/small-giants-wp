// The stand-in shop the catalogue step's PHP tests run against (tests/fixtures/catalogue/wc-stub.php): a seeded store that
// persists between php runs, the honey jar catalogue, and a runner for the step. Used by tests/site-build-catalogue-axes-php.test.mjs
// and tests/site-build-catalogue-image-files-php.test.mjs. Needs `php` on PATH.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalogue } from '../../../lib/catalogue-read.mjs';
import { runCatalogue } from '../../../lib/site-build-catalogue.mjs';
import { repoWith } from './repo.mjs';

export const STUB = fileURLToPath( new URL( './wc-stub.php', import.meta.url ) ).split( path.sep ).join( '/' );
export const ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];

// The honey jar (a route-made variable product): Pack size and Grain, four variations. Only the jar is the catalogue here.
export const setup = () => {
	const repo = repoWith( 'shared' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: ROWS } );
	const jar = { ...catalogue, products: [ catalogue.products[ 0 ] ], gaps: [] };
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( jar, null, 2 ) }\n` );
	return { repo, catalogue: jar };
};

// The stub's store as JSON, an empty map and an empty list alike (php encodes both as a list).
export const norm = ( v ) => JSON.stringify( v, ( k, x ) => ( x && 'object' === typeof x && ! Array.isArray( x ) && ! Object.keys( x ).length ? [] : x ) );

// A stand-in shop that persists between php runs. `state` is the stub's store (posts, terms, attrs, objterms, orders).
export function shop( state ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-wc-stub-' ) );
	const file = path.join( dir, 'state.json' ).split( path.sep ).join( '/' );
	fs.writeFileSync( file, JSON.stringify( state ) );
	const runPhp = ( php ) => {
		const r = spawnSync( 'php', [], { input: `<?php\ndefine( 'SGS_STATE_FILE', '${ file }' );\nrequire '${ STUB }';\n${ php }`, encoding: 'utf8' } );
		assert.equal( r.status, 0, `php failed: ${ r.stderr || r.stdout }` );
		return r.stdout.trim().split( /\r?\n/ ).pop();
	};
	return { runPhp, state: () => JSON.parse( fs.readFileSync( file, 'utf8' ) ) };
}

// The seeded store: the honey jar made by the route with the Pack size choice only (the catalogue gained Grain since), its two
// variations for the old choice, and the terms of both attributes. `extra` changes the jar's own row.
export const term = ( id, tax, name, slug ) => [ id, { tax, name, slug, meta: {} } ];
export function seed( { sku = 'sgs-draft-jar', grain = null, orders = [], extra = {}, variations = true } = {} ) {
	const posts = {
		50: { type: 'variable', parent: 0, status: 'publish', name: 'Honey Jar', slug: 'honey-jar', sku, price: '', thumb: 7, gallery: [ 8 ], defaults: { 'pa_pack-size': '6' }, vattrs: {}, meta: { _sgs_draft_product: 'jar', _sgs_rrp: '' },
			attrs: { 'pa_pack-size': { id: 2, name: 'pa_pack-size', options: [ 10, 11 ], position: 0, visible: true, variation: true }, ...( grain ? { 'pa_grain': grain } : {} ) }, ...extra },
	};
	if ( variations ) {
		posts[ 51 ] = { type: 'variation', parent: 50, status: 'publish', name: '', slug: '', sku: `${ sku }-6`, price: '4', thumb: 0, gallery: [], attrs: {}, defaults: {}, vattrs: { 'pa_pack-size': '6' }, meta: {} };
		posts[ 52 ] = { type: 'variation', parent: 50, status: 'publish', name: '', slug: '', sku: `${ sku }-12`, price: '7.5', thumb: 0, gallery: [], attrs: {}, defaults: {}, vattrs: { 'pa_pack-size': '12' }, meta: {} };
	}
	return {
		next: 200, posts,
		terms: Object.fromEntries( [ term( 10, 'pa_pack-size', '6', '6' ), term( 11, 'pa_pack-size', '12', '12' ), ...( grain ? [ term( 20, 'pa_grain', 'Fine set', 'fine-set' ), term( 21, 'pa_grain', 'Coarse set', 'coarse-set' ) ] : [] ) ] ),
		attrs: { 'pa_pack-size': { id: 2, name: 'Pack size' }, ...( grain ? { pa_grain: { id: 3, name: 'Grain' } } : {} ) },
		objterms: { 50: { 'pa_pack-size': [ 10, 11 ], ...( grain ? { pa_grain: grain.options } : {} ) } }, orders, meta: {}, files: {},
	};
}
export const children = ( st, parent = 50 ) => Object.entries( st.posts ).filter( ( [ , p ] ) => p && 'variation' === p.type && p.parent === parent ).map( ( [ id, p ] ) => ( { id: Number( id ), sku: p.sku, status: p.status, set: p.vattrs } ) );
export const run = ( repo, runPhp, apply ) => {
	const out = [];
	const code = runCatalogue( { repo, client: 'demo', site: 'local', runPhp, apply, log: ( l ) => out.push( l ), error: ( l ) => out.push( `ERR ${ l }` ) } );
	return { code, out };
};
export const FOUR = [ 'sgs-draft-jar-6-fine-set', 'sgs-draft-jar-6-coarse-set', 'sgs-draft-jar-12-fine-set', 'sgs-draft-jar-12-coarse-set' ];
