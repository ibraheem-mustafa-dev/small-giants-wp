/**
 * SGS Cart — frontend interactivity (viewScriptModule / ES module).
 *
 * Data flow:
 *   1. render.php SSRs count = 0 and (in flyout/drawer mode) a loading-only
 *      panel skeleton (cache-safe).
 *   2. On DOMContentLoaded this module fetches the live cart from the
 *      WooCommerce Store API (`store-api.js`) and hydrates the badge on
 *      every `.sgs-cart` instance on the page.
 *   3. `flyout` mode wires a local disclosure toggle (`flyout.js` — FR-36-10
 *      DISCLOSURE: no trap, page stays usable). `drawer` mode imports the
 *      SHARED `store('sgs/nav')` (registers the same dialog/DIALOG plumbing
 *      already proven by `sgs/nav-menu` + `sgs/nav-drawer` — R-31-9, no
 *      second open/close/focus utility).
 *   4. Either way, opening the panel triggers `panel-render.js` to fetch +
 *      render the live item list/qty/remove/subtotal — never a redirect.
 *   5. On every `wc-blocks_added_to_cart` / `added_to_cart` /
 *      `wc-blocks_removed_from_cart` document event (fired elsewhere on the
 *      page, e.g. by `sgs/product-card`'s Store API add-to-cart), every
 *      badge refreshes and — flyout mode only, `autoOpenOnAdd` — the panel
 *      opens (dismissible via its existing close affordances).
 *
 * Drawer mode is deliberately EXCLUDED from auto-open-on-add: `showModal()`
 * moves focus into the dialog and inerts the rest of the page — forcing that
 * open the instant an item is added elsewhere on the page would be an
 * unexpected, disruptive context change (WCAG 3.2.1/3.2.2) if the visitor is
 * mid-flow somewhere else (e.g. another form). The flyout is a non-modal
 * disclosure — appearing near the trigger without moving focus or blocking
 * the page — so it can auto-open safely. The badge still updates live in
 * drawer mode either way.
 *
 * WC iAPI store namespace (OPEN Q1 resolution, carried from Phase 1):
 *   Grepping WooCommerce 10.x src/StoreApi/Routes/V1/ and the compiled
 *   wc-cart-interactivity view bundle shows the store is registered as
 *   "woocommerce/cart" via the @woocommerce/interactivity package.
 *   HOWEVER that store's shape is an internal implementation detail
 *   (no stable public docs as of WC 10.4) and subscribing to it directly
 *   would couple us to WC minor-version churn.
 *   DECISION: use the Store API fetch as the canonical source of truth.
 *
 * @package
 */

import '../../shared/nav-interactivity/store';
import { fetchCart } from './store-api';
import { initPanel } from './panel-render';
import { initFlyout } from './flyout';

/**
 * Update every sgs/cart widget on the page with the given cart's live count.
 *
 * @param {Object} cart The Store API cart response (or null/undefined on error).
 */
function updateCartWidgets( cart ) {
	const count = Number( cart?.items_count );
	if ( ! Number.isFinite( count ) || count < 0 ) {
		return;
	}

	document.querySelectorAll( '.sgs-cart' ).forEach( ( widget ) => {
		const showZero = widget.dataset.showZero === 'true';
		const hideWhenEmpty = widget.dataset.hideWhenEmpty === '1';
		const trigger = widget.querySelector( '[data-sgs-cart-trigger]' );
		const badge = widget.querySelector( '[data-sgs-cart-count]' );

		if ( ! trigger || ! badge ) {
			return;
		}

		badge.textContent = String( count );

		const shouldShow = count > 0 || showZero;
		badge.classList.toggle( 'sgs-cart__badge--visible', shouldShow );
		widget.classList.toggle( 'sgs-cart--has-items', count > 0 );

		if ( hideWhenEmpty ) {
			widget.classList.toggle( 'sgs-cart--hidden-empty', count === 0 );
		}

		const baseLabel =
			trigger
				.getAttribute( 'aria-label' )
				?.replace( /\s*\(.*?\)\s*$/, '' ) || 'View your cart';
		const itemText =
			count === 1 ? '1 item in cart' : `${ count } items in cart`;
		trigger.setAttribute( 'aria-label', `${ baseLabel } (${ itemText })` );
	} );
}

