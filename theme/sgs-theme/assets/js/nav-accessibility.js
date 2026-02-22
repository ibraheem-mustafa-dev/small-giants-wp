/**
 * Navigation Accessibility — M8
 *
 * WordPress block navigation renders multiple copies of the nav for
 * different viewports (desktop, mobile overlay). Screen readers and
 * keyboard users may encounter duplicate tab stops for every nav link.
 *
 * This script hides inactive navigation copies from assistive technology by
 * adding aria-hidden="true" and tabindex="-1" to elements that are visually
 * hidden (i.e. have display:none or visibility:hidden applied).
 *
 * Runs once on DOMContentLoaded, then re-checks on resize (debounced) in case
 * responsive styles change which nav is active.
 */
( function () {
	'use strict';

	/**
	 * Update aria-hidden / tabindex on navigation containers.
	 * A container is considered inactive if CSS hides it.
	 */
	function updateNavAccessibility() {
		// Target all WordPress navigation responsive containers.
		var containers = document.querySelectorAll(
			'.wp-block-navigation__responsive-container'
		);

		containers.forEach( function ( container ) {
			var style = window.getComputedStyle( container );
			var isHidden =
				style.display === 'none' || style.visibility === 'hidden';

			if ( isHidden ) {
				container.setAttribute( 'aria-hidden', 'true' );
				// Also suppress focusable children.
				container.querySelectorAll( 'a, button, [tabindex]' ).forEach(
					function ( el ) {
						el.setAttribute( 'tabindex', '-1' );
					}
				);
			} else {
				container.removeAttribute( 'aria-hidden' );
				container.querySelectorAll( '[tabindex="-1"]' ).forEach(
					function ( el ) {
						el.removeAttribute( 'tabindex' );
					}
				);
			}
		} );
	}

	// Run on load.
	document.addEventListener( 'DOMContentLoaded', updateNavAccessibility );

	// Re-run on resize with debounce to avoid excessive calls.
	var resizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( updateNavAccessibility, 150 );
	} );
} )();
