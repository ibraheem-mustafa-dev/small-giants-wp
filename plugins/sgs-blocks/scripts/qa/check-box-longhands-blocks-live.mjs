// CR6 U8 live check across migrated blocks: a padding box that sets three sides on desktop and only the top on tablet
// keeps the desktop sides at tablet and mobile, on the front end AND in the editor canvas.
//
// For each block the fixture (check-box-longhands-blocks-live.tree.json) holds a control instance A (no padding) and
// a test instance B (desktop right/bottom/left 20px, tablet top 40px). After CR6, B reads 40 20 20 20 at 768 and 375
// (the mobile tier inherits the tablet tier, Bean 2026-10-07) and A's top with 20 20 20 at 1440. Before CR6 the
// tablet rule was a zero-filling shorthand, so B read 40 0 0 0 at 768: the check fails on the old code by
// construction, whatever the block's own stylesheet default is.
//
// Builds the fixture onto the sandybrown calibration post and empties it again in the same run.
//   node plugins/sgs-blocks/scripts/qa/check-box-longhands-blocks-live.mjs [--front-only] [--keep]
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..', '..' );
const REPO = path.resolve( PLUGIN, '..', '..' );
const require = createRequire( path.join( PLUGIN, 'package.json' ) );
const { chromium } = require( 'playwright' );

const target = JSON.parse( fs.readFileSync( path.join( REPO, 'scripts/computed-route/calibration-targets.json' ), 'utf8' ) ).sandybrown;
const env = Object.fromEntries( fs.readFileSync( path.join( REPO, target.envFile ), 'utf8' ).split( /\r?\n/ )
	.filter( ( l ) => /^[A-Z_]+=/.test( l ) )
	.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ), l.slice( l.indexOf( '=' ) + 1 ).replace( /^["']|["']$/g, '' ) ] ) );
const BASE = env[ `WP_URL_${ target.envKey }` ].replace( /\/$/, '' );
const TREE = path.join( HERE, 'check-box-longhands-blocks-live.tree.json' );
const SLUGS = [ ...new Set( JSON.parse( fs.readFileSync( TREE, 'utf8' ) ).map( ( b ) => b.name.replace( 'sgs/', '' ) ) ) ];
const DEVICE = { 1440: 'Desktop', 768: 'Tablet', 375: 'Mobile' };

const build = ( tree ) => execFileSync( process.execPath, [ path.join( REPO, 'scripts/wp-build-page.js' ),
	'--env-file', target.envFile, '--env-key', target.envKey, '--tree', tree, '--post-id', String( target.postId ), '--status', 'publish' ],
{ cwd: REPO, stdio: [ 'ignore', 'pipe', 'inherit' ], timeout: 300000 } );
const pad = ( el ) => {
	const s = getComputedStyle( el );
	return [ s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft ].map( ( v ) => String( Math.round( parseFloat( v ) ) ) );
};

let bad = 0;
const judge = ( surface, slug, w, a, b ) => {
	if ( ! a || ! b ) {
		bad++;
		console.log( `FAIL ${ surface.padEnd( 6 ) } ${ slug } @${ w }: instance missing (A ${ a ? 'found' : 'missing' }, B ${ b ? 'found' : 'missing' })` );
		return;
	}
	const want = 1440 === w ? [ a[ 0 ], '20', '20', '20' ] : [ '40', '20', '20', '20' ];
	const ok = b.join( ' ' ) === want.join( ' ' );
	bad += ok ? 0 : 1;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ surface.padEnd( 6 ) } ${ slug.padEnd( 9 ) } @${ w }: B ${ b.join( ' ' ) }  want ${ want.join( ' ' ) }  (control A ${ a.join( ' ' ) })` );
};

const empty = path.join( os.tmpdir(), `box-longhands-blocks-empty-${ process.pid }.json` );
fs.writeFileSync( empty, '[]' );
build( TREE );
const browser = await chromium.launch( { channel: 'chrome' } );
try {
	const page = await browser.newPage();
	const url = `${ BASE }/?p=${ target.postId }&cb=${ Date.now() }`;
	for ( const w of [ 1440, 768, 375 ] ) {
		await page.setViewportSize( { width: w, height: 900 } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		for ( const slug of SLUGS ) {
			const read = async ( x ) => {
				const el = await page.$( `.cr6-${ slug }-${ x }` );
				return el ? el.evaluate( pad ) : null;
			};
			judge( 'front', slug, w, await read( 'a' ), await read( 'b' ) );
		}
	}
	if ( ! process.argv.includes( '--front-only' ) ) {
		await page.setViewportSize( { width: 1600, height: 1000 } );
		await page.goto( `${ BASE }/wp-login.php` );
		await page.fill( '#user_login', env[ `WP_USER_${ target.envKey }` ] );
		await page.fill( '#user_pass', env[ `WP_PWD_${ target.envKey }` ] );
		await Promise.all( [ page.waitForNavigation(), page.click( '#wp-submit' ) ] );
		await page.goto( `${ BASE }/wp-admin/post.php?post=${ target.postId }&action=edit` );
		await page.waitForFunction( () => window.wp?.data?.select( 'core/editor' )?.getDeviceType );
		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		for ( const w of [ 1440, 768, 375 ] ) {
			await page.evaluate( ( d ) => window.wp.data.dispatch( 'core/editor' ).setDeviceType( d ), DEVICE[ w ] );
			await page.waitForTimeout( 1500 );
			for ( const slug of SLUGS ) {
				const read = async ( x ) => {
					const loc = canvas.locator( `.cr6-${ slug }-${ x }` ).first();
					return ( await loc.count() ) ? loc.evaluate( pad ) : null;
				};
				judge( 'editor', slug, w, await read( 'a' ), await read( 'b' ) );
			}
		}
	}
} finally {
	await browser.close();
	if ( ! process.argv.includes( '--keep' ) ) {
		build( empty );
	}
	fs.rmSync( empty, { force: true } );
}
console.log( bad ? `${ bad } mismatch(es)` : 'all match' );
process.exit( bad ? 1 : 0 );