/**
 * Wire one `.sgs-cart` widget's panel (flyout or drawer) if it has one.
 *
 * @param {HTMLElement} widget The `.wp-block-sgs-cart` root.
 * @return {{ mode: string, open?: Function, refresh?: Function }|null}
 *         A small handle used by the auto-open-on-add listener, or null when
 *         this widget has no panel (`link` mode).
 */
function initWidgetPanel( widget ) {
	const mode = widget.dataset.displayMode || 'link';
	if ( 'link' === mode ) {
		return null;
	}

	const panelRoot = widget.querySelector(
		`[data-sgs-cart-panel][data-sgs-cart-mode="${ mode }"]`
	);
	if ( ! panelRoot ) {
		return null;
	}

	const autoOpenOnAdd = widget.dataset.autoOpenOnAdd === '1';

	if ( 'flyout' === mode ) {
		const flyout = initFlyout( widget );
		if ( ! flyout ) {
			return null;
		}
		const panel = initPanel( panelRoot, {
			onCartUpdated: updateCartWidgets,
		} );
		flyout.setOnOpen( panel.refresh );
		return {
			mode,
			open: flyout.open,
			refresh: panel.refresh,
			autoOpenOnAdd,
		};
	}

	const panel = initPanel( panelRoot, { onCartUpdated: updateCartWidgets } );

	// drawer — the shared store owns open/close (imported above for its side
	// effect). Refresh the panel content on every trigger click; a fresh
	// fetch on a close-click is a harmless no-op extra request, and this
	// avoids depending on internal store state that isn't part of its public
	// contract (state.isOpen/actions.* only).
	const trigger = widget.querySelector( '[data-sgs-cart-trigger]' );
	if ( trigger ) {
		trigger.addEventListener( 'click', panel.refresh );
	}
	// Drawer mode intentionally has no `open` handle here — see the module
	// doc-block for why auto-open-on-add is flyout-only.
	return { mode, refresh: panel.refresh, autoOpenOnAdd: false };
}

/**
 * Fetch the cart once and push it to every badge + open panel on the page.
 *
 * @param {Array<{mode:string,open?:Function,refresh?:Function,autoOpenOnAdd:boolean}>} panels
 *                                                                                                           The per-widget panel handles from `initWidgetPanel`.
 * @param {Object}                                                                      [opts]               Options.
 * @param {boolean}                                                                     [opts.allowAutoOpen] Whether this refresh may trigger
 *                                                                                                           auto-open-on-add (false on initial load).
 */
async function refreshAll( panels, { allowAutoOpen = false } = {} ) {
	let cart;
	try {
		cart = await fetchCart();
	} catch {
		return;
	}
	updateCartWidgets( cart );

	if ( ! allowAutoOpen ) {
		return;
	}
	panels.forEach( ( panel ) => {
		if ( panel.autoOpenOnAdd && 'function' === typeof panel.open ) {
			panel.open();
		} else if (
			panel.autoOpenOnAdd &&
			'function' === typeof panel.refresh
		) {
			panel.refresh();
		}
	} );
}

/**
 * Initialise every sgs/cart instance on the page.
 */
function init() {
	const widgets = document.querySelectorAll( '.sgs-cart' );
	if ( 0 === widgets.length ) {
		return;
	}

	const panels = Array.from( widgets )
		.map( initWidgetPanel )
		.filter( Boolean );

	// Initial hydration — replaces SSR "0" with the real count. Never
	// auto-opens on first load (only on a genuine add-to-cart event).
	refreshAll( panels, { allowAutoOpen: false } );

	const onCartChanged = () => refreshAll( panels, { allowAutoOpen: true } );
	document.addEventListener( 'wc-blocks_added_to_cart', onCartChanged );
	// Tolerate legacy jQuery `added_to_cart` if a 3rd-party plugin re-emits
	// it as a native DOM CustomEvent.
	document.addEventListener( 'added_to_cart', onCartChanged );
	document.addEventListener( 'wc-blocks_removed_from_cart', () =>
		refreshAll( panels, { allowAutoOpen: false } )
	);
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
