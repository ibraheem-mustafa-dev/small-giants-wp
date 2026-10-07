// CR6 P2-a live check across the corner-radius patterns: a radius set on every corner at desktop, then on ONE corner at
// tablet and ONE other corner at mobile, keeps the corners each narrower tier leaves unset, on the front end AND in the
// editor canvas, at 1440 / 768 / 375 (plan: .claude/plans/2026-10-07-cr6-box-longhand-migration.md, Phase 2 P2-a/P2-c).
//
// Every instance in check-box-corners-blocks-live.tree.json sets desktop 6px all round, tablet top-left 20px and mobile
// bottom-right 4px, so the right answer is 6 6 6 6 / 20 6 6 6 / 20 6 4 6 whatever the block's stylesheet says. The
// zero-filling shorthand read 20 0 0 0 at 768 and 0 0 4 0 at 375, so the check fails on the old code by construction.
// The media block also sets padding the same way (top/right/bottom/left), read on the same element.
//
// Builds the fixture onto the sandybrown calibration post and empties it again in the same run. Fails on any editor
// console error too.
//   node plugins/sgs-blocks/scripts/qa/check-box-corners-blocks-live.mjs [--front-only] [--keep]
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
const TREE = path.join( HERE, 'check-box-corners-blocks-live.tree.json' );
const DEVICE = { 1440: 'Desktop', 768: 'Tablet', 375: 'Mobile' };
const WANT = { 1440: '6 6 6 6', 768: '20 6 6 6', 375: '20 6 4 6' };
// Each row: what to read, on the page and in the editor canvas. The media atoms paint the media element: on the page
// the image is the block root (both classes on one element), in the canvas it sits inside the block wrapper. The
// quote's canvas wrapper does not carry the custom class, so it is found by its block type.
const MEDIA = '.cr6r-media.sgs-media-el, .cr6r-media .sgs-media-el';
const ROWS = [
	[ 'text', '.cr6r-text', '.cr6r-text', 'radius' ],
	[ 'heading', '.cr6r-heading', '.cr6r-heading', 'radius' ],
	[ 'quote', '.cr6r-quote', '[data-type="sgs/quote"]', 'radius' ],
	[ 'breadcrumbs', '.cr6r-breadcrumbs', '.cr6r-breadcrumbs', 'radius' ],
	[ 'card-grid', '.cr6r-card-grid', '.cr6r-card-grid', 'radius' ],
	[ 'media', MEDIA, MEDIA, 'radius' ],
	[ 'media', MEDIA, MEDIA, 'padding' ],
];

const build = ( tree ) => execFileSync( process.execPath, [ path.join( REPO, 'scripts/wp-build-page.js' ),
	'--env-file', target.envFile, '--env-key', target.envKey, '--tree', tree, '--post-id', String( target.postId ), '--status', 'publish' ],
{ cwd: REPO, stdio: [ 'ignore', 'pipe', 'inherit' ], timeout: 300000 } );
// Runs in the page: the four values of one box, rounded to px, in CSS order.
const read = ( el, prop ) => {
	const s = getComputedStyle( el );
	const v = 'radius' === prop
		? [ s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius ]
		: [ s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft ];
	return v.map( ( x ) => String( Math.round( parseFloat( x ) ) ) ).join( ' ' );
};

let bad = 0;
const report = ( surface, slug, prop, w, got ) => {
	const ok = got === WANT[ w ];
	bad += ok ? 0 : 1;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ surface.padEnd( 6 ) } ${ `${ slug } ${ prop }`.padEnd( 20 ) } @${ w }: got ${ got }  want ${ WANT[ w ] }` );
};

const empty = path.join( os.tmpdir(), `box-corners-blocks-empty-${ process.pid }.json` );
fs.writeFileSync( empty, '[]' );
build( TREE );
const browser = await chromium.launch( { channel: 'chrome' } );
try {
	const page = await browser.newPage();
	const url = `${ BASE }/?p=${ target.postId }&cb=${ Date.now() }`;
	for ( const w of [ 1440, 768, 375 ] ) {
		await page.setViewportSize( { width: w, height: 900 } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		for ( const [ slug, sel, , prop ] of ROWS ) {
			const el = await page.$( sel );
			report( 'front', slug, prop, w, el ? await el.evaluate( read, prop ) : 'missing' );
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
			await page.waitForTimeout( 1500 );
			for ( const [ slug, , sel, prop ] of ROWS ) {
				const loc = canvas.locator( sel ).first();
				const got = ( await loc.count() ) ? await loc.evaluate( read, prop ) : 'missing';
				report( 'editor', slug, prop, w, got );
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
