/**
 * SGS Cart — frontend interactivity (viewScriptModule / ES module).
 *
 * Data flow:
 *   1. render.php SSRs count = 0 and (in flyout/drawer mode) a loading-only
 *      panel skeleton (cache-safe).
 *   2. On DOMContentLoaded this module takes the live cart from the page-wide
 *      cart reader (`shared/cart-live`, which asks the WooCommerce Store API)
 *      and hydrates the badge on every `.sgs-cart` instance on the page.
 *   3. `flyout` mode wires a local disclosure toggle (`flyout.js` — FR-36-10
 *      DISCLOSURE: no trap, page stays usable). `drawer` mode imports the
 *      SHARED `store('sgs/nav')` (registers the same dialog/DIALOG plumbing
 *      used by `sgs/nav-bar-menu` + `sgs/nav-drawer` — FP-9, no
 *      second open/close/focus utility).
 *   4. Either way, opening the panel triggers `panel-render.js` to fetch +
 *      render the live item list/qty/remove/subtotal, never a redirect. That
 *      code loads on the first pointer, key or focus on the widget
 *      (`lazyPanel()`), not at page load.
 *   5. On every `wc-blocks_added_to_cart` / `added_to_cart` /
 *      `wc-blocks_removed_from_cart` document event (fired elsewhere on the
 *      page, e.g. by `sgs/product-card`'s Store API add-to-cart), the cart
 *      reader refetches and every badge refreshes and — flyout mode only, `autoOpenOnAdd` — the panel
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
 * WC iAPI store namespace:
 *   Grepping WooCommerce 10.x src/StoreApi/Routes/V1/ and the compiled
 *   wc-cart-interactivity view bundle shows the store is registered as
 *   "woocommerce/cart" via the @woocommerce/interactivity package.
 *   HOWEVER that store's shape is an internal implementation detail
 *   (no stable public docs as of WC 10.4) and subscribing to it directly
 *   would couple us to WC minor-version churn.
 *   DECISION: the Store API is the canonical source of truth; the page-wide reader
 *   (`shared/cart-live`) reads the `wc/store/cart` data store only for the badge count
 *   where the page already holds it, never for the panel rows.
 *
 * @package
 */

import { pillTriggerLabel } from './trigger-label.js';
// eslint-disable-next-line import/no-unresolved -- a webpack external: the script module `@sgs/nav-store` (one copy per page).
import '@sgs/nav-store';
import { onCartChange } from '../../shared/cart-live';
import { initFlyout } from './flyout';
import { maybeAnimateCountPop } from './count-pop';

/**
 * The panel renderer (`panel-render.js`, with its item rows, free-delivery bar and extras), loaded the first time a
 * panel is about to be needed rather than at page load: the badge needs only the cart reader, and the panel is hidden
 * until opened. Loading starts on the first pointer or key press on the trigger, so it is usually ready before the
 * click that opens the panel lands; `refresh()` waits for it either way.
 *
 * @param {HTMLElement} panelRoot The `[data-sgs-cart-panel]` element.
 * @param {Object}      options   `initPanel` options.
 * @return {{ refresh: Function, warm: Function }} `refresh` renders the live cart once loaded; `warm` starts loading.
 */
