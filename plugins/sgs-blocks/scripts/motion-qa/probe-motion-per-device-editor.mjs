/**
 * The inspector round trip for probe-motion-per-device.mjs (Spec 38A FR-38A-12): in the block editor, the Hover panel's
 * Easing field takes a custom curve; an invalid curve is refused with a message and never reaches the stored value, and a
 * valid curve (the negative control) is accepted. The page is opened in the editor and never saved: nothing here calls
 * save, and the browser is closed with the edit unsaved.
 *
 * Every missing control is reported as UNANSWERED naming the control, never as a pass.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { REPO } from './probe-motion-model-lib.mjs';

const wpSession = createRequire( import.meta.url )( path.join( REPO, 'scripts', 'lib', 'wp-session.js' ) );

const INVALID = 'cubic-bezier(2, 0, 1, 1)';
const VALID = 'cubic-bezier(0.3, 1.4, 0.5, 1)';
const SELECTOR = 'm39-ease-bezier';

/** `WP_USER_*`, `WP_PWD_*` of a site from its gitignored env file (never printed). */
function credentials( site ) {
	const key = site.toUpperCase();
	const out = {};
	for ( const line of fs.readFileSync( path.join( REPO, '.claude', 'secrets', `${ site }.env` ), 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) out[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
	}
	return { user: out[ `WP_USER_${ key }` ], pwd: out[ `WP_PWD_${ key }` ] };
}

/** The stored easing of the fixture heading, read from the editor's block state. */
const STORED_EASING = ( token ) => {
	const find = ( blocks ) => {
		for ( const b of blocks ) {
			if ( String( b.attributes.className || '' ).split( /\s+/ ).includes( token ) ) return b;
			const inner = find( b.innerBlocks );
			if ( inner ) return inner;
		}
		return null;
	};
	const block = find( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	if ( ! block ) return null;
	window.wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
	return block.attributes.sgsMotion?.elements?.root?.hover?.state?.values?.easing ?? null;
};

/** Open Hover > Fine-tune > Easing > Custom curve for the selected block; returns the custom-curve field or the name of the control that is missing. */
async function openCurveField( page ) {
	const settings = page.getByRole( 'button', { name: 'Settings', exact: true } );
	if ( await settings.count() && ( await settings.first().getAttribute( 'aria-pressed' ) ) === 'false' ) await settings.first().click();
	// The motion panels mount in the block inspector's Styles tab (MotionPanels.js: InspectorControls group="styles").
	const styles = page.getByRole( 'tab', { name: 'Styles', exact: true } );
	if ( await styles.count() && ( await styles.first().getAttribute( 'aria-selected' ) ) !== 'true' ) await styles.first().click();
	const hover = page.getByRole( 'button', { name: /^Hover\b/ } ).first();
	if ( ! await hover.isVisible().catch( () => false ) ) {
		const titles = await page.locator( '.interface-complementary-area button[aria-expanded]' ).allInnerTexts().catch( () => [] );
		return { missing: `the Hover panel in the block sidebar (panels present: ${ titles.map( ( t ) => t.trim() ).filter( Boolean ).join( ' | ' ) || 'none' })` };
	}
	if ( ( await hover.getAttribute( 'aria-expanded' ) ) === 'false' ) await hover.click();
	let select = page.getByLabel( 'Easing', { exact: true } ).first();
	if ( ! await select.isVisible().catch( () => false ) ) {
		const fine = page.getByRole( 'button', { name: /Fine-tune/i } ).first();
		if ( await fine.isVisible().catch( () => false ) ) await fine.click();
		select = page.getByLabel( 'Easing', { exact: true } ).first();
	}
	if ( ! await select.isVisible().catch( () => false ) ) return { missing: 'the Easing select in Hover > Fine-tune' };
	await select.selectOption( { label: 'Custom curve…' } );
	const field = page.getByLabel( 'Custom curve', { exact: true } ).first();
	return await field.isVisible().catch( () => false ) ? { field } : { missing: 'the Custom curve text field' };
}

/** Run the round trip on the built fixture page. Pushes rows onto `rep`. */
export async function editorCurveCheck( { rep, site, base, pageId } ) {
	const { user, pwd } = credentials( site );
	if ( ! user || ! pwd ) {
		rep.check( 'editor-invalid-curve-refused', { pass: null, why: `no WP_USER/WP_PWD for ${ site } in .claude/secrets/${ site }.env` } );
		return;
	}
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
		await wpSession.ensureLoggedIn( page, { url: base, user, pwd }, 60000 );
		await page.goto( `${ base }/wp-admin/post.php?post=${ pageId }&action=edit`, { waitUntil: 'domcontentloaded' } );
		await page.waitForFunction( () => window.wp?.data?.select( 'core/editor' )?.getCurrentPostId() && window.wp.data.select( 'core/block-editor' ).getBlocks().length > 0, null, { timeout: 90000 } );
		// A user preference can open pages template-locked, where the root blocks are the template's and the page's own
		// blocks sit inside core/post-content; post-only puts the page's blocks at the root, where the finder walks.
		await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).setRenderingMode?.( 'post-only' ) );
		await page.waitForFunction( () => ! window.wp.data.select( 'core/block-editor' ).getBlocks().some( ( b ) => 'core/template-part' === b.name ), null, { timeout: 30000 } );
		const close = page.getByRole( 'button', { name: 'Close', exact: true } );
		if ( await close.first().isVisible().catch( () => false ) ) await close.first().click();
		const stored = await page.evaluate( STORED_EASING, SELECTOR );
		if ( ! stored ) {
			rep.check( 'editor-invalid-curve-refused', { selector: `.${ SELECTOR }`, property: 'sgsMotion hover easing', pass: null, why: 'the fixture heading or its stored easing was not found in the editor' } );
			return;
		}
		const opened = await openCurveField( page );
		if ( opened.missing ) {
			rep.check( 'editor-invalid-curve-refused', { selector: `.${ SELECTOR }`, property: 'inspector', pass: null, why: `not found: ${ opened.missing }` } );
			return;
		}
		await opened.field.fill( INVALID );
		await page.waitForTimeout( 500 );
		const refusal = await page.getByText( /Not saved\./ ).first().isVisible().catch( () => false );
		const after = await page.evaluate( STORED_EASING, SELECTOR );
		rep.check( 'editor-invalid-curve-refused', { selector: `.${ SELECTOR }`, property: 'Custom curve field and stored easing', measured: { typed: INVALID, messageShown: refusal, stored: after }, expected: `a "Not saved." message and the stored easing still ${ stored }`, pass: refusal && after === stored } );
		await opened.field.fill( VALID );
		await page.waitForTimeout( 500 );
		const refusalGone = ! await page.getByText( /Not saved\./ ).first().isVisible().catch( () => false );
		const accepted = await page.evaluate( STORED_EASING, SELECTOR );
		rep.control( 'editor-invalid-curve-refused', { selector: `.${ SELECTOR }`, property: 'Custom curve field and stored easing', measured: { typed: VALID, messageShown: ! refusalGone, stored: accepted }, expected: 'a valid curve shows no message and is stored, so the refusal above is not a field that refuses everything', red: refusalGone && /cubic-bezier\(\s*0?\.3\s*,\s*1\.4\s*,\s*0?\.5\s*,\s*1\s*\)/.test( String( accepted ) ) } );
	} finally {
		await browser.close();
	}
}
