// The part checks of a site check (site-check.mjs): finding the modals, choice flows and forms a page renders, then
// proving each works on the live page. A modal (sgs/modal) is a <dialog class="sgs-modal__dialog"> opened by its
// `.sgs-modal__trigger[data-modal-id]`, a `[data-sgs-modal-open]` or an `a[href="#<anchor>"]` and closed by its
// `.sgs-modal__close` or Escape (modal/render.php, modal/open-anywhere.js). A choice flow (sgs/choice-flow, Spec 43) is
// `[data-wp-interactive="sgs/choice-flow"]` whose steps are `.sgs-form-step` (one shown), its options
// `.sgs-choice-flow-question__option-button`, its Continue `.sgs-choice-flow__continue` and its Back
// `.sgs-choice-flow__nav-back` (choice-flow/flow-constants.js). A form (sgs/form, Specs 04 and 42) is a `.sgs-form`
// wrapper whose interactivity context carries formId, successMessage and successRedirect (form/render.php).
import { MARK, openDisclosure, closeDisclosure, shownInPage } from './site-check-nav.mjs';
import { successVerdict } from './form-submit-run.mjs';
import { submitForm } from './form-submit-page.mjs';

const SETTLE_MS = 700;
export const FLOW_ROOT = '[data-wp-interactive="sgs/choice-flow"]';

// In-page: the modals, choice flows and forms on the page, each marked (MARK="modal-<i>" on the dialog and
// "mtrig-<i>" on its first visible trigger, "flow-<i>", "form-<i>" on the wrapper).
export function readPartsInPage( mark ) {
	document.querySelectorAll( `[${ mark }]` ).forEach( ( e ) => e.removeAttribute( mark ) );
	const visible = ( el ) => ( el.checkVisibility ? el.checkVisibility( { checkVisibilityCSS: true, checkOpacity: true } ) : !! el.offsetParent ) && el.getBoundingClientRect().width > 0;
	const ctx = ( el ) => {
		try {
			return JSON.parse( el.closest( '[data-wp-context]' )?.getAttribute( 'data-wp-context' ) || '{}' );
		} catch {
			return {};
		}
	};
	const modals = [ ...document.querySelectorAll( 'dialog.sgs-modal__dialog' ) ].map( ( d, i ) => {
		d.setAttribute( mark, `modal-${ i }` );
		const anchor = d.parentElement?.id || '';
		const triggers = [
			...document.querySelectorAll( `.sgs-modal__trigger[data-modal-id="${ CSS.escape( d.id ) }"]` ),
			...( anchor ? [ ...document.querySelectorAll( `[data-sgs-modal-open="${ CSS.escape( anchor ) }"], a[href="#${ CSS.escape( anchor ) }"]` ) ] : [] ),
		];
		const trigger = triggers.find( visible );
		trigger && trigger.setAttribute( mark, `mtrig-${ i }` );
		return { i, id: d.id, anchor, label: d.getAttribute( 'aria-label' ) || '', triggers: triggers.length, visibleTrigger: !! trigger, openOnHash: 'true' === d.dataset.openOnHashLoad };
	} );
	const flows = [ ...document.querySelectorAll( '[data-wp-interactive="sgs/choice-flow"]' ) ].map( ( f, i ) => {
		f.setAttribute( mark, `flow-${ i }` );
		return { i, flowId: f.dataset.flowId || '', label: f.getAttribute( 'aria-label' ) || '', broken: f.classList.contains( 'sgs-choice-flow--broken-reference' ), steps: f.querySelectorAll( '.sgs-form-step' ).length };
	} );
	const forms = [ ...document.querySelectorAll( '.sgs-form' ) ].filter( ( w ) => w.querySelector( 'form.sgs-form__inner' ) ).map( ( w, i ) => {
		w.setAttribute( mark, `form-${ i }` );
		const c = ctx( w.querySelector( 'form.sgs-form__inner' ) );
		return { i, formId: c.formId || '', successMessage: c.successMessage || '', successRedirect: c.successRedirect || '', fields: w.querySelectorAll( 'input:not([type=hidden]),select,textarea' ).length };
	} );
	return { modals, flows, forms };
}

