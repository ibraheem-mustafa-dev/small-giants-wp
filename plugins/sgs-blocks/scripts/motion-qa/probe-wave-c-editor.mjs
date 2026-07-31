/**
 * Spec 38 Wave C — EDITOR-surface probe (D388).
 *
 * The frontend probe (`probe-wave-c.mjs`) proves the effects move for a
 * visitor. It says nothing about the block editor, which is a separate surface
 * no prebuild gate covers — and this repo has shipped TWO editor-killing
 * crashes past an all-green build (D388). So: open the real editor on the real
 * canary page, and assert that every Wave C block mounted, rendered inspector
 * controls, and produced no React error boundary.
 *
 * "The page loaded" is NOT the assertion. A crashed block still leaves the
 * editor loaded — it just swaps the block for a recovery notice. The checks
 * below therefore look for the block's own wrapper, the absence of WP's
 * "block-crashed"/"has encountered an error" surfaces, and a non-zero
 * inspector-panel count when the block is selected.
 *
 * Usage: node scripts/motion-qa/probe-wave-c-editor.mjs [postId]
 * Exit 0 pass · 1 fail.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ENV_PATH = path.resolve( '.claude/secrets/sandybrown.env' );
const env = Object.fromEntries(
	fs
		.readFileSync( ENV_PATH, 'utf8' )
		.split( /\r?\n/ )
		.filter( ( l ) => l && ! l.startsWith( '#' ) && l.includes( '=' ) )
		.map( ( l ) => {
			const i = l.indexOf( '=' );
			return [ l.slice( 0, i ).trim(), l.slice( i + 1 ).trim() ];
		} )
);

const SITE = ( env.WP_URL_SANDYBROWN || '' ).replace( /\/$/, '' );
const POST_ID = process.argv[ 2 ] || '2074';

const BLOCKS = [
	{ slug: 'sgs/gallery', wrapper: '.wp-block-sgs-gallery' },
	{ slug: 'sgs/testimonial-slider', wrapper: '.wp-block-sgs-testimonial-slider' },
	{ slug: 'sgs/responsive-logo', wrapper: '.wp-block-sgs-responsive-logo' },
	{ slug: 'sgs/before-after', wrapper: '.wp-block-sgs-before-after' },
	{ slug: 'sgs/image-sequence', wrapper: '.wp-block-sgs-image-sequence' },
];

const browser = await chromium.launch();
const context = await browser.newContext( { viewport: { width: 1600, height: 1000 } } );
const page = await context.newPage();
const pageErrors = [];
page.on( 'pageerror', ( e ) => pageErrors.push( e.message ) );

// ── log in ──
await page.goto( `${ SITE }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
await page.fill( '#user_login', env.WP_USER_SANDYBROWN );
await page.fill( '#user_pass', env.WP_PWD_SANDYBROWN );
await page.click( '#wp-submit' );
await page.waitForLoadState( 'domcontentloaded' );

// ── open the post in the block editor ──
await page.goto( `${ SITE }/wp-admin/post.php?post=${ POST_ID }&action=edit`, {
	waitUntil: 'domcontentloaded',
} );
await page.waitForTimeout( 12000 );

// Dismiss the welcome modal if it is in the way.
const modalClose = page.locator( '.components-modal__header button[aria-label]' );
if ( await modalClose.count() ) {
	await modalClose.first().click().catch( () => {} );
	await page.waitForTimeout( 800 );
}

const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
const useIframe = await page.locator( 'iframe[name="editor-canvas"]' ).count();
const root = useIframe ? canvas : page;

const results = [];
for ( const block of BLOCKS ) {
	const locator = root.locator( block.wrapper );
	const count = await locator.count().catch( () => 0 );

	let inspectorPanels = 0;
	let selected = false;
	if ( count > 0 ) {
		try {
			await locator.first().click( { timeout: 8000 } );
			await page.waitForTimeout( 1800 );
			selected = true;
			inspectorPanels = await page
				.locator(
					'.interface-interface-skeleton__sidebar .components-panel__body, .interface-interface-skeleton__sidebar .components-tools-panel'
				)
				.count();
		} catch ( err ) {
			selected = false;
		}
	}

	results.push( { ...block, count, selected, inspectorPanels } );
}

// WP replaces a crashed block with a recovery surface — look for it EXPLICITLY,
// because the editor still "loads" fine when a block blows up.
const crashSurfaces = await root
	.locator(
		'.block-editor-block-list__block-crash-warning, .block-editor-warning, .components-notice.is-error'
	)
	.allTextContents()
	.catch( () => [] );

await page.screenshot( {
	path: 'reports/visual-diff/assets/wave-c-editor-2026-07-31.png',
	fullPage: false,
} );

const out = {
	postId: POST_ID,
	iframedCanvas: !! useIframe,
	blocks: results,
	crashSurfaces,
	pageErrors: pageErrors.slice( 0, 10 ),
};
console.log( JSON.stringify( out, null, 1 ) );

const fails = [];
results.forEach( ( r ) => {
	if ( ! r.count ) {
		fails.push( `${ r.slug }: wrapper not present in the editor canvas` );
	} else if ( ! r.selected ) {
		fails.push( `${ r.slug }: could not be selected` );
	} else if ( ! r.inspectorPanels ) {
		fails.push( `${ r.slug }: zero inspector panels when selected` );
	}
} );
if ( crashSurfaces.length ) {
	fails.push( `block crash/warning surface present: ${ crashSurfaces.join( ' | ' ) }` );
}

console.log( '\n=== VERDICT ===' );
if ( fails.length ) {
	console.log( 'FAIL:\n - ' + fails.join( '\n - ' ) );
	process.exit( 1 );
}
console.log( 'PASS — all five Wave C blocks mount, select and render inspector controls.' );
await browser.close();
process.exit( 0 );
