// CR6 P2-b live check across the former var() holdouts: each box is set on every side or corner at desktop, then on ONE
// side or corner at tablet and ONE other at mobile, and the tiers a narrower width leaves unset must keep the wider
// tier's value, on the front end AND in the editor canvas, at 1440 / 768 / 375 (plan:
// .claude/plans/2026-10-07-cr6-box-longhand-migration.md, Phase 2 P2-b).
//
// The one-property-per-box shorthand read tablet as `30 0 0 0` and mobile as `0 0 8 0`, so the check fails on the old
// code by construction. Each row carries its own expected values, written here before the check runs.
//
// Builds the fixture onto the sandybrown calibration post and empties it again in the same run. Fails on any editor
// console error too.
//   node plugins/sgs-blocks/scripts/qa/check-box-var-holdouts-live.mjs [--front-only] [--keep]
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
const TREE = path.join( HERE, 'check-box-var-holdouts-live.tree.json' );
const DEVICE = { 1440: 'Desktop', 768: 'Tablet', 375: 'Mobile' };
// Each row: [name, front selector, editor selector, property, { width: expected }].
const SIDES = { 1440: '10 12 14 16', 768: '30 12 14 16', 375: '30 12 8 16' };
const CORNERS = { 1440: '6 6 6 6', 768: '20 6 6 6', 375: '20 6 4 6' };
const ROWS = [
	[ 'accordion header', '.cr6h-accordion .sgs-accordion-item__header', '.cr6h-accordion .sgs-accordion-item__header', 'padding', SIDES ],
	[ 'accordion content', '.cr6h-accordion .sgs-accordion-item__content', '.cr6h-accordion .sgs-accordion-item__content', 'padding', SIDES ],
	[ 'multi-button radius', '.cr6h-mb .sgs-btn, .cr6h-mb .wp-block-sgs-button, .cr6h-mb a', '.cr6h-mb .cr6h-btn', 'radius', CORNERS ],
	[ 'grid item padding', '.cr6h-cell', '.cr6h-cell', 'padding', SIDES ],
	[ 'grid item radius', '.cr6h-cell', '.cr6h-cell', 'radius', CORNERS ],
	// P2-j (0b22745ec): a bare number prints with px; a radius stored as one length paints four equal corners.
	[ 'grid item bare 24', '.cr6h-cell24', '.cr6h-cell24', 'padding-top', { 1440: '24', 768: '24', 375: '24' } ],
	[ 'button radius "8px"', '.cr6h-btn8, a.cr6h-btn8, .cr6h-btn8 a', '.cr6h-btn8', 'radius', { 1440: '8 8 8 8', 768: '8 8 8 8', 375: '8 8 8 8' } ],
];

const build = ( tree ) => execFileSync( process.execPath, [ path.join( REPO, 'scripts/wp-build-page.js' ),
	'--env-file', target.envFile, '--env-key', target.envKey, '--tree', tree, '--post-id', String( target.postId ), '--status', 'publish' ],
{ cwd: REPO, stdio: [ 'ignore', 'pipe', 'inherit' ], timeout: 300000 } );
// Runs in the page: the four values of one box, rounded to px, in CSS order.
const read = ( el, prop ) => {
	const s = getComputedStyle( el );
	if ( 'padding-top' === prop ) {
		return String( Math.round( parseFloat( s.paddingTop ) ) );
	}
	const v = 'radius' === prop
		? [ s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius ]
		: [ s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft ];
	return v.map( ( x ) => String( Math.round( parseFloat( x ) ) ) ).join( ' ' );
};