// One modal on the loaded page (marked by readPartsInPage): opens from its trigger, closes by its close button or
// Escape. A modal with no visible trigger fails unless it opens on a hash load (then it is n-a: nothing on the page
// opens it on purpose).
export async function modalItem( page, m, { url, shoot } ) {
	const subject = `modal "${ m.label || m.id }"`;
	const selector = `dialog#${ m.id }`;
	if ( ! m.visibleTrigger ) {
		return m.openOnHash ?
			{ status: 'n-a', subject, url, selector, detail: `no visible trigger; it opens when the address ends #${ m.anchor }` } :
			{ status: 'fail', subject, url, selector, error: `no visible trigger opens it (${ m.triggers } trigger(s) in the page, none shown)` };
	}
	const open = await openDisclosure( page, `mtrig-${ m.i }`, `modal-${ m.i }` );
	if ( ! open.opened ) {
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `modal-${ m.i }-not-open` ), error: open.navigated ? `its trigger navigated to ${ open.navigated }` : `the dialog never opened (tried ${ open.tried.join( ', ' ) })` };
	}
	const screenshot = await shoot( `modal-${ m.i }-open` );
	const close = await closeDisclosure( page, `mtrig-${ m.i }`, `modal-${ m.i }`, '.sgs-modal__close' );
	return close.closed ? { status: 'pass', subject, url, selector, screenshot, detail: `opened by ${ open.how }, closed by ${ close.how }` } : { status: 'fail', subject, url, selector, screenshot, error: 'it opened but neither its close button nor Escape closed it' };
}

// In-page: the index of the shown step of a marked flow, the step count, and whether its Back and Continue show.
export function flowStateInPage( [ mark, id, shownSrc ] ) {
	// The source is lib/site-check-nav.mjs::shownInPage, never page or site text.
	const shown = new Function( `return (${ shownSrc })` )();
	const root = document.querySelector( `[${ mark }="${ id }"]` );
	const steps = root ? [ ...root.querySelectorAll( '.sgs-form-step' ) ] : [];
	const back = root?.querySelector( '.sgs-choice-flow__nav-back' );
	const cont = root?.querySelector( '.sgs-choice-flow__continue' );
	return { steps: steps.length, at: steps.findIndex( ( s ) => ! s.hidden ), back: !! back && ! back.hidden && shown( back ), cont: !! cont && ! cont.hidden && shown( cont ) };
}

// One choice flow on the loaded page: its first step shows; picking the first option (and Continue, when the flow
// shows it) moves to another step; Back returns to the first. Nothing is added to the basket.
export async function flowItem( page, f, { url, shoot } ) {
	const subject = `choice flow "${ f.label || f.flowId }"`;
	const selector = `${ FLOW_ROOT }[data-flow-id="${ f.flowId }"]`;
	const id = `flow-${ f.i }`;
	const state = () => page.evaluate( flowStateInPage, [ MARK, id, shownInPage.toString() ] );
	if ( f.broken ) {
		return { status: 'fail', subject, url, selector, error: 'it renders its broken-link notice (the linked flow is missing or unpublished)' };
	}
	const s0 = await state();
	if ( ! s0.steps || s0.at < 0 ) {
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `${ id }-no-step` ), error: `no step shows (${ s0.steps } step(s) in the markup)` };
	}
	const option = page.locator( `[${ MARK }="${ id }"] .sgs-form-step:not([hidden]) .sgs-choice-flow-question__option-button:visible` ).first();
	if ( ! await option.count() ) {
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `${ id }-no-option` ), error: `step ${ s0.at + 1 } shows no option button` };
	}
	await option.click();
	await page.waitForTimeout( SETTLE_MS );
	if ( ( await state() ).cont ) {
		await page.locator( `[${ MARK }="${ id }"] .sgs-choice-flow__continue` ).first().click();
		await page.waitForTimeout( SETTLE_MS );
	}
	const s1 = await state();
	if ( s1.at === s0.at ) {
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `${ id }-no-advance` ), error: `picking the first option${ s0.cont || s1.cont ? ' and Continue' : '' } stayed on step ${ s0.at + 1 } of ${ s0.steps }` };
	}
	const screenshot = await shoot( `${ id }-advanced` );
	if ( ! s1.back ) {
		return { status: 'fail', subject, url, selector, screenshot, error: `moved to step ${ s1.at + 1 } but no Back control shows` };
	}
	await page.locator( `[${ MARK }="${ id }"] .sgs-choice-flow__nav-back` ).first().click();
	await page.waitForTimeout( SETTLE_MS );
	const s2 = await state();
	return s2.at === s0.at ?
		{ status: 'pass', subject, url, selector, screenshot, detail: `step ${ s0.at + 1 } -> ${ s1.at + 1 } of ${ s0.steps }, Back returned to step ${ s0.at + 1 }` } :
		{ status: 'fail', subject, url, selector, screenshot, error: `Back went to step ${ s2.at + 1 }, not step ${ s0.at + 1 }` };
}

