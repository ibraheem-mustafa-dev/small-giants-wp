/**
 * Sticky Header
 *
 * Adds `.is-scrolled` class to site header when user scrolls past threshold.
 * Enables shrink/shadow effect via CSS.
 *
 * @package SGS_Theme
 */

( function () {
	'use strict';

	const header = document.querySelector( '.wp-block-template-part[class*="header"]' );
	const scrollThreshold = 100; // Pixels scrolled before class is added.
	let ticking = false;

	if ( ! header ) {
		return;
	}

	/**
	 * Update header class based on scroll position.
	 */
	function updateHeader() {
		const scrollTop = window.scrollY || document.documentElement.scrollTop;

		if ( scrollTop > scrollThreshold ) {
			header.classList.add( 'is-scrolled' );
		} else {
			header.classList.remove( 'is-scrolled' );
		}

		ticking = false;
	}

	/**
	 * Request animation frame for smooth performance.
	 */
	function onScroll() {
		if ( ! ticking ) {
			window.requestAnimationFrame( updateHeader );
			ticking = true;
		}
	}

	// Listen to scroll events.
	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Initial check on page load.
	updateHeader();
} )();
