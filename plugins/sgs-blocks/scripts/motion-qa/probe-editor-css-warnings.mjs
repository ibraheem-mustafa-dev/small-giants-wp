/**
 * Failing-test probe for the editor iframe CSS-loading warnings.
 *
 * RED state (before fix): WP core emits, for every editor load,
 *   "sgs-extensions-editor-css was added to the iframe incorrectly.
 *    Please use block.json or enqueue_block_assets to add styles to the iframe."
 *   plus the same for `sgs-extensions-editor-inline-css`.
 *
 * ROOT CAUSE (proven 2026-07-31): `class-sgs-blocks.php:27` hooks the style to
 * `enqueue_block_editor_assets`, which targets the OUTER admin document. Since
 * WP 6.3 the canvas is an iframe, so core copies the style in as a
 * compatibility fallback and warns. `device-visibility.php:69` attaches an
 * inline style to the SAME handle, producing the second warning.
 *
 * This probe asserts BOTH that the warnings are gone AND that the
 * device-visibility CSS still reaches the iframe — because the inline style is
 * guarded on `wp_style_is( 'sgs-extensions-editor', 'enqueued' )`, so moving the
 * parent style without moving the guard would delete that CSS SILENTLY. A probe
 * that only counted warnings would score that regression as a PASS.
 *
 * Exit 0 pass, 1 fail, 2 inconclusive.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const env = Object.fromEntries(
	fs.readFileSync( '.claude/secrets/sandybrown.env', 'utf8' )
		.split( /\r?\n/ )
		.filter( ( l ) => l.includes( '=' ) && ! l.trim().startsWith( '#' ) )
		.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim() ] )
);

const BASE = ( env.WP_URL_SANDYBROWN || 'https://sandybrown-nightingale-600381.hostingersite.com' ).replace( /\/$/, '' );
const POST = process.argv[ 2 ] || '2083';
const cb = Date.now();

const browser = await chromium.launch();
const page = await browser.newPage();
const warnings = [];
page.on( 'console', ( m ) => {
	if ( m.type() === 'warning' ) warnings.push( m.text() );
} );

try {
	await page.goto( `${ BASE }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
	await page.fill( '#user_login', env.WP_USER_SANDYBROWN );
	await page.fill( '#user_pass', env.WP_PWD_SANDYBROWN );
	await Promise.all( [ page.waitForNavigation( { waitUntil: 'domcontentloaded' } ), page.click( '#wp-submit' ) ] );

	await page.goto( `${ BASE }/wp-admin/post.php?post=${ POST }&action=edit&sgs_cb=${ cb }`, { waitUntil: 'domcontentloaded' } );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', { timeout: 60000 } );
	await page.waitForTimeout( 9000 );

	const iframeCss = await page.evaluate( () => {
		const f = document.querySelector( 'iframe[name="editor-canvas"]' );
		if ( ! f || ! f.contentDocument ) return null;
		const d = f.contentDocument;
		const ids = [ ...d.querySelectorAll( 'style[id], link[id]' ) ].map( ( n ) => n.id );
		const text = [ ...d.querySelectorAll( 'style' ) ].map( ( n ) => n.textContent || '' ).join( '\n' );
		return {
			extensionStyleIds: ids.filter( ( i ) => i.includes( 'sgs-extensions' ) ),
			hasDeviceVisibilityCss: /sgs-hide-(mobile|tablet|desktop)/.test( text ),
		};
	} );

	const offenders = warnings.filter( ( w ) => /added to the iframe incorrectly/i.test( w ) );

	console.log( JSON.stringify( { post: POST, iframeCssWarnings: offenders, iframeCss, totalWarnings: warnings.length }, null, 1 ) );

	if ( iframeCss === null ) {
		console.log( '\nINCONCLUSIVE — editor canvas iframe not reachable; measured nothing.' );
		process.exit( 2 );
	}
	const problems = [];
	if ( offenders.length ) problems.push( `${ offenders.length } iframe-CSS warning(s) still emitted` );
	if ( ! iframeCss.hasDeviceVisibilityCss ) problems.push( 'device-visibility CSS is MISSING from the iframe (silent regression)' );

	if ( problems.length ) {
		console.log( '\nFAIL — ' + problems.join( ' | ' ) );
		process.exit( 1 );
	}
	console.log( '\nPASS — zero iframe-CSS warnings AND device-visibility CSS present in the iframe.' );
	process.exit( 0 );
} catch ( e ) {
	console.log( `\nINCONCLUSIVE — probe failed to reach the measurement: ${ e.message }` );
	process.exit( 2 );
} finally {
	await browser.close();
}
