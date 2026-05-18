/**
 * Header Behaviours — frontend view script (F1 + F2).
 *
 * Responsibilities:
 *   1. Publishes `--sgs-header-height` CSS custom property on :root and body
 *      via ResizeObserver so sticky headers don't obscure anchor targets
 *      (WCAG 2.4.11 — scroll-padding-top picks this up via CSS).
 *   2. Reads the active behaviour from body class:
 *      - body.sgs-header-behaviour-transparent → toggles body.is-header-scrolled
 *        when scrollY > 50.
 *      - body.sgs-header-behaviour-hide-on-scroll-down → toggles
 *        body.is-header-scrolling-down when scrollY > 100 AND direction is down.
 *   3. When no sgs-header-behaviour-* class is on body, the scroll listener is
 *      skipped entirely — zero event overhead on pages without behaviour rules.
 *
 * State classes are toggled on document.body, not on the header element.
 * CSS selectors in header-behaviours.css descend from body accordingly.
 *
 * Single passive scroll listener; requestAnimationFrame coalesce throttle.
 *
 * @package SGS\Blocks
 */

/* global ResizeObserver */

( function () {
	'use strict';

	/**
	 * Locate the header element.
	 *
	 * @return {HTMLElement|null}
	 */
	function getHeaderEl() {
		return document.querySelector( 'header.wp-block-template-part' );
	}

	/**
	 * Read the active behaviour slug from body class.
	 * Returns the slug string (e.g. 'transparent', 'sticky', 'hide-on-scroll-down')
	 * or an empty string when no behaviour class is present.
	 *
	 * @return {string}
	 */
	function getActiveBehaviour() {
		const match = document.body.className.match(
			/sgs-header-behaviour-([\w-]+)/
		);
		return match ? match[ 1 ] : '';
	}

	/**
	 * Publish `--sgs-header-height` (integer px) to :root and body.
	 *
	 * @param {number} height
	 */
	function publishHeight( height ) {
		const value = Math.round( height ) + 'px';
		document.documentElement.style.setProperty( '--sgs-header-height', value );
		document.body.style.setProperty( '--sgs-header-height', value );
	}

	/**
	 * Wire up ResizeObserver for F1 (header-height publisher).
	 *
	 * @param {HTMLElement} header
	 */
	function initHeightPublisher( header ) {
		if ( typeof ResizeObserver === 'undefined' ) {
			// Graceful degradation: publish once from getBoundingClientRect.
			publishHeight( header.getBoundingClientRect().height );
			return;
		}
		const ro = new ResizeObserver( function ( entries ) {
			for ( const entry of entries ) {
				const h =
					entry.borderBoxSize && entry.borderBoxSize[ 0 ]
						? entry.borderBoxSize[ 0 ].blockSize
						: entry.contentRect.height;
				publishHeight( h );
			}
		} );
		ro.observe( header );
	}

	/**
	 * Wire up the scroll listener for F2 behaviour state classes.
	 * State is toggled on document.body, not on the header element.
	 *
	 * @param {string} behaviour Active behaviour slug.
	 */
	function initScrollBehaviours( behaviour ) {
		const isTransparent = behaviour === 'transparent';
		const isHideOnScroll = behaviour === 'hide-on-scroll-down';

		if ( ! isTransparent && ! isHideOnScroll ) {
			return;
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;

			// Transparent → opaque transition (state on body).
			if ( isTransparent ) {
				if ( scrollY > 50 ) {
					document.body.classList.add( 'is-header-scrolled' );
				} else {
					document.body.classList.remove( 'is-header-scrolled' );
				}
			}

			// Hide on scroll down — smart reveal (state on body).
			if ( isHideOnScroll ) {
				if ( scrollY > 100 && scrollY > prevScrollY ) {
					document.body.classList.add( 'is-header-scrolling-down' );
				} else if ( scrollY <= prevScrollY ) {
					document.body.classList.remove( 'is-header-scrolling-down' );
				}
			}

			prevScrollY = scrollY;
		}

		window.addEventListener(
			'scroll',
			function () {
				if ( ! rafScheduled ) {
					rafScheduled = true;
					window.requestAnimationFrame( onScrollTick );
				}
			},
			{ passive: true }
		);

		// Run once on load to set correct initial state (e.g. page loaded
		// mid-scroll after browser back-navigation).
		onScrollTick();
	}

	/**
	 * Boot both F1 and F2 after the DOM is ready.
	 */
	function boot() {
		const header = getHeaderEl();
		if ( ! header ) {
			return;
		}

		// F1 — always publish header height for scroll-padding-top.
		initHeightPublisher( header );

		// F2 — scroll behaviour state; only active when a behaviour class exists.
		const behaviour = getActiveBehaviour();
		if ( behaviour ) {
			initScrollBehaviours( behaviour );
		}
	}

	if (
		document.readyState === 'complete' ||
		document.readyState === 'interactive'
	) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
