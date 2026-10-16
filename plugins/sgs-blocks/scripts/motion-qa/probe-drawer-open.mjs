/**
 * Open a nav drawer the way a visitor does, for the drawer probes.
 *
 * The trigger is the visible element whose `aria-controls` names the drawer's `<dialog>`; Playwright's `page.click()`
 * waits until it is visible, stable and not covered, scrolls it into view and sends real pointer events at its centre.
 * At a width where the burger is hidden (the bar shows its links), the hidden trigger is clicked through the DOM, so the
 * drawer's motion is still measured there.
 * The open is confirmed by the `open` token in the dialog's `data-sgs-motion-state`. A click that lands before the
 * Interactivity API has hydrated the trigger has no listener and does nothing (WebKit on the canary loads the modules
 * after `load`: proven 2026-10-16, a click at `load` left the dialog shut and the same click 3s later opened it), so
 * the click repeats every `RETRY_MS` until the dialog opens or the timeout ends; once it opens no further click is
 * sent. When it does not open, `why` reads the state that explains it: the page title (the host's edge serves
 * "Checking your browser" to a headless browser under load, a page with no drawer), whether a trigger was found and
 * visible, and the dialog's state.
 */

/** How long one click waits for the open state before the next. */
const RETRY_MS = 600;

/**
 * @param {import('playwright').Page} page
 * @param {string}                    drawerSelector The drawer `<dialog>` (a class on the block, e.g. `.m45-drawer`).
 * @param {number}                    timeout        How long to wait for the open state, in ms.
 * @return {Promise<{opened: boolean, why: string, clicks?: number}>}
 */
export async function openDrawer( page, drawerSelector, timeout = 8000 ) {
	const found = await page.evaluate( ( sel ) => {
		const drawer = document.querySelector( sel );
		if ( ! drawer ) {
			return { drawer: false, title: document.title };
		}
		const triggers = [ ...document.querySelectorAll( `[aria-controls="${ drawer.id }"]` ) ];
		const visible = triggers.find( ( t ) => t.getClientRects().length && 'hidden' !== getComputedStyle( t ).visibility );
		( visible || triggers[ 0 ] )?.setAttribute( 'data-probe-drawer-trigger', '' );
		return { drawer: true, tag: drawer.tagName, triggers: triggers.length, visible: !! visible, title: document.title };
	}, drawerSelector );
	if ( ! found.drawer ) {
		return { opened: false, why: `no ${ drawerSelector } on the page (title "${ found.title }")` };
	}
	if ( ! found.triggers ) {
		return { opened: false, why: `nothing controls the ${ found.tag } (the page needs the burger)` };
	}
	const isOpen = ( sel ) => /(^|\s)open(\s|$)/.test( document.querySelector( sel )?.getAttribute( 'data-sgs-motion-state' ) || '' );
	const deadline = Date.now() + timeout;
	let clicks = 0;
	while ( Date.now() < deadline ) {
		// A dialog that opened late covers the trigger, so a click is bounded and the open state is read after it.
		const clicked = found.visible
			? await page.click( '[data-probe-drawer-trigger]', { timeout: RETRY_MS } ).then( () => true, () => false )
			: await page.evaluate( () => document.querySelector( '[data-probe-drawer-trigger]' )?.click() ).then( () => true );
		clicks += clicked ? 1 : 0;
		const opened = await page.waitForFunction( isOpen, drawerSelector, { timeout: RETRY_MS } ).then( () => true, () => false );
		if ( opened ) {
			return { opened: true, why: '', clicks };
		}
	}
	const state = await page.evaluate( ( sel ) => {
		const d = document.querySelector( sel );
		return { open: !! d?.open, motion: d?.getAttribute( 'data-sgs-motion-state' ) };
	}, drawerSelector );
	return { opened: false, why: `clicked ${ clicks } times; dialog.open ${ state.open }, data-sgs-motion-state "${ state.motion }"`, clicks };
}
