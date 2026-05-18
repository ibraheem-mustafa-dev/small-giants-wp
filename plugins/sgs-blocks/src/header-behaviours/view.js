/**
 * Header Behaviours — frontend view script (F1 + F2).
 *
 * Responsibilities:
 *   1. Publishes `--sgs-header-height` CSS custom property on :root and body
 *      via ResizeObserver so sticky headers don't obscure anchor targets
 *      (WCAG 2.4.11 — scroll-padding-top picks this up via CSS).
 *   2. Toggles behaviour state classes:
 *      - `.sgs-header--transparent` → `.is-scrolled` when scrollY > 50
 *      - `.sgs-header--hide-on-scroll-down` → `.is-scrolling-down` when
 *        scrollY > 100 AND scroll direction is downward.
 *
 * Single passive scroll listener; requestAnimationFrame coalesce throttle.
 *
 * @package SGS\Blocks
 */

/* global ResizeObserver */

( function () {
	'use strict';

	/**
	 * Locate the header element. Accepts both the bare WP template-part wrapper
	 * (`header.wp-block-template-part`) and our injected hook class (`header.sgs-header`).
	 *
	 * @return {HTMLElement|null}
	 */
	function getHeaderEl() {
		return (
			document.querySelector( 'header.sgs-header' ) ||
			document.querySelector( 'header.wp-block-template-part' )
		);
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
	 *
	 * @param {HTMLElement} header
	 */
	function initScrollBehaviours( header ) {
		const isTransparent = header.classList.contains(
			'sgs-header--transparent'
		);
		const isHideOnScroll = header.classList.contains(
			'sgs-header--hide-on-scroll-down'
		);

		if ( ! isTransparent && ! isHideOnScroll ) {
			return;
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;

			// Transparent → opaque transition.
			if ( isTransparent ) {
				if ( scrollY > 50 ) {
					header.classList.add( 'is-scrolled' );
				} else {
					header.classList.remove( 'is-scrolled' );
				}
			}

			// Hide on scroll down (smart reveal).
			if ( isHideOnScroll ) {
				if ( scrollY > 100 && scrollY > prevScrollY ) {
					header.classList.add( 'is-scrolling-down' );
				} else if ( scrollY <= prevScrollY ) {
					header.classList.remove( 'is-scrolling-down' );
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
		initHeightPublisher( header );
		initScrollBehaviours( header );
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
