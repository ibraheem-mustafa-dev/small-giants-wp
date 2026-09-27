/**
 * SGS Shop Filter Drawer — per-group looks, switched on by classes on a group's
 * heading block (its Additional CSS class):
 *   sgs-filter-count     the number of options beside the heading ("Brand 40")
 *   sgs-filter-segmented  one choice at a time as a segmented row, "All" first
 *                 (an attribute group: a segment presses WooCommerce's own chips,
 *                 so the choice applies in place like every other filter)
 * Swatches (sgs-filter-swatches) are CSS only (woocommerce.css, inc/shop-toolbar-settings.php).
 *
 * Runs once sgs-shop-filters.js has turned the aside into its dialog and the
 * headings into <details> groups, and again on `sgs-shop-filters:rebuilt` (a
 * filter choice re-renders WooCommerce's region and the groups are rebuilt);
 * a site with none of the classes is unchanged.
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const SETTINGS = window.sgsShopFilters || {};
	const ITEM = '.wc-block-product-filter-chips__item, .wc-block-product-filter-checkbox-list__item';

	function groupOf( heading ) {
		return heading.closest( '.sgs-shop-filters__group' );
	}

	function addCount( heading ) {
		const group = groupOf( heading );
		const summary = group && group.querySelector( '.sgs-shop-filters__group-summary' );
		if ( ! summary || summary.querySelector( '.sgs-shop-filters__group-count' ) ) {
			return;
		}
		const count = document.createElement( 'span' );
		count.className = 'sgs-shop-filters__group-count';
		count.textContent = String( group.querySelectorAll( ITEM ).length );
		summary.appendChild( count );
	}

	function makeSegmented( heading ) {
		const group = groupOf( heading );
		const chips = group ? Array.from( group.querySelectorAll( '.wc-block-product-filter-chips__item' ) ) : [];
		const match = chips.length ? ( chips[ 0 ].id || '' ).match( /^attribute\/(.+?)-/ ) : null;
		if ( ! match || group.querySelector( '.sgs-shop-filters__segmented' ) ) {
			return;
		}
		const param = 'filter_' + match[ 1 ];
		const current = ( new URLSearchParams( window.location.search ).get( param ) || '' ).split( ',' )[ 0 ];
		const row = document.createElement( 'div' );
		row.className = 'sgs-shop-filters__segmented';
		row.setAttribute( 'role', 'group' );
		row.setAttribute( 'aria-label', heading.textContent.trim() );
		const options = [ { value: '', label: SETTINGS.segmentedAllLabel || 'All' } ].concat(
			chips.map( function ( chip ) {
				return { value: chip.value, label: chip.getAttribute( 'aria-label' ) || chip.textContent.trim() };
			} )
		);
		options.forEach( function ( opt ) {
			const button = document.createElement( 'button' );
			button.type = 'button';
			button.className = 'sgs-shop-filters__segment';
			button.textContent = opt.label;
			button.setAttribute( 'aria-pressed', opt.value === current ? 'true' : 'false' );
			button.addEventListener( 'click', function () {
				// Uncheck the chosen chip, then check the new one: WooCommerce applies
				// both through its router, so the page and the drawer stay put.
				const checked = chips.filter( function ( c ) {
					return 'true' === c.getAttribute( 'aria-checked' ) && c.value !== opt.value;
				} );
				const target = chips.find( function ( c ) {
					return opt.value && c.value === opt.value && 'true' !== c.getAttribute( 'aria-checked' );
				} );
				if ( chips.every( function ( c ) {
					return c.isConnected;
				} ) ) {
					checked.concat( target ? [ target ] : [] ).forEach( function ( c ) {
						c.click();
					} );
					return;
				}
				const url = new URL( window.location.href );
				if ( opt.value ) {
					url.searchParams.set( param, opt.value );
				} else {
					url.searchParams.delete( param );
				}
				url.searchParams.delete( 'paged' );
				window.location.assign( url.toString() );
			} );
			row.appendChild( button );
		} );
		group.classList.add( 'sgs-shop-filters__group--segmented' );
		group.querySelector( '.sgs-shop-filters__group-summary' ).insertAdjacentElement( 'afterend', row );
	}

	function run( dialog ) {
		dialog.querySelectorAll( '.sgs-shop-filters__group-heading' ).forEach( function ( heading ) {
			if ( heading.classList.contains( 'sgs-filter-count' ) ) {
				addCount( heading );
			}
			if ( heading.classList.contains( 'sgs-filter-segmented' ) ) {
				makeSegmented( heading );
			}
		} );
	}

	function ready() {
		const el = document.getElementById( 'sgs-shop-filters' );
		return el && 'DIALOG' === el.tagName ? el : null;
	}

	function init() {
		const dialog = ready();
		if ( dialog ) {
			run( dialog );
			dialog.addEventListener( 'sgs-shop-filters:rebuilt', function () {
				run( dialog );
			} );
			return;
		}
		const observer = new MutationObserver( function () {
			const found = ready();
			if ( found ) {
				observer.disconnect();
				run( found );
				found.addEventListener( 'sgs-shop-filters:rebuilt', function () {
					run( found );
				} );
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
