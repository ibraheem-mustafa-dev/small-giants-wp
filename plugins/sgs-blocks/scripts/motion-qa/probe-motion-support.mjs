/**
 * Editor probe: the motion support registers `sgsMotion` for blocks that declare it and for no others (Spec 38A FR-38A-1).
 *
 * Usage (repo root, after a deploy of the support): node plugins/sgs-blocks/scripts/motion-qa/probe-motion-support.mjs [pageId]
 *
 * Logs in to the canary, opens a page in the block editor (default 2742, the homepage) and reads the block types:
 *   - sgs/info-box declares the support: `attributes.sgsMotion.type` is 'object' and has no `default`;
 *   - negative controls: sgs/tab (an SGS block without the support) and core/group (a core block) carry no `sgsMotion`.
 * Vacuity guards: the editor must have booted `wp.blocks`, and every block read must be registered, so a missing block
 * type is a failure and never a pass by absence. Exit 1 on any failed assertion.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const env = Object.fromEntries(
	fs.readFileSync( path.resolve( '.claude/secrets/sandybrown.env' ), 'utf8' )
		.split( /\r?\n/ )
		.filter( ( l ) => l && ! l.startsWith( '#' ) && l.includes( '=' ) )
		.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^['"]|['"]$/g, '' ) ] )
);
const SITE = ( env.WP_URL_SANDYBROWN || '' ).replace( /\/$/, '' );
const PAGE_ID = process.argv[ 2 ] || '2742';

const failures = [];
const check = ( ok, label, detail ) => {
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ label }  ${ JSON.stringify( detail ) }` );
	if ( ! ok ) {
		failures.push( label );
	}
};

const browser = await chromium.launch();
const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
page.on( 'dialog', ( d ) => d.accept() );

await page.goto( `${ SITE }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
await page.fill( '#user_login', env.WP_USER_SANDYBROWN );
await page.fill( '#user_pass', env.WP_PWD_SANDYBROWN );
await page.click( '#wp-submit' );
await page.waitForLoadState( 'domcontentloaded' );
await page.goto( `${ SITE }/wp-admin/post.php?post=${ PAGE_ID }&action=edit`, { waitUntil: 'domcontentloaded' } );
await page.waitForFunction( () => window.wp?.blocks?.getBlockType( 'sgs/info-box' ), null, { timeout: 60000 } );

const read = ( names ) => page.evaluate( ( list ) => Object.fromEntries( list.map( ( name ) => {
	const type = window.wp.blocks.getBlockType( name );
	return [ name, type ? {
		registered: true,
		motionAttribute: type.attributes?.sgsMotion ?? null,
		motionSupport: Boolean( type.supports?.sgs?.motion ),
	} : { registered: false } ];
} ) ), names );

const result = await read( [ 'sgs/info-box', 'sgs/tab', 'core/group' ] );

const supported = result[ 'sgs/info-box' ];
check( true === supported.registered, 'sgs/info-box is registered', supported );
check( 'object' === supported.motionAttribute?.type, 'sgs/info-box exposes sgsMotion as an object', supported.motionAttribute );
check( ! Object.prototype.hasOwnProperty.call( supported.motionAttribute || {}, 'default' ), 'sgsMotion has no default', supported.motionAttribute );
check( true === supported.motionSupport, 'sgs/info-box declares supports.sgs.motion', supported.motionSupport );

for ( const name of [ 'sgs/tab', 'core/group' ] ) {
	const control = result[ name ];
	check( true === control.registered, `${ name } is registered (negative control is not vacuous)`, control );
	check( null === control.motionAttribute, `${ name } carries no sgsMotion`, control.motionAttribute );
}

await browser.close();
if ( failures.length ) {
	console.log( `\n${ failures.length } failed: ${ failures.join( '; ' ) }` );
	process.exit( 1 );
}
console.log( '\nAll motion-support assertions passed.' );