// The success text a submitted form shows: its visible success message, '' at once when none shows (innerText alone
// would wait for one).
const successTextOf = async ( page, scope ) => {
	const shown = page.locator( `${ scope } .sgs-form__message--success:visible` );
	return await shown.count() ? shown.first().innerText( { timeout: 2000 } ).catch( () => '' ) : '';
};

// One form, submitted once with a marked test entry on the page that renders it: the success verdict is
// lib/form-submit-run.mjs::successVerdict on the form's own successMessage / successRedirect (read from its rendered
// context). `rowsSince` (optional) counts the stored submissions for the form since the run began: it returns
// { count } or { error } (the site's wp-cli unreachable), and a reachable count other than 1 fails.
export async function formItem( page, form, { url, shoot, marker, rowsSince = null } ) {
	const subject = `form "${ form.formId || `#${ form.i }` }"`;
	const scope = `[${ MARK }="form-${ form.i }"]`;
	const selector = `.sgs-form form.sgs-form__inner (formId ${ form.formId })`;
	const posts = [];
	const onResponse = ( r ) => 'POST' === r.request().method() && r.url().includes( '/wp-json/' ) && posts.push( `${ r.status() } ${ new URL( r.url() ).pathname }` );
	page.on( 'response', onResponse );
	try {
		await submitForm( page, 0, { marker, form: `${ scope } form.sgs-form__inner` } );
	} catch ( e ) {
		page.off( 'response', onResponse );
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `form-${ form.i }-not-submitted` ), error: `could not submit: ${ e.message }` };
	}
	const startUrl = url;
	let successText = '';
	for ( let waited = 0; waited < 10000; waited += 500 ) {
		await page.waitForTimeout( 500 );
		successText = page.url() !== startUrl ? '' : await successTextOf( page, scope );
		if ( successText || page.url() !== startUrl ) {
			break;
		}
	}
	page.off( 'response', onResponse );
	const v = successVerdict( { settings: form, finalUrl: page.url(), successText } );
	const screenshot = await shoot( `form-${ form.i }-${ v.ok ? 'success' : 'no-success' }` );
	const stored = rowsSince ? await rowsSince( form.formId ) : null;
	const storedText = ! stored ? 'stored row not read (no wp-cli for this site)' : stored.error ? `stored row not read: ${ stored.error }` : `${ stored.count } stored submission(s) since the run began`;
	const detail = `${ v.why }; requests: ${ posts.join( ', ' ) || 'none' }; ${ storedText }; test entry marked "${ marker }"`;
	if ( ! v.ok ) {
		const shownError = await page.locator( `${ scope } .sgs-form__message--error:visible, ${ scope } .sgs-form-field__error:visible` ).allInnerTexts().catch( () => [] );
		return { status: 'fail', subject, url, selector, screenshot, error: `${ v.why }${ shownError.length ? `; the form shows: ${ shownError.join( ' | ' ).trim() }` : '' }`, detail };
	}
	if ( stored && ! stored.error && 1 !== stored.count ) {
		return { status: 'fail', subject, url, selector, screenshot, error: `the success state showed but ${ stored.count } submissions were stored`, detail };
	}
	return { status: 'pass', subject, url, selector, screenshot, detail };
}

