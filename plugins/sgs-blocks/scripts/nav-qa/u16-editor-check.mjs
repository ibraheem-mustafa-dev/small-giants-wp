/**
 * U-16 editor check: the entrance panel's Distance and delay options through the real inspector.
 *
 * Usage (repo root): node plugins/sgs-blocks/scripts/nav-qa/u16-editor-check.mjs [pageId] [headerId]
 *
 * On page /qa-entrance/ (fixture case `entrance`, default 4235) it selects the first sgs/info-box with wp.data,
 * opens the block sidebar's Styles tab by role and the Animation panel, then asserts at Desktop and at Tablet
 * (the global device switch, core/editor setDeviceType): the Delay select offers 500ms and 800ms; the Distance
 * select is shown for fade-up with 15/30/50/100px and hidden for fade-in (the negative control); no label says
 * "(per device)". It sets Distance to 50px, saves, reloads and reads sgsAnimationDistance back. On the test header
 * (default 3777) it sets an entrance on sgs/site-header without saving and asserts the first-appearance notice.
 * Exit 1 on any failed assertion.
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
const SITE      = ( env.WP_URL_SANDYBROWN || '' ).replace( /\/$/, '' );
const PAGE_ID   = process.argv[ 2 ] || '4235';
const HEADER_ID = process.argv[ 3 ] || '3777';
const NOTICE    = 'An entrance hides the header until it plays';

const failures = [];
const check    = ( ok, label, detail ) => {
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ label }${ undefined === detail ? '' : '  ' + JSON.stringify( detail ) }` );
	if ( ! ok ) {
		failures.push( label );
	}
};

const browser = await chromium.launch();
const page    = await ( await browser.newContext( { viewport: { width: 1600, height: 1000 } } ) ).newPage();
page.on( 'dialog', ( d ) => d.accept() );

await page.goto( `${ SITE }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
await page.fill( '#user_login', env.WP_USER_SANDYBROWN );
await page.fill( '#user_pass', env.WP_PWD_SANDYBROWN );
await page.click( '#wp-submit' );
await page.waitForLoadState( 'domcontentloaded' );

async function openEditor( id ) {
	await page.goto( `${ SITE }/wp-admin/post.php?post=${ id }&action=edit`, { waitUntil: 'domcontentloaded' } );
	await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlocks().length > 0, null, { timeout: 60000 } );
	await page.waitForTimeout( 2000 );
	const close = page.locator( '.components-modal__header button[aria-label]' );
	if ( await close.count() ) {
		await close.first().click().catch( () => {} );
	}
}

// Selects the first block named `name` (searching inner blocks) and opens its Styles tab and Animation panel.
async function selectAndOpen( name ) {
	const found = await page.evaluate( ( n ) => {
		const walk = ( blocks ) => {
			for ( const b of blocks ) {
				if ( b.name === n ) {
					return b.clientId;
				}
				const inner = walk( b.innerBlocks );
				if ( inner ) {
					return inner;
				}
			}
			return null;
		};
		const id = walk( wp.data.select( 'core/block-editor' ).getBlocks() );
		if ( id ) {
			wp.data.dispatch( 'core/block-editor' ).selectBlock( id );
			( wp.data.dispatch( 'core/edit-post' ) || wp.data.dispatch( 'core/editor' ) ).openGeneralSidebar( 'edit-post/block' );
		}
		return id;
	}, name );
	check( !! found, `${ name } found in the editor` );
	await page.waitForTimeout( 800 );
	const styles = page.getByRole( 'tab', { name: 'Styles' } );
	if ( await styles.count() ) {
		await styles.first().click();
	}
	const toggle = page.locator( '.components-panel__body-toggle', { hasText: /^Animation$/ } ).first();
	check( ( await toggle.count() ) > 0, `${ name } Animation panel present` );
	if ( 'false' === await toggle.getAttribute( 'aria-expanded' ) ) {
		await toggle.click();
	}
	await page.waitForTimeout( 400 );
	return found;
}

const panel      = () => page.locator( '.components-panel__body', { has: page.locator( '.components-panel__body-toggle', { hasText: /^Animation$/ } ) } ).first();
const selectIn   = ( label ) => panel().getByLabel( label, { exact: true } );
const optionsOf  = ( label ) => selectIn( label ).locator( 'option' ).allTextContents();

async function panelChecks( tier ) {
	await page.evaluate( ( t ) => wp.data.dispatch( 'core/editor' ).setDeviceType( t ), tier );
	await page.waitForTimeout( 1200 );
	const delays = await optionsOf( 'Delay' );
	check( delays.includes( '500ms' ) && delays.includes( '800ms' ), `${ tier } Delay offers 500ms and 800ms`, delays );
	const hasDistance = await selectIn( 'Distance' ).count();
	const distances   = hasDistance ? await optionsOf( 'Distance' ) : [];
	check( [ '15px', '30px', '50px', '100px' ].every( ( o ) => distances.includes( o ) ), `${ tier } Distance offers 15/30/50/100px for fade-up`, distances );
	const text = await panel().innerText();
	check( ! /per device/i.test( text ), `${ tier } no "(per device)" label` );
	await selectIn( 'Animation' ).selectOption( 'fade-in' );
	await page.waitForTimeout( 300 );
	check( 0 === await selectIn( 'Distance' ).count(), `${ tier } Distance hidden for fade-in (negative control)` );
	await selectIn( 'Animation' ).selectOption( 'fade-up' );
	await page.waitForTimeout( 300 );
}

// Card on the fixture page.
await openEditor( PAGE_ID );
const cardId = await selectAndOpen( 'sgs/info-box' );
check( 'fade-up' === await selectIn( 'Animation' ).inputValue(), 'card entrance is fade-up' );
await panelChecks( 'Desktop' );
await panelChecks( 'Tablet' );
await page.evaluate( () => wp.data.dispatch( 'core/editor' ).setDeviceType( 'Desktop' ) );
if ( await selectIn( 'Distance' ).count() ) {
	await selectIn( 'Distance' ).selectOption( { label: '50px' } );
}
const before = await page.evaluate( ( id ) => wp.data.select( 'core/block-editor' ).getBlockAttributes( id )?.sgsAnimationDistance, cardId );
check( '50' === before, 'Distance 50px writes sgsAnimationDistance', before );
await page.evaluate( () => wp.data.dispatch( 'core/editor' ).savePost() );
await page.waitForFunction( () => ! wp.data.select( 'core/editor' ).isSavingPost(), null, { timeout: 60000 } );
await page.waitForTimeout( 1500 );
await openEditor( PAGE_ID );
const after = await page.evaluate( () => {
	const walk = ( blocks ) => blocks.reduce( ( hit, b ) => hit || ( 'sgs/info-box' === b.name ? b : walk( b.innerBlocks ) ), null );
	return walk( wp.data.select( 'core/block-editor' ).getBlocks() )?.attributes?.sgsAnimationDistance;
} );
check( '50' === after, 'sgsAnimationDistance survives save and reload', after );
const invalid = await page.locator( '.block-editor-warning' ).count();
check( 0 === invalid, 'no block validation warnings after reload', invalid );

// Header notice (not saved).
await openEditor( HEADER_ID );
await selectAndOpen( 'sgs/site-header' );
await selectIn( 'Animation' ).selectOption( 'none' );
await page.waitForTimeout( 300 );
check( 0 === await panel().getByText( NOTICE ).count(), 'no header notice without an entrance (negative control)' );
await selectIn( 'Animation' ).selectOption( 'fade-in' );
await page.waitForTimeout( 400 );
check( ( await panel().getByText( NOTICE ).count() ) > 0, 'header notice shown with an entrance' );

await browser.close();
console.log( failures.length ? `FAIL (${ failures.length })` : 'PASS' );
process.exit( failures.length ? 1 : 0 );
