// CR6 live check: padding set on one side, or a radius set on one corner, of one tier changes only that side or
// corner, on the front end AND in the editor canvas, at 1440 / 768 / 375 (plan:
// .claude/plans/2026-10-07-cr6-box-longhand-migration.md, U4/U8 and Phase 2 P2-a). The editor read also fails on
// any console error.
//
// Builds the fixture (check-box-longhands-live.tree.json: six sgs/whatsapp-cta instances) onto the sandybrown
// calibration post through scripts/wp-build-page.js, reads computed padding, then empties the post again in the
// same run, whatever the result. Exits 1 on any mismatch.
//
//   node plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs [--front-only] [--keep]
//
// Before CR6 the tablet and mobile rows read e.g. `40 0 0 0`: the shorthand zero-filled every unset side.
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

// Padding top right bottom left, in px. The inline variant's stylesheet default is 12px 24px.
// Radius top-left top-right bottom-right bottom-left, in px; S is the stylesheet's own radius, read from cr6-r0
// (no radius set at any tier), so the check holds whatever the site's --wp--custom--border-radius--medium is.
const WANT = {
	'cr6-a': { 1440: '24 24 24 24', 768: '40 24 24 24', 375: '40 24 24 24' }, // desktop 24 all round, tablet top 40
	'cr6-b': { 1440: '12 24 12 24', 768: '40 24 12 24', 375: '40 24 12 24' }, // desktop unset, tablet top 40
	'cr6-c': { 1440: '12 24 12 24', 768: '12 24 12 30', 375: '50 24 12 30' }, // tablet left 30, mobile top 50 (inherits left)
	'cr6-d': { 1440: 'S S S S', 768: '20 S S S', 375: '20 S S S' }, // radius: tablet top-left 20
	'cr6-e': { 1440: 'S S S S', 768: '20 S S S', 375: '20 S 4 S' }, // radius: tablet top-left 20, mobile bottom-right 4 (inherits top-left)
};
const PROP = { 'cr6-d': 'radius', 'cr6-e': 'radius' };
const ORDER = JSON.parse( fs.readFileSync( path.join( HERE, 'check-box-longhands-live.tree.json' ), 'utf8' ) )
	.map( ( b ) => b.attributes.anchor );
const DEVICE = { 1440: 'Desktop', 768: 'Tablet', 375: 'Mobile' };

const build = ( tree ) => execFileSync( process.execPath, [ path.join( REPO, 'scripts/wp-build-page.js' ),
	'--env-file', target.envFile, '--env-key', target.envKey, '--tree', tree, '--post-id', String( target.postId ), '--status', 'publish' ],
{ cwd: REPO, stdio: [ 'ignore', 'pipe', 'inherit' ], timeout: 300000 } );
// Runs in the page, so it takes the property name as an argument rather than closing over PROP.
const read = ( el, prop ) => {
	const s = getComputedStyle( el );
	const sides = 'radius' === prop
		? [ s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius ]
		: [ s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft ];
	return sides.map( ( v ) => String( Math.round( parseFloat( v ) ) ) ).join( ' ' );
};

let bad = 0;
// The stylesheet radius per surface and width, from the cr6-r0 control instance.
const stylesheetRadius = {};
const report = ( surface, id, w, got ) => {
	const s = stylesheetRadius[ `${ surface } ${ w }` ];
	const want = WANT[ id ][ w ].replace( /S/g, s );
	const ok = got === want;
	bad += ok ? 0 : 1;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ surface.padEnd( 6 ) } ${ id } @${ w }: got ${ got }  want ${ want }` );
};
// A stylesheet radius of 0 would make every radius row pass with or without the fix: refuse to judge then.
const control = ( surface, w, got ) => {
	const corners = got.split( ' ' );
	const s = corners[ 0 ];
	if ( 'missing' === got || '0' === s || corners.some( ( c ) => c !== s ) ) {
		bad += 1;
		console.log( `FAIL ${ surface.padEnd( 6 ) } cr6-r0 @${ w }: control radius ${ got } is not one non-zero value, so the radius rows prove nothing` );
	}
	stylesheetRadius[ `${ surface } ${ w }` ] = s;
};

const empty = path.join( os.tmpdir(), `box-longhands-empty-${ process.pid }.json` );
fs.writeFileSync( empty, '[]' );
build( path.join( HERE, 'check-box-longhands-live.tree.json' ) );
const browser = await chromium.launch( { channel: 'chrome' } );
try {
	const page = await browser.newPage();
	const url = `${ BASE }/?p=${ target.postId }&cb=${ Date.now() }`;
	for ( const w of [ 1440, 768, 375 ] ) {
		await page.setViewportSize( { width: w, height: 900 } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		const r0 = await page.$( '#cr6-r0' );
		control( 'front', w, r0 ? await r0.evaluate( read, 'radius' ) : 'missing' );
		for ( const id of Object.keys( WANT ) ) {
			const el = await page.$( `#${ id }` );
			report( 'front', id, w, el ? await el.evaluate( read, PROP[ id ] ) : 'missing' );
		}
	}
	if ( ! process.argv.includes( '--front-only' ) ) {
		const consoleErrors = [];
		page.on( 'console', ( m ) => 'error' === m.type() && consoleErrors.push( m.text() ) );
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
			await page.waitForTimeout( 1200 );
			// The canvas has no anchors on the button, so an instance is found by its place in the fixture tree.
			const btn = ( id ) => canvas.locator( '.sgs-whatsapp-cta__btn' ).nth( ORDER.indexOf( id ) );
			await btn( 'cr6-r0' ).waitFor( { timeout: 20000 } );
			control( 'editor', w, await btn( 'cr6-r0' ).evaluate( read, 'radius' ) );
			for ( const id of Object.keys( WANT ) ) {
				await btn( id ).waitFor( { timeout: 20000 } );
				report( 'editor', id, w, await btn( id ).evaluate( read, PROP[ id ] ) );
			}
		}
		consoleErrors.forEach( ( e ) => {
			bad += 1;
			console.log( `FAIL editor console error: ${ e }` );
		} );
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
