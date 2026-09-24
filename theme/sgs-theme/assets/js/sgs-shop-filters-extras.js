/**
 * SGS Shop Filter Drawer — extras (boolean attribute toggle + live result count)
 *
 * Kept in its own file rather than grown into sgs-shop-filters.js, which is
 * already over the theme's 250-line JS budget. Both features are entirely
 * config-driven (see inc/shop-filters-settings.php) so a site with nothing
 * configured renders unchanged — no client word or endpoint is hardcoded.
 *
 * Deliberately independent of sgs-shop-filters.js's own init() timing: rather
 * than relying on script load order, this file watches for the filter
 * `<dialog>` to appear via its own MutationObserver. That is what
 * sgs-shop-filters.js converts the template's `<aside id="sgs-shop-filters">`
 * into at runtime (see that file's header comment) — by the time our observer
 * callback runs, the whole synchronous conversion (dialog + accordion + sheet
 * footer + apply button) has already completed, so every element this file
 * needs is guaranteed present with no race.
 *
 * Spec: Spec 30 FR-30-3 (shares the drawer this extends).
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const SETTINGS = window.sgsShopFilters || {};

	/* ── 1. Boolean attribute toggle ("Polarised only", generically: any
	 * yes/no attribute term) ────────────────────────────────────────────────
	 *
	 * Uses the SAME URL query param WooCommerce's own attribute filter blocks
	 * use (`filter_<attribute-slug-without-pa_>=<term-slug>`), so toggling it
	 * is a normal, server-understood filter request the product-collection's
	 * `inherit` query already applies — no bespoke query logic, no cheat. */
	function buildBooleanFilterToggle( dialog, config ) {
		if ( ! config || ! config.attribute || ! config.term || ! config.label ) {
			return;
		}
		const scrollWrap = dialog.querySelector( '.sgs-shop-filters__scroll' );
		if ( ! scrollWrap ) {
			return;
		}

		const paramName = 'filter_' + config.attribute;
		const currentParams = new URLSearchParams( window.location.search );
		const currentValue = currentParams.get( paramName );
		const isChecked = currentValue ? currentValue.split( ',' ).indexOf( config.term ) !== -1 : false;

		const wrap = document.createElement( 'div' );
		wrap.className = 'sgs-shop-filters__bool-filter';

		const label = document.createElement( 'label' );
		label.className = 'sgs-shop-filters__bool-filter-label';

		const input = document.createElement( 'input' );
		input.type = 'checkbox';
		input.setAttribute( 'role', 'switch' );
		input.className = 'sgs-shop-filters__bool-filter-input';
		input.checked = isChecked;
		input.setAttribute( 'aria-checked', isChecked ? 'true' : 'false' );

		const track = document.createElement( 'span' );
		track.className = 'sgs-shop-filters__bool-filter-switch';
		track.setAttribute( 'aria-hidden', 'true' );

		const text = document.createElement( 'span' );
		text.className = 'sgs-shop-filters__bool-filter-text';
		text.textContent = config.label;

		input.addEventListener( 'change', function () {
			input.setAttribute( 'aria-checked', input.checked ? 'true' : 'false' );
			const url = new URL( window.location.href );
			if ( input.checked ) {
				url.searchParams.set( paramName, config.term );
			} else {
				url.searchParams.delete( paramName );
			}
			// Full navigation: the same round trip WC's own filter chips take,
			// so server-side filtering picks it up with no extra JS of ours.
			window.location.assign( url.toString() );
		} );

		label.appendChild( input );
		label.appendChild( track );
		label.appendChild( text );
		wrap.appendChild( label );
		scrollWrap.insertBefore( wrap, scrollWrap.firstChild );
	}

	/* ── 2. Live result count on the Apply button ("Show 12 results") ───────
	 *
	 * Config-supplied endpoint + label (`SETTINGS.resultCount`, only set when
	 * WooCommerce's Store API is available). Reads the same `filter_*` /
	 * `min_price` / `max_price` URL query params WC's own filter blocks keep
	 * the address bar in sync with, forwards them to the Store API products
	 * endpoint, and reads the `X-WP-Total` response header WooCommerce sends
	 * on every products list request — one source of truth, not a second
	 * count kept in step by hand. Debounced so a burst of chip changes (WC
	 * re-renders its filter subtree once per interaction) fires one request. */
	function setupResultCount( dialog ) {
		const config = SETTINGS.resultCount;
		const applyBtn = dialog.querySelector( '.sgs-shop-filters__apply' );
		if ( ! config || ! config.endpoint || ! applyBtn ) {
			return;
		}

		let debounceTimer = null;

		function request() {
			window.clearTimeout( debounceTimer );
			debounceTimer = window.setTimeout( function () {
				const url = new URL( config.endpoint );
				const currentParams = new URLSearchParams( window.location.search );
				currentParams.forEach( function ( value, key ) {
					if (
						0 === key.indexOf( 'filter_' ) ||
						0 === key.indexOf( 'query_type_' ) ||
						'min_price' === key ||
						'max_price' === key
					) {
						url.searchParams.set( key, value );
					}
				} );
				url.searchParams.set( 'per_page', '1' );

				fetch( url.toString(), { credentials: 'same-origin' } )
					.then( function ( response ) {
						const total = parseInt( response.headers.get( 'X-WP-Total' ), 10 );
						if ( ! isNaN( total ) ) {
							applyBtn.textContent = config.label.replace( '%d', String( total ) );
						}
					} )
					.catch( function () {
						// Network failure — the button keeps its last known label.
					} );
			}, 400 );
		}

		request();

		// WC's filter blocks re-render their own subtree on interaction —
		// watch for that rather than polling (own observer, not shared with
		// sgs-shop-filters.js's sticky-count observer, to keep this module
		// self-contained).
		new MutationObserver( request ).observe( dialog, { childList: true, subtree: true } );
	}

	/* ── 3. Wait for sgs-shop-filters.js to convert the aside into the dialog ── */

	function isDialogReady() {
		const el = document.getElementById( 'sgs-shop-filters' );
		return el && 'DIALOG' === el.tagName ? el : null;
	}

	function run( dialog ) {
		buildBooleanFilterToggle( dialog, SETTINGS.booleanFilter );
		setupResultCount( dialog );
	}

	function init() {
		const ready = isDialogReady();
		if ( ready ) {
			run( ready );
			return;
		}
		const observer = new MutationObserver( function () {
			const dialog = isDialogReady();
			if ( dialog ) {
				observer.disconnect();
				run( dialog );
			}
		} );
		observer.observe( document.body, { childList: true, subtree: true } );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