let bad = 0;
const report = ( surface, name, w, got, want ) => {
	const ok = got === want;
	bad += ok ? 0 : 1;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ surface.padEnd( 6 ) } ${ name.padEnd( 24 ) } @${ w }: got ${ got }  want ${ want }` );
};

const empty = path.join( os.tmpdir(), `box-var-holdouts-empty-${ process.pid }.json` );
fs.writeFileSync( empty, '[]' );
build( TREE );
const browser = await chromium.launch( { channel: 'chrome', headless: ! process.env.SGS_HEADED } );
try {
	const page = await browser.newPage();
	const url = `${ BASE }/?p=${ target.postId }&cb=${ Date.now() }`;
	for ( const w of [ 1440, 768, 375 ] ) {
		await page.setViewportSize( { width: w, height: 900 } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		for ( const [ name, sel, , prop, want ] of ROWS ) {
			const el = await page.$( sel );
			report( 'front', name, w, el ? await el.evaluate( read, prop ) : 'missing', want[ w ] );
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
			for ( const [ name, , sel, prop, want ] of ROWS ) {
				const loc = canvas.locator( sel ).first();
				const got = ( await loc.count() ) ? await loc.evaluate( read, prop ) : 'missing';
				report( 'editor', name, w, got, want[ w ] );
			}
		}
		// P2-j: the radius controls themselves. A radius stored as "8px" shows as one linked 8 (all four corners equal)
		// and an edit saves a corner object; a fresh container's grid-item radius, typed as 8 on all corners, paints
		// 8px on its cell after a save.
		// The loop above leaves the canvas on Mobile, where a Desktop value is only inherited and the box is empty.
		await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).setDeviceType( 'Desktop' ) );
		await page.waitForTimeout( 800 );
		const sidebar = page.locator( '.interface-complementary-area' );
		const clientIdOf = ( cls ) => page.evaluate( ( c ) => {
			const find = ( blocks ) => blocks.reduce( ( hit, b ) => hit || ( ( b.attributes.className || '' ).split( ' ' ).includes( c ) ? b.clientId : find( b.innerBlocks ) ), '' );
			return find( window.wp.data.select( 'core/block-editor' ).getBlocks() );
		}, cls );
		const select = async ( cls, tab ) => {
			await page.evaluate( ( id ) => window.wp.data.dispatch( 'core/block-editor' ).selectBlock( id ), await clientIdOf( cls ) );
			await page.waitForTimeout( 800 );
			await sidebar.getByRole( 'tab', { name: tab } ).click();
		};
		const openPanel = async ( title ) => {
			const toggle = sidebar.getByRole( 'button', { name: title, exact: true } );
			if ( 'false' === await toggle.getAttribute( 'aria-expanded' ) ) {
				await toggle.click();
			}
			await page.waitForTimeout( 500 );
			return sidebar.locator( '.components-panel__body.is-opened' ).filter( { hasText: 'Border radius' } ).last();
		};
		const radiusOf = ( cls, tier = 'desktop', attr = 'borderRadius' ) => page.evaluate( ( [ c, t, a ] ) => {
			const find = ( blocks ) => blocks.reduce( ( hit, b ) => hit || ( ( b.attributes.className || '' ).split( ' ' ).includes( c ) ? b : find( b.innerBlocks ) ), null );
			return JSON.stringify( find( window.wp.data.select( 'core/block-editor' ).getBlocks() )?.attributes?.[ a ]?.[ t ] ?? null );
		}, [ cls, tier, attr ] );

		await select( 'cr6h-btn8', /Styles/i );
		const btnBox = await openPanel( 'Border' );
		const btnRadius = btnBox.getByRole( 'spinbutton', { name: 'Border radius' } ).first();
		const shown = await btnRadius.inputValue();
		report( 'editor', 'button radius control', 'ui', shown, '8' );
		await btnRadius.fill( '12' );
		await page.waitForTimeout( 600 );
		const corner = '12px';
		report( 'editor', 'button radius saves', 'ui', await radiusOf( 'cr6h-btn8' ),
			JSON.stringify( { topLeft: corner, topRight: corner, bottomRight: corner, bottomLeft: corner } ) );

		await select( 'cr6h-fresh', /Settings/i );
		await openPanel( 'Grid item defaults' );
		const gridBox = sidebar.locator( '.components-panel__body.is-opened' ).filter( { hasText: 'Grid item defaults' } ).last();
		await gridBox.getByRole( 'spinbutton', { name: 'Border radius' } ).first().fill( '8' );
		await page.waitForTimeout( 600 );
		report( 'editor', 'grid radius saves', 'ui', await radiusOf( 'cr6h-fresh', 'desktop', 'gridItemBorderRadius' ),
			JSON.stringify( { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' } ) );
		await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).savePost() );
		await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty() );
		await page.setViewportSize( { width: 1440, height: 900 } );
		await page.goto( url, { waitUntil: 'networkidle' } );
		const cell = await page.$( '.cr6h-freshcell' );
		report( 'front', 'fresh grid radius', 1440, cell ? await cell.evaluate( read, 'radius' ) : 'missing', '8 8 8 8' );

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
