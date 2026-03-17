/**
 * SGS Header Behaviour
 *
 * Unified scroll handler for all header modes:
 * - Sticky: adds .is-scrolled after threshold
 * - Transparent + Sticky: transitions from transparent to solid on scroll
 * - Smart Reveal: hides on scroll down, reveals on scroll up
 * - Shrink fallback: adds .is-scrolled for browsers without scroll-driven animations
 *
 * Also handles:
 * - Skip link focus fix (WordPress core bug)
 * - Header height measurement for transparent spacing compensation
 * - Hero detection for transparent headers
 *
 * ~2KB minified. Vanilla JS, no dependencies.
 * Respects prefers-reduced-motion.
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	var header = document.querySelector( 'header.wp-block-template-part' );
	if ( ! header ) {
		return;
	}

	var SCROLL_THRESHOLD = 100;
	var REVEAL_THRESHOLD = 5; // Minimum scroll delta to trigger hide/show.

	var lastScrollTop = 0;
	var ticking = false;

	var isTransparentSticky = header.classList.contains( 'sgs-header-transparent-sticky' );
	var isSmartReveal = header.classList.contains( 'sgs-header-smart-reveal' );
	var isSticky = header.classList.contains( 'sgs-header-sticky' );
	var isShrink = header.classList.contains( 'sgs-header-shrink' );
	var isTransparent = header.classList.contains( 'sgs-header-transparent' );

	// Check if user prefers reduced motion.
	var prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	/**
	 * Measure and set header height CSS custom property.
	 * Used for transparent header spacing compensation.
	 */
	function measureHeaderHeight() {
		/*
		 * Measure the visible nav row only, not the full header element
		 * (which includes off-canvas drawer elements with position:fixed
		 * that inflate offsetHeight).
		 */
		var navRow = header.querySelector( '.wp-block-group:not([style*="display:none"]):not(.sgs-mobile-nav-drawer__backdrop):not(.sgs-mobile-nav-drawer)' );
		var height = navRow ? navRow.offsetHeight : header.offsetHeight;
		document.documentElement.style.setProperty( '--sgs-header-height', height + 'px' );
	}

	/**
	 * Detect if the page has a hero block as the first content element.
	 * If so, add a body class so CSS knows not to add spacing compensation.
	 */
	function detectHero() {
		/*
		 * Search for a hero block anywhere in the first content section,
		 * not just as a direct child of .wp-site-blocks (the hero is
		 * typically nested inside a Group or template-part wrapper).
		 */
		var hero = document.querySelector( '.wp-block-sgs-hero, .sgs-hero, .wp-block-cover' );
		if ( hero ) {
			document.body.classList.add( 'sgs-has-hero' );
		}
	}

	/**
	 * Set up IntersectionObserver for transparent+sticky mode.
	 * Watches the hero section — when it exits the viewport, switch to solid.
	 */
	function setupTransparentStickyObserver() {
		// Find the hero or first significant content block.
		var hero = document.querySelector( '.wp-block-sgs-hero, .sgs-hero, .wp-block-cover' );
		if ( ! hero ) {
			// No hero — use scroll threshold fallback.
			return;
		}

		var observer = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						// Hero visible — header stays transparent.
						header.classList.remove( 'sgs-header-scrolled' );
					} else {
						// Hero out of view — header becomes solid.
						header.classList.add( 'sgs-header-scrolled' );
					}
				} );
			},
			{
				root: null,
				threshold: 0,
				rootMargin: '-1px 0px 0px 0px', // Trigger as soon as hero leaves top edge.
			}
		);

		observer.observe( hero );
	}

	/**
	 * Main scroll handler — runs via requestAnimationFrame.
	 */
	function updateHeader() {
		var scrollTop = window.scrollY || document.documentElement.scrollTop;
		var scrollDelta = scrollTop - lastScrollTop;

		// Add/remove .is-scrolled class (used by all sticky/shrink modes).
		if ( scrollTop > SCROLL_THRESHOLD ) {
			header.classList.add( 'is-scrolled' );
		} else {
			header.classList.remove( 'is-scrolled' );
		}

		// Transparent+sticky fallback (no hero found — use scroll threshold).
		if ( isTransparentSticky && ! document.querySelector( '.wp-block-sgs-hero, .sgs-hero, .wp-block-cover' ) ) {
			if ( scrollTop > SCROLL_THRESHOLD ) {
				header.classList.add( 'sgs-header-scrolled' );
			} else {
				header.classList.remove( 'sgs-header-scrolled' );
			}
		}

		// Smart reveal — hide on scroll down, show on scroll up.
		if ( isSmartReveal && ! prefersReducedMotion ) {
			if ( scrollDelta > REVEAL_THRESHOLD && scrollTop > SCROLL_THRESHOLD ) {
				// Scrolling down past threshold — hide.
				header.classList.add( 'sgs-header-hidden' );
			} else if ( scrollDelta < -REVEAL_THRESHOLD ) {
				// Scrolling up — reveal.
				header.classList.remove( 'sgs-header-hidden' );
			}
		}

		lastScrollTop = scrollTop;
		ticking = false;
	}

	/**
	 * Throttled scroll listener via requestAnimationFrame.
	 */
	function onScroll() {
		if ( ! ticking ) {
			window.requestAnimationFrame( updateHeader );
			ticking = true;
		}
	}

	/**
	 * Fix WordPress core skip link bug.
	 *
	 * The default skip link scrolls to #main but does not move keyboard focus.
	 * This makes the skip link functionally useless for keyboard users.
	 * Fix: add tabindex="-1" to the target and programmatically focus it.
	 */
	function fixSkipLink() {
		var skipLinks = document.querySelectorAll( 'a.skip-link, a[href="#main"]' );
		skipLinks.forEach( function ( link ) {
			link.addEventListener( 'click', function ( e ) {
				var targetId = link.getAttribute( 'href' );
				if ( ! targetId || targetId.charAt( 0 ) !== '#' ) {
					return;
				}

				var target = document.querySelector( targetId );
				if ( ! target ) {
					return;
				}

				// Make the target focusable and move focus there.
				if ( ! target.hasAttribute( 'tabindex' ) ) {
					target.setAttribute( 'tabindex', '-1' );
				}
				target.focus();
			} );
		} );

		// Also ensure the main element has an id.
		var main = document.querySelector( 'main' );
		if ( main && ! main.id ) {
			main.id = 'main';
		}
	}

	/**
	 * Initialise.
	 */
	function init() {
		// Measure header for transparent spacing compensation.
		if ( isTransparent || isTransparentSticky ) {
			measureHeaderHeight();
			detectHero();
			window.addEventListener( 'resize', measureHeaderHeight, { passive: true } );
		}

		// Set up IntersectionObserver for transparent+sticky.
		if ( isTransparentSticky ) {
			setupTransparentStickyObserver();
		}

		// Listen to scroll events for all modes except static.
		if ( isSticky || isTransparentSticky || isSmartReveal || isShrink ) {
			window.addEventListener( 'scroll', onScroll, { passive: true } );
			updateHeader(); // Initial check.
		}

		// Fix skip link.
		fixSkipLink();
	}

	// Run when DOM is ready.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
