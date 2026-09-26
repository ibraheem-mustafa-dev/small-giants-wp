/**
 * SGS Shop Filter Drawer — per-group looks, switched on by classes on a group's
 * heading block (its Additional CSS class):
 *   has-count     the number of options beside the heading ("Brand 40")
 *   has-search    a search box above the options that narrows the list as you type
 *                 (placeholder: Customizer > Shop Filters, `searchLabel`)
 *   is-segmented  one choice at a time as a segmented row, "All" first
 *                 (an attribute group: it sets `filter_<attribute>` and reloads,
 *                 the same round trip WooCommerce's own filters take)
 * Swatches (has-swatches) are CSS only (woocommerce.css, inc/shop-toolbar-settings.php).
 *
 * Runs once sgs-shop-filters.js has turned the aside into its dialog and the
 * headings into <details> groups; a site with none of the classes is unchanged.
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

	function addSearch( heading ) {
		const group = groupOf( heading );
		const summary = group && group.querySelector( '.sgs-shop-filters__group-summary' );
		if ( ! summary || group.querySelector( '.sgs-shop-filters__group-search' ) ) {
			return;
		}
		const input = document.createElement( 'input' );
		input.type = 'search';
		input.className = 'sgs-shop-filters__group-search';
		input.placeholder = SETTINGS.searchLabel || 'Search';
		input.setAttribute( 'aria-label', SETTINGS.searchLabel || heading.textContent.trim() );
		input.addEventListener( 'input', function () {
			const q = input.value.trim().toLowerCase();
			group.querySelectorAll( ITEM ).forEach( function ( item ) {
				const text = ( item.textContent || item.getAttribute( 'aria-label' ) || '' ).toLowerCase();
				item.classList.toggle( 'is-search-hidden', '' !== q && -1 === text.indexOf( q ) );
			} );
		} );
		summary.insertAdjacentElement( 'afterend', input );
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
			if ( heading.classList.contains( 'has-count' ) ) {
				addCount( heading );
			}
			if ( heading.classList.contains( 'has-search' ) ) {
				addSearch( heading );
			}
			if ( heading.classList.contains( 'is-segmented' ) ) {
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
			return;
		}
		const observer = new MutationObserver( function () {
			const found = ready();
			if ( found ) {
				observer.disconnect();
				run( found );
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
