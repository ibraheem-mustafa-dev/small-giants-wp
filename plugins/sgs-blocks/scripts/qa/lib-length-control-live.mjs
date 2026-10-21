/**
 * Shared steps for the SgsLengthControl live probes: log in, open a page in the post editor, pick a block, open the
 * inspector control by its label, and read computed sizes from the editor canvas and from the published page.
 *
 * Own Playwright from plugins/sgs-blocks/node_modules, never the shared MCP browser. SGS_HEADED=1 runs real Chrome when
 * the host challenges headless Chromium.
 *
 * @package
 */
import { chromium } from 'playwright';
import { loadSite } from '../motion-qa/probe-editor-canvas-lib.mjs';

export { loadSite };

/**
 * @param {string} siteKey Secrets file key, e.g. 'sandybrown'.
 * @return {Promise<{browser: object, context: object, page: object, site: object}>} A logged-in editor session.
 */
export async function startSession( siteKey ) {
	const site = loadSite( siteKey );
	const headed = Boolean( process.env.SGS_HEADED );
	const browser = await chromium.launch(
		headed ? { headless: false, channel: 'chrome' } : {}
	);
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
	} );
	const page = await context.newPage();
	page.setDefaultTimeout( 20000 );
	page.on( 'dialog', ( d ) => d.accept() );
	await page.goto( `${ site.url }/wp-login.php`, {
		waitUntil: 'domcontentloaded',
	} );
	await page.locator( '#user_login' ).waitFor( { timeout: 20000 } );
	await page.fill( '#user_login', site.user );
	await page.fill( '#user_pass', site.pass );
	await page.click( '#wp-submit' );
	await page.waitForLoadState( 'domcontentloaded' );
	return { browser, context, page, site };
}

/**
 * Open a page in the post editor and wait for the canvas to settle.
 *
 * @param {Object} page   Playwright page.
 * @param {Object} site   { url }.
 * @param {number} postId Page ID.
 * @return {Promise<object>} The canvas frame.
 */
export async function openEditor( page, site, postId ) {
	await page.goto(
		`${ site.url }/wp-admin/post.php?post=${ postId }&action=edit`,
		{ waitUntil: 'domcontentloaded' }
	);
	const deadline = Date.now() + 90000;
	let last = null;
	while ( Date.now() < deadline ) {
		const now = await page
			.evaluate( () => {
				const ed = window.wp?.data?.select( 'core/editor' );
				const be = window.wp?.data?.select( 'core/block-editor' );
				return ed && be
					? {
							postId: ed.getCurrentPostId(),
							mode: ed.getRenderingMode?.() ?? null,
							count: be.getClientIdsWithDescendants().length,
					  }
					: null;
			} )
			.catch( () => null );
		if (
			now &&
			String( now.postId ) === String( postId ) &&
			now.mode &&
			'post-only' !== now.mode
		) {
			await page.evaluate( () =>
				window.wp.data
					.dispatch( 'core/editor' )
					.setRenderingMode( 'post-only' )
			);
		} else if (
			now &&
			String( now.postId ) === String( postId ) &&
			now.count > 0 &&
			last &&
			last.count === now.count
		) {
			break;
		}
		last = now;
		await page.waitForTimeout( 700 );
	}
	await page.evaluate( () => {
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', {
		timeout: 60000,
	} );
	const frame = await (
		await page.$( 'iframe[name="editor-canvas"]' )
	).contentFrame();
	await frame.waitForSelector( '.is-root-container [data-block]', {
		timeout: 60000,
	} );
	await page.waitForTimeout( 1500 );
	return frame;
}

/**
 * Select the first block of a type (depth-first) and open the block inspector.
 *
 * @param {Object} page    Playwright page.
 * @param {string} name    Block name, e.g. 'sgs/icon'.
 * @param {number} [nth=0] Which match.
 * @return {Promise<string>} The block's clientId.
 */
export async function selectBlock( page, name, nth = 0 ) {
	const clientId = await page.evaluate(
		( { name: blockName, nth: index } ) => {
			const flat = [];
			const walk = ( blocks ) =>
				blocks.forEach( ( b ) => {
					flat.push( b );
					walk( b.innerBlocks );
				} );
			walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			return (
				flat.filter( ( b ) => b.name === blockName )[ index ]
					?.clientId || null
			);
		},
		{ name, nth }
	);
	if ( ! clientId ) {
		throw new Error( `no ${ name } block #${ nth } on the page` );
	}
	await page.evaluate( ( id ) => {
		window.wp.data.dispatch( 'core/block-editor' ).selectBlock( id );
		window.wp.data
			.dispatch( 'core/edit-post' )
			.openGeneralSidebar( 'edit-post/block' );
	}, clientId );
	await page.waitForTimeout( 800 );
	return clientId;
}

/**
 * Make a control's label visible in the sidebar: expand collapsed panels (and switch to the Styles tab) until the
 * label text is on screen. Returns a locator for the control group wrapping that label.
 *
 * @param {Object} page  Playwright page.
 * @param {string} label The control's visible label.
 * @return {Promise<object>} Locator for the `.sgs-length-control` (or font-size picker) block containing the label.
 */
export async function revealControl( page, label ) {
	const sidebar = page
		.locator( '.interface-complementary-area, .editor-sidebar' )
		.first();
	const labelLoc = () => sidebar.getByText( label, { exact: true } ).first();
	for ( let pass = 0; pass < 3; pass++ ) {
		if (
			await labelLoc()
				.isVisible()
				.catch( () => false )
		) {
			break;
		}
		for ( const tab of [ 'Settings', 'Styles' ] ) {
			const t = sidebar.getByRole( 'tab', { name: tab } ).first();
			if ( await t.isVisible().catch( () => false ) ) {
				await t.click();
				await page.waitForTimeout( 400 );
				if (
					await labelLoc()
						.isVisible()
						.catch( () => false )
				) {
					return labelLoc();
				}
			}
		}
		const closed = sidebar.locator(
			'button.components-panel__body-toggle[aria-expanded="false"]'
		);
		const count = await closed.count();
		for ( let i = 0; i < count; i++ ) {
			await closed
				.nth( 0 )
				.click()
				.catch( () => {} );
			await page.waitForTimeout( 200 );
			if (
				await labelLoc()
					.isVisible()
					.catch( () => false )
			) {
				return labelLoc();
			}
		}
	}
	const found = labelLoc();
	await found.scrollIntoViewIfNeeded().catch( () => {} );
	return found;
}

/**
 * Computed size of the first element matching `selector` in a frame or page, as px numbers.
 *
 * @param {Object}   target   Playwright page or frame.
 * @param {string}   selector CSS selector.
 * @param {string[]} [props]  Computed properties to read.
 * @return {Promise<object|null>} { width, height, fontSize, ... } or null when absent.
 */
export async function computed(
	target,
	selector,
	props = [ 'width', 'height', 'font-size' ]
) {
	return target.evaluate(
		( { sel, list } ) => {
			const el = document.querySelector( sel );
			if ( ! el ) {
				return null;
			}
			const cs = getComputedStyle( el );
			return Object.fromEntries(
				list.map( ( p ) => [ p, cs.getPropertyValue( p ) ] )
			);
		},
		{ sel: selector, list: props }
	);
}