// What each WooCommerce page must show: its working block or classic form, visible.
export const WOO_PAGES = {
	cart: { found: '.wp-block-woocommerce-cart, form.woocommerce-cart-form, .wc-block-cart', what: 'the Cart block or a cart form', empty: '.wp-block-woocommerce-empty-cart-block, .cart-empty' },
	checkout: { found: '.wp-block-woocommerce-checkout, form.woocommerce-checkout, form.checkout', what: 'the Checkout block or a checkout form' },
	account: { found: 'form:has(input[type="password"]), .woocommerce-MyAccount-navigation, .sgs-account', what: 'a sign-in form (or the account area)' },
};

// In-page: whether any element matching `sel` shows, and the main content's first words when none does.
export function wooStateInPage( [ sel, shownSrc ] ) {
	// The source is lib/site-check-nav.mjs::shownInPage, never page or site text.
	const shown = new Function( `return (${ shownSrc })` )();
	const hit = [ ...document.querySelectorAll( sel ) ].find( shown );
	return { shown: !! hit, which: hit ? `${ hit.tagName.toLowerCase() }.${ [ ...hit.classList ].slice( 0, 2 ).join( '.' ) }` : null, text: hit ? '' : ( document.querySelector( 'main' )?.innerText || document.body.innerText ).replace( /\s+/g, ' ' ).trim().slice( 0, 160 ) };
}

// One WooCommerce page, already loaded: `role` is cart, checkout or account. A checkout WooCommerce sent to the basket
// (an empty basket) is n-a unless the run put a line in the basket.
export async function wooItem( page, role, { url, cartUrl, withCart, shoot } ) {
	const want = WOO_PAGES[ role ];
	const subject = `${ role } page`;
	const landed = page.url();
	if ( 'checkout' === role && cartUrl && landed.replace( /\/+$/, '' ) === cartUrl.replace( /\/+$/, '' ) ) {
		return withCart ?
			{ status: 'fail', subject, url, screenshot: await shoot( 'woo-checkout' ), error: `sent to the basket (${ landed }) although the run added a line to it` } :
			{ status: 'n-a', subject, url, detail: `WooCommerce sends checkout to the basket while it is empty (${ landed }); --with-cart adds one line so the checkout form can be checked` };
	}
	await page.waitForSelector( want.found, { state: 'visible', timeout: 8000 } ).catch( () => {} );
	const s = await page.evaluate( wooStateInPage, [ want.found, shownInPage.toString() ] );
	const screenshot = await shoot( `woo-${ role }` );
	if ( ! s.shown ) {
		return { status: 'fail', subject, url, selector: want.found, screenshot, error: `does not show ${ want.what }; the page reads: "${ s.text }"` };
	}
	const empty = want.empty ? ( await page.evaluate( wooStateInPage, [ want.empty, shownInPage.toString() ] ) ).shown : false;
	return { status: 'pass', subject, url, selector: want.found, screenshot, detail: `${ s.which } shows${ empty ? ' (the empty-basket state)' : '' }${ landed !== url ? `; landed on ${ landed }` : '' }` };
}

// Puts one line in the browser context's basket through the Store API (a WooCommerce session for this context only):
// the first in-stock simple product. Returns { ok, detail }.
export async function addOneLine( page, base ) {
	const products = await page.request.get( `${ base }/wp-json/wc/store/v1/products?type=simple&stock_status=instock&per_page=1` );
	const first = products.ok() ? ( await products.json() )[ 0 ] : null;
	if ( ! first ) {
		return { ok: false, detail: `no in-stock simple product (Store API ${ products.status() })` };
	}
	const cart = await page.request.get( `${ base }/wp-json/wc/store/v1/cart` );
	const nonce = cart.headers().nonce;
	const add = await page.request.post( `${ base }/wp-json/wc/store/v1/cart/add-item`, { headers: { 'Content-Type': 'application/json', ...( nonce ? { Nonce: nonce } : {} ) }, data: { id: first.id, quantity: 1 } } );
	return add.ok() ? { ok: true, detail: `added "${ first.name }" (#${ first.id })` } : { ok: false, detail: `add-item answered ${ add.status() }` };
}
