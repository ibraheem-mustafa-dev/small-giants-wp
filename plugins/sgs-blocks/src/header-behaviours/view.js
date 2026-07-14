/**
 * Header Behaviours — frontend view script (F1 + F2, FR-S9-9).
 *
 * Responsibilities:
 *   1. Publishes `--sgs-header-height` CSS custom property on :root and body
 *      via ResizeObserver so sticky headers don't obscure anchor targets
 *      (WCAG 2.4.11 — scroll-padding-top picks this up via CSS). UNCHANGED.
 *   2. Reads the INDEPENDENT flag SET from body class (not a single slug —
 *      several flags can be present at once):
 *      - body.sgs-header-behaviour-transparent → toggles body.is-header-scrolled
 *        when scrollY > 50.
 *      - body.sgs-header-behaviour-shrink → toggles body.is-header-shrunk
 *        (its OWN state class + threshold, independent of transparent, so the
 *        two behaviours can be tuned separately).
 *      - body.sgs-header-behaviour-hide-on-scroll-down (legacy/dormant path,
 *        kept harmless) → toggles body.is-header-scrolling-down when
 *        scrollY > 100 AND direction is down.
 *   3. When none of transparent / shrink / hide-on-scroll-down flags are on
 *      body, the scroll listener is skipped entirely — zero event overhead on
 *      pages without active behaviours.
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
	 * Read the active behaviour flag SET from body class. Independent flags —
	 * more than one may be true at once (e.g. sticky AND transparent).
	 *
	 * @return {{transparent: boolean, shrink: boolean, hideOnScrollDown: boolean}}
	 */
	function getActiveBehaviours() {
		const classes = document.body.className;
		return {
			transparent: / sgs-header-behaviour-transparent(?: |$)/.test(
				' ' + classes
			),
			shrink: / sgs-header-behaviour-shrink(?: |$)/.test( ' ' + classes ),
			hideOnScrollDown: / sgs-header-behaviour-hide-on-scroll-down(?: |$)/.test(
				' ' + classes
			),
		};
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
	 * Wire up the scroll listener for F2 behaviour state classes. Transparent
	 * and shrink each get their OWN state class (is-header-scrolled /
	 * is-header-shrunk) so the two axes can be tuned independently — a header
	 * can be transparent-only, shrink-only, or both at once. State is toggled
	 * on document.body, not on the header element.
	 *
	 * @param {{transparent: boolean, shrink: boolean, hideOnScrollDown: boolean}} behaviours Active flag set.
	 */
	function initScrollBehaviours( behaviours ) {
		const { transparent, shrink, hideOnScrollDown } = behaviours;

		if ( ! transparent && ! shrink && ! hideOnScrollDown ) {
			return;
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;

			// Transparent → opaque transition (own state class on body).
			if ( transparent ) {
				if ( scrollY > 50 ) {
					document.body.classList.add( 'is-header-scrolled' );
				} else {
					document.body.classList.remove( 'is-header-scrolled' );
				}
			}

			// Shrink — own state class + threshold, independent of transparent.
			if ( shrink ) {
				if ( scrollY > 50 ) {
					document.body.classList.add( 'is-header-shrunk' );
				} else {
					document.body.classList.remove( 'is-header-shrunk' );
				}
			}

			// Hide on scroll down — smart reveal (state on body). Legacy/dormant
			// path kept harmless — no current UI sets this flag.
			if ( hideOnScrollDown ) {
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

		// F2 — scroll behaviour state; only active when a relevant flag exists.
		initScrollBehaviours( getActiveBehaviours() );
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
