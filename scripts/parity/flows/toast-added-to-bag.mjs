// Flow 5: the shared "Added to bag" toast actually speaks on an add (register 18).
//
// PRECONDITION  A fresh browser context (empty bag, no cooldown from an earlier flow) and a product page that
//               carries the buybox. The product is picked from the Store API; set SGS_FLOW_PRODUCT_A to force one.
//               Needs 31 s or more since the last add of that product (run-all.mjs leaves that gap).
// STEPS         Open the product page. Assert the shell exists at all: Sgs_Toast::request() is opt-in, so a page
//               whose blocks never ask for it prints no shell and the add would have no feedback surface. Install a
//               MutationObserver BEFORE the add — the toast closes itself after 5 s, so a poll taken after the add
//               can miss it and report a false absence. Add through the UI, then read what the observer caught.
// PASS          The shell is present, it became visible once, its message is non-empty, and the "View bag" action
//               is not hidden.
// FAILURE       toast-shell-missing: no .sgs-toast in the DOM, so nothing could announce the add.
//               toast-never-shown: the add returned 2xx but the toast never became visible — the add has no visible
//               feedback. Note buybox/render.php requests the shell while no buybox JS imports the toast store.
//               toast-empty-message / toast-action-hidden: it appeared but said nothing, or offered no way to the bag.
//               add-rejected (HTTP n code): the shop refused the add, so the toast was never reached.
// STATUS        Register 18 is recorded BUILT (c8c2c4162) and is live at 578a8830b, so this flow is its verification.
import { trackAdds, addViaUi, pickProducts } from './lib/bag.mjs';
import { STATUS, main, isDirectRun } from './lib/flow.mjs';

export const meta = {
	name: 'toast-added-to-bag',
	precondition: 'Empty bag in a fresh context; one in-stock product with a buybox; 31 s or more since the last add of it.',
	expected: 'The shared toast shell is present, becomes visible once on the add, carries a message and offers "View bag".',
	failureSignals: [ 'toast-shell-missing', 'toast-never-shown', 'toast-empty-message', 'toast-action-hidden', 'add-rejected (HTTP n code)' ],
};

// Records the FIRST visible state rather than the current one: the toast hides itself
// after 5 s, so reading the DOM after the add would race its own close timer.
async function watchToast( page ) {
	return page.evaluate( () => {
		const el = document.querySelector( '.sgs-toast' );
		window.__sgsToast = { shell: !! el, seen: false, message: '', actionHidden: null, role: '', ariaLive: '' };
		if ( ! el ) {
			return false;
		}
		const capture = () => {
			if ( window.__sgsToast.seen || ! el.classList.contains( 'sgs-toast--visible' ) ) {
				return;
			}
			const msg = el.querySelector( '.sgs-toast__message' );
			const action = el.querySelector( '.sgs-toast__action' );
			window.__sgsToast.seen = true;
			window.__sgsToast.message = msg ? ( msg.textContent || '' ).trim() : '';
			window.__sgsToast.actionHidden = action ? action.hasAttribute( 'hidden' ) : null;
			window.__sgsToast.role = msg ? ( msg.getAttribute( 'role' ) || '' ) : '';
			window.__sgsToast.ariaLive = msg ? ( msg.getAttribute( 'aria-live' ) || '' ) : '';
		};
		new MutationObserver( capture ).observe( el, { attributes: true, subtree: true, childList: true, characterData: true } );
		capture();
		return true;
	} );
}

export function judgeToast( add, toast ) {
	if ( ! add || add.status >= 300 ) {
		return { ok: false, signal: `add-rejected (HTTP ${ add ? add.status : 'none' } ${ add ? add.code : '' })`.trim(), detail: 'the shop refused the add, so the toast was never reached' };
	}
	if ( ! toast.shell ) {
		return { ok: false, signal: 'toast-shell-missing', detail: 'no .sgs-toast in the DOM: Sgs_Toast::request() was never called on this page' };
	}
	if ( ! toast.seen ) {
		return { ok: false, signal: 'toast-never-shown', detail: 'the add returned 2xx but the toast never became visible, so the add had no visible feedback' };
	}
	if ( ! toast.message ) {
		return { ok: false, signal: 'toast-empty-message', detail: 'the toast became visible with an empty message' };
	}
	if ( toast.actionHidden === true ) {
		return { ok: false, signal: 'toast-action-hidden', detail: `toast said "${ toast.message }" but the "View bag" action was hidden` };
	}
	return { ok: true, signal: null, detail: `toast said "${ toast.message }" (role=${ toast.role || 'none' }, aria-live=${ toast.ariaLive || 'none' })` };
}

export async function run( { page, base, note } ) {
	const [ url ] = await pickProducts( page, base, 1 );
	note( 'product', { url } );
	const tracker = trackAdds( page );

	await page.goto( url, { waitUntil: 'domcontentloaded' } );
	const shell = await watchToast( page );
	note( 'shell-present', { shell } );

	const add = await addViaUi( page, tracker );
	note( 'add', { status: add.status, code: add.code, id: add.id } );

	// Give the toast a moment to paint; the observer keeps the first state either way.
	await page.waitForTimeout( 1500 );
	const toast = await page.evaluate( () => window.__sgsToast );
	note( 'toast', toast );

	const verdict = judgeToast( add, toast );
	return {
		status: verdict.ok ? STATUS.PASS : STATUS.FAIL,
		signal: verdict.signal,
		detail: verdict.detail,
		evidence: { add, toast },
	};
}

if ( isDirectRun( import.meta.url ) ) {
	await main( { meta, run } );
}
