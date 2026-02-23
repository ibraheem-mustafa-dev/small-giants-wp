/**
 * Smooth Scroll
 *
 * Enables smooth scrolling for anchor links.
 * Respects `prefers-reduced-motion` setting.
 *
 * @package SGS_Theme
 */

( function () {
	'use strict';

	// Check for reduced motion preference.
	const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	if ( prefersReducedMotion ) {
		// User prefers reduced motion — use instant scroll.
		return;
	}

	/**
	 * Get header height for scroll offset.
	 *
	 * @return {number} Header height in pixels.
	 */
	function getHeaderOffset() {
		const header = document.querySelector( '.wp-block-template-part[class*="header"]' );
		return header ? header.offsetHeight : 0;
	}

	/**
	 * Smooth scroll to target element.
	 *
	 * @param {Element} target - Target element to scroll to.
	 */
	function smoothScrollTo( target ) {
		const headerOffset = getHeaderOffset();
		const targetPosition = target.getBoundingClientRect().top + window.scrollY;
		const offsetPosition = targetPosition - headerOffset - 20; // 20px additional breathing room.

		window.scrollTo( {
			top: offsetPosition,
			behavior: 'smooth',
		} );
	}

	/**
	 * Handle anchor link clicks.
	 *
	 * @param {Event} event - Click event.
	 */
	function handleAnchorClick( event ) {
		const link = event.currentTarget;
		const href = link.getAttribute( 'href' );

		// Only handle internal anchor links.
		if ( ! href || ! href.startsWith( '#' ) ) {
			return;
		}

		const targetId = href.substring( 1 );
		const targetElement = document.getElementById( targetId );

		if ( ! targetElement ) {
			return;
		}

		event.preventDefault();
		smoothScrollTo( targetElement );

		// Update URL hash without jumping.
		if ( history.pushState ) {
			history.pushState( null, null, href );
		} else {
			window.location.hash = href;
		}

		// Move focus to target element for accessibility.
		targetElement.focus( { preventScroll: true } );
		if ( document.activeElement !== targetElement ) {
			targetElement.setAttribute( 'tabindex', '-1' );
			targetElement.focus( { preventScroll: true } );
		}
	}

	// Attach to all anchor links.
	const anchorLinks = document.querySelectorAll( 'a[href^="#"]' );
	anchorLinks.forEach( ( link ) => {
		link.addEventListener( 'click', handleAnchorClick );
	} );

	// Handle smooth scroll on page load if URL has hash.
	window.addEventListener( 'load', () => {
		if ( window.location.hash ) {
			const targetId = window.location.hash.substring( 1 );
			const targetElement = document.getElementById( targetId );
			if ( targetElement ) {
				// Small delay to allow page to render.
				setTimeout( () => {
					smoothScrollTo( targetElement );
				}, 100 );
			}
		}
	} );
} )();
