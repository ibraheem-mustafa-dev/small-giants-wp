#!/usr/bin/env node
// Spec 48 section 16, "Minimum fixture products": creates a simple and a variable WooCommerce product (price, stock,
// image) on a test site for the shop proofs. A dry run (the default) reads the site and prints what it would create;
// `--apply` creates it, then reads each product back. A rerun creates nothing twice. Test sites only.
//   node scripts/computed-route/shop-fixtures.mjs <client> --site <secrets name> [--apply] [--repo <root>]
// Exit 0 done, 1 failure, 2 usage.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteCredentials } from './lib/media-upload.mjs';
import { ShopFixturesError, applyFixtures, imageChoice, planFixtures } from './lib/shop-fixtures.mjs';

// The sites the fixtures may be written to: fresh test sites that hold no client content.
export const FIXTURE_SITES = [ 'mamas-test', 'eye-care-clone-test' ];

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
if ( ! client || ! site ) {
	console.error( 'usage: node shop-fixtures.mjs <client> --site <site> [--apply] [--repo <root>]' );
	process.exit( 2 );
}
if ( args.includes( '--apply' ) && ! FIXTURE_SITES.includes( site ) ) {
	console.error( `--apply is allowed on ${ FIXTURE_SITES.join( ' and ' ) } only, not ${ site }` );
	process.exit( 2 );
}
const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = opt( '--repo' ) || path.resolve( here, '../..' );
// Credentials are gitignored, so a worktree reads them from the main checkout.
const secretsRepo = opt( '--secrets' ) || ( () => {
	let dir = repo;
	while ( dir !== path.dirname( dir ) && ! existsSync( path.join( dir, '.claude', 'secrets', `${ site }.env` ) ) ) {
		dir = path.dirname( dir );
	}
	return dir;
} )();

try {
	const creds = siteCredentials( secretsRepo, site );
	if ( args.includes( '--apply' ) ) {
		const r = await applyFixtures( { repo, client, site, creds } );
		console.log( r.created.length ? `created: ${ r.created.join( ', ' ) }${ r.imageUploaded ? ' (image uploaded)' : '' }` : 'nothing to create: every fixture already exists' );
		r.products.forEach( ( p ) => console.log( `read back: ${ p.kind } id ${ p.id } ${ p.type } ${ p.status } price ${ p.price } stock ${ p.stock } image ${ p.image }${ p.variations.length ? ` variations ${ JSON.stringify( p.variations ) }` : '' }` ) );
	} else {
		const plan = await planFixtures( { client, creds } );
		const choice = imageChoice( repo, client, site );
		plan.forEach( ( p ) => console.log( `${ p.action }: ${ p.kind } (${ p.sku })${ p.id ? ` id ${ p.id }` : '' }${ p.missingVariations.length ? ` missing variations ${ p.missingVariations.join( ', ' ) }` : '' }` ) );
		console.log( `image: ${ choice ? `${ choice.source } ${ choice.asset }${ choice.id ? ` id ${ choice.id }` : '' }` : 'none found' }` );
		console.log( 'dry run: nothing written (re-run with --apply)' );
	}
} catch ( e ) {
	if ( ! ( e instanceof ShopFixturesError ) && ! /no secrets file|lacks WP_/.test( e.message ) ) {
		throw e;
	}
	console.error( e.message );
	process.exit( 1 );
}
