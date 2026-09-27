/**
 * SGS Shop Filter Drawer — filter groups as <details> accordions, kept through
 * WooCommerce's re-renders.
 *
 * build( root ): wraps each `.sgs-shop-filters__group-heading` and the blocks
 * that follow it (up to the next heading) in <details class="sgs-shop-filters__group">,
 * the heading moved inside the <summary> so it keeps its styling and stays a real
 * heading in the outline. A heading with the class `sgs-filter-open` (the block's
 * Additional CSS class) starts its group expanded; with none marked, the first
 * group is open and the rest start collapsed (a collapsed panel is short enough
 * for the sticky sidebar to travel).
 *
 * watch( dialog ): the product-filters block is an Interactivity router region.
 * Choosing a filter navigates on the client and re-renders that region from the
 * server's HTML, which drops every group, count and segmented row built here.
 * The watcher rebuilds the groups when headings reappear outside a group,
 * restores each group's open state as the shopper left it, and fires
 * `sgs-shop-filters:rebuilt` on the dialog so the per-group looks
 * (sgs-shop-filters-groups.js) run again.
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const HEADING = '.sgs-shop-filters__group-heading';
	const GROUP = 'sgs-shop-filters__group';

	// A heading block's generated class (sgs-hdg-xxxxxxxx) is stable across renders.
	function keyOf( heading ) {
		const own = Array.from( heading.classList ).find( function ( c ) {
			return /^sgs-hdg-/.test( c );
		} );
		return own || heading.textContent.trim();
	}

	function build( root, openState ) {
		const headings = Array.from( root.querySelectorAll( HEADING ) ).filter( function ( h ) {
			return ! h.closest( '.' + GROUP );
		} );
		const anyMarked = headings.some( function ( h ) {
			return h.classList.contains( 'sgs-filter-open' );
		} );

		headings.forEach( function ( heading, index ) {
			const contents = [];
			let node = heading.nextElementSibling;
			while ( node && ! node.matches( HEADING ) ) {
				contents.push( node );
				node = node.nextElementSibling;
			}
			// A lone heading with no controls would become an empty expander.
			if ( ! contents.length ) {
				return;
			}
			const details = document.createElement( 'details' );
			details.className = GROUP;
			const key = keyOf( heading );
			const byDefault = anyMarked ? heading.classList.contains( 'sgs-filter-open' ) : 0 === index;
			details.open = openState && key in openState ? openState[ key ] : byDefault;

			const summary = document.createElement( 'summary' );
			summary.className = 'sgs-shop-filters__group-summary';
			heading.parentNode.insertBefore( details, heading );
			summary.appendChild( heading );
			details.appendChild( summary );
			contents.forEach( function ( el ) {
				details.appendChild( el );
			} );
		} );
		return headings.length;
	}

	function watch( dialog ) {
		const openState = {};
		dialog.addEventListener( 'toggle', function ( event ) {
			const group = event.target;
			const heading = group.classList && group.classList.contains( GROUP ) ? group.querySelector( HEADING ) : null;
			if ( heading ) {
				openState[ keyOf( heading ) ] = group.open;
			}
		}, true );

		let queued = false;
		const observer = new MutationObserver( function () {
			if ( queued ) {
				return;
			}
			queued = true;
			window.requestAnimationFrame( function () {
				queued = false;
				const loose = Array.from( dialog.querySelectorAll( HEADING ) ).some( function ( h ) {
					return ! h.closest( '.' + GROUP );
				} );
				if ( ! loose ) {
					return;
				}
				observer.disconnect();
				build( dialog, openState );
				dialog.dispatchEvent( new CustomEvent( 'sgs-shop-filters:rebuilt' ) );
				observer.observe( dialog, { childList: true, subtree: true } );
			} );
		} );
		observer.observe( dialog, { childList: true, subtree: true } );
	}

	window.sgsShopFiltersAccordion = { build: build, watch: watch };
} )();
