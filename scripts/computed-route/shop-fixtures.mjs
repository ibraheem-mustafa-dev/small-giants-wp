#!/usr/bin/env node
// Spec 48 section 16, "Minimum fixture products": creates a simple and a variable WooCommerce product (price, stock,
// image) on a test site for the shop proofs. A dry run (the default) reads the site and prints what it would create;
// `--apply` creates it, then reads each product back. A rerun creates nothing twice. Test sites only.
//   node scripts/computed-route/shop-fixtures.mjs <client> --site <secrets name> [--apply] [--repo <root>]
// Exit 0 done, 1 failure, 2 usage.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteCredentials } from './lib/media-upload.mjs';
import { wpCommand } from './lib/calibration-refs.mjs';
import { ShopFixturesError, applyFixtures, imageChoice, planFixtureVariesBy, planFixtures } from './lib/shop-fixtures.mjs';
import { VariesByError } from './lib/shop-fixtures-variesby.mjs';
import { wpFetch } from './lib/shop-fixtures-wp.mjs';

// The sites the fixtures may be written to: fresh test sites that hold no client content.
export const FIXTURE_SITES = [ 'mamas-test', 'eye-care-clone-test', 'local-mamas', 'local-eye-care' ];

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

// The site's calibration target: a local mirror's names its WSL docroot (`pluginDir`), so wp-cli runs there instead of over
// SSH. A mirror keeps no application password, so its REST requests are dispatched in-process through wp-cli; a hosted test
// site is reached over REST with its application password.
const targetsFile = path.join( repo, 'scripts', 'computed-route', 'calibration-targets.json' );
const target = ( existsSync( targetsFile ) ? JSON.parse( readFileSync( targetsFile, 'utf8' ) )[ site ] : null ) || {};
const wp = wpCommand( target, site, repo );
const mirror = /^\/\/wsl\.localhost\//.test( target.pluginDir || '' );

try {
	const creds = mirror ? { url: 'http://localhost', auth: 'wp-cli' } : siteCredentials( secretsRepo, site );
	const fetchImpl = mirror ? wpFetch( wp ) : fetch;
	if ( args.includes( '--apply' ) ) {
		const r = await applyFixtures( { repo, client, site, creds, fetchImpl, wp } );
		console.log( r.created.length ? `created: ${ r.created.join( ', ' ) }${ r.imageUploaded ? ' (image uploaded)' : '' }` : 'nothing to create: every fixture already exists' );
		r.variesBy.forEach( ( v ) => console.log( `variesBy: ${ v.taxonomy } ${ v.term } (term ${ v.termId }) ${ 'write' === v.action ? `set to ${ v.axis }` : `kept ${ v.current }` }` ) );
		r.products.forEach( ( p ) => console.log( `read back: ${ p.kind } id ${ p.id } ${ p.type } ${ p.status } price ${ p.price } stock ${ p.stock } image ${ p.image }${ p.variations.length ? ` variations ${ JSON.stringify( p.variations ) }` : '' }` ) );
	} else {
		const plan = await planFixtures( { client, creds, fetchImpl } );
		const choice = imageChoice( repo, client, site );
		plan.forEach( ( p ) => console.log( `${ p.action }: ${ p.kind } (${ p.sku })${ p.id ? ` id ${ p.id }` : '' }${ p.convert ? ' choice product-local, becomes the global attribute' : '' }${ p.missingVariations.length ? ` missing variations ${ p.missingVariations.join( ', ' ) }` : '' }` ) );
		planFixtureVariesBy( client, wp ).forEach( ( v ) => console.log( `variesBy: ${ v.taxonomy } ${ v.term } ${ 'missing' === v.action ? 'has no term yet' : 'write' === v.action ? `no value, would set ${ v.axis }` : `has ${ v.current }` }` ) );
		console.log( `image: ${ choice ? `${ choice.source } ${ choice.asset }${ choice.id ? ` id ${ choice.id }` : '' }` : 'none found' }` );
		console.log( 'dry run: nothing written (re-run with --apply)' );
	}
} catch ( e ) {
	if ( ! ( e instanceof ShopFixturesError || e instanceof VariesByError ) && ! /no secrets file|lacks WP_/.test( e.message ) ) {
		throw e;
	}
	console.error( e.message );
	process.exit( 1 );
}
