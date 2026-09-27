/**
 * SGS Shop Filter Drawer — chosen filters outside the drawer.
 *
 * WooCommerce keeps its chosen-filter chips inside the filter block, which below
 * the drawer breakpoint is a closed drawer, so a shopper cannot see what is
 * applied. Two settings (inc/shop-chosen-filters.php) bring them out:
 *   toggleCount          the Filter button reads "FILTER (1)" while filters are chosen;
 *   activePlace: "bar"   the chosen filters show as a row under the title at every
 *                        width (the panel's own copy is hidden by CSS). Each pill
 *                        presses WooCommerce's own remove button and "Clear all" its
 *                        clear button, so WooCommerce stays the one source of truth.
 * Both follow the chips as WooCommerce changes them (a choice, or a re-render
 * after one).
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const SETTINGS = window.sgsShopFilters || {};
	const CHIP = '.wc-block-product-filter-removable-chips__item';

	function chosen( dialog ) {
		return Array.from( dialog.querySelectorAll( CHIP ) ).filter( function ( li ) {
			const label = li.querySelector( '.wc-block-product-filter-removable-chips__label' );
			return label && label.textContent.trim();
		} );
	}

	function updateCount( count ) {
		const toggle = document.querySelector( '.sgs-shop-filters__toggle' );
		if ( ! toggle || ! SETTINGS.toggleCount ) {
			return;
		}
		let badge = toggle.querySelector( '.sgs-shop-filters__toggle-count' );
		if ( ! badge ) {
			badge = document.createElement( 'span' );
			badge.className = 'sgs-shop-filters__toggle-count';
			toggle.appendChild( badge );
		}
		badge.textContent = count ? ' (' + count + ')' : '';
	}

	function pill( li ) {
		const remove = li.querySelector( 'button' );
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'sgs-shop-chosen__pill';
		button.textContent = li.querySelector( '.wc-block-product-filter-removable-chips__label' ).textContent.trim();
		const cross = document.createElement( 'span' );
		cross.className = 'sgs-shop-chosen__cross';
		cross.setAttribute( 'aria-hidden', 'true' );
		cross.textContent = '×';
		button.appendChild( document.createTextNode( ' ' ) );
		button.appendChild( cross );
		if ( remove && remove.getAttribute( 'aria-label' ) ) {
			button.setAttribute( 'aria-label', remove.getAttribute( 'aria-label' ) );
		}
		button.addEventListener( 'click', function () {
			if ( remove ) {
				remove.click();
			}
		} );
		return button;
	}

	function updateBar( dialog, items ) {
		if ( 'bar' !== SETTINGS.activePlace ) {
			return;
		}
		let bar = document.querySelector( '.sgs-shop-chosen' );
		if ( ! bar ) {
			const layout = dialog.closest( '.sgs-shop-layout' ) || dialog;
			bar = document.createElement( 'div' );
			bar.className = 'sgs-shop-chosen';
			bar.setAttribute( 'role', 'group' );
			bar.setAttribute( 'aria-label', SETTINGS.chosenLabel || 'Chosen filters' );
			layout.parentNode.insertBefore( bar, layout );
		}
		bar.replaceChildren.apply( bar, items.map( pill ) );
		const clear = dialog.querySelector( '.wp-block-woocommerce-product-filter-clear-button .sgs-button, .wp-block-woocommerce-product-filter-clear-button button, .wp-block-woocommerce-product-filter-clear-button a' );
		if ( items.length && clear ) {
			const button = document.createElement( 'button' );
			button.type = 'button';
			button.className = 'sgs-shop-chosen__clear';
			button.textContent = SETTINGS.clearAll || 'Clear all';
			button.addEventListener( 'click', function () {
				clear.click();
			} );
			bar.appendChild( button );
		}
		bar.hidden = ! items.length;
	}

	function refresh( dialog ) {
		const items = chosen( dialog );
		updateCount( items.length );
		updateBar( dialog, items );
	}

	function watch( dialog ) {
		refresh( dialog );
		let queued = false;
		new MutationObserver( function () {
			if ( queued ) {
				return;
			}
			queued = true;
			window.requestAnimationFrame( function () {
				queued = false;
				refresh( dialog );
			} );
		} ).observe( dialog, { childList: true, subtree: true, characterData: true } );
	}

	function ready() {
		const el = document.getElementById( 'sgs-shop-filters' );
		return el && 'DIALOG' === el.tagName ? el : null;
	}

	function init() {
		const dialog = ready();
		if ( dialog ) {
			watch( dialog );
			return;
		}
		const observer = new MutationObserver( function () {
			const found = ready();
			if ( found ) {
				observer.disconnect();
				watch( found );
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