function lazyPanel( panelRoot, options ) {
	let ready = null;
	const warm = () => {
		if ( ! ready ) {
			ready = import(
				/* webpackChunkName: "cart-panel" */ './panel-render'
			).then( ( module ) => module.initPanel( panelRoot, options ) );
		}
		return ready;
	};
	return { refresh: () => warm().then( ( panel ) => panel.refresh() ), warm };
}

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
		// True when any breakpoint shows the badge on an empty cart; the stylesheet hides it again at the breakpoints that do not.
		const showZero = widget.dataset.showZeroAny === 'true';
		const hideWhenEmpty = widget.dataset.hideWhenEmpty === '1';
		const countPopMode = widget.dataset.countPop || 'off';
		const trigger = widget.querySelector( '[data-sgs-cart-trigger]' );
		const badge = widget.querySelector( '[data-sgs-cart-count]' );

		if ( ! trigger || ! badge ) {
			return;
		}

		// "Count pop": see count-pop.js for the per-instance mode and
		// reduced-motion gating.
		maybeAnimateCountPop( badge, count, countPopMode );

		badge.textContent = String( count );

		const shouldShow = count > 0 || showZero;
		badge.classList.toggle( 'sgs-cart__badge--visible', shouldShow );
		widget.classList.toggle( 'sgs-cart--has-items', count > 0 );

		if ( hideWhenEmpty ) {
			widget.classList.toggle( 'sgs-cart--hidden-empty', count === 0 );
		}

		const pillLabel = pillTriggerLabel( widget.dataset, count );
		if ( null !== pillLabel ) {
			trigger.setAttribute( 'aria-label', pillLabel );
			return;
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
 * Start loading a widget's panel code on the first sign the visitor is heading for its trigger (pointer over or down,
 * a key press or focus inside the widget), so the first open seldom waits.
 *
 * @param {HTMLElement} widget The `.wp-block-sgs-cart` root.
 * @param {Function}    warm   Starts the load; safe to call more than once.
 */
function warmOnIntent( widget, warm ) {
	[ 'pointerenter', 'pointerdown', 'focusin', 'keydown' ].forEach( ( type ) =>
		widget.addEventListener( type, warm, { once: true, passive: true } )
	);
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

	// Wave B, U-2 — free-delivery progress data, read from the block wrapper
	// (render.php only ever emits these when the block has a panel — see
	// `$has_panel` there). Threaded through to `panel-render.js`, which builds
	// and updates the progress bar client-side (the panel BODY markup lives in
	// the shared includes/helpers-cart-panel.php, outside this build's scope).
	const freeDelivery = {
		threshold: widget.dataset.freeDeliveryThreshold || '',
		message: widget.dataset.freeDeliveryMessage || '',
		successMessage: widget.dataset.freeDeliverySuccessMessage || '',
		placement: widget.dataset.freeDeliveryPlacement || 'above-items',
		hideWhenEmpty: widget.dataset.freeDeliveryHideEmpty === '1',
	};

	if ( 'flyout' === mode ) {
		const flyout = initFlyout( widget );
		if ( ! flyout ) {
			return null;
		}
		const panel = lazyPanel( panelRoot, { freeDelivery } );
		warmOnIntent( widget, panel.warm );
		flyout.setOnOpen( panel.refresh );
		return {
			mode,
			open: flyout.open,
			refresh: panel.refresh,
			autoOpenOnAdd,
		};
	}

	const panel = lazyPanel( panelRoot, { freeDelivery } );
	warmOnIntent( widget, panel.warm );

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
 * Initialise every sgs/cart instance on the page.
 *
 * The page-wide cart reader (`shared/cart-live`) owns the reading: one load request, one refetch per WooCommerce
 * add/remove event, and whatever the drawer publishes after its own read or mutation. Every change reaches the
 * badges; an add event also opens (or refreshes) the panels that opted in, once the new reading arrives.
 */
function init() {
	const widgets = document.querySelectorAll( '.sgs-cart' );
	if ( 0 === widgets.length ) {
		return;
	}

	const panels = Array.from( widgets )
		.map( initWidgetPanel )
		.filter( Boolean );

	// An add event arms the auto-open; the next reading consumes it. Initial load never auto-opens.
	let openOnNextReading = false;
	const onAdded = () => {
		openOnNextReading = true;
	};
	// Tolerate jQuery `added_to_cart` if a 3rd-party plugin re-emits
	// it as a native DOM CustomEvent.
	document.addEventListener( 'wc-blocks_added_to_cart', onAdded );
	document.addEventListener( 'added_to_cart', onAdded );

	onCartChange( ( cart ) => {
		updateCartWidgets( cart );
		if ( ! openOnNextReading ) {
			return;
		}
		openOnNextReading = false;
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
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
