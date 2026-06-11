/**
 * SGS Shop Filter Drawer — Accessible Mobile Filter Panel
 *
 * Behaviour:
 *   Desktop (≥782px): aside is a static sidebar; toggle hidden; JS no-ops.
 *   Mobile (<782px):  aside is an off-canvas drawer, opened by the toggle button.
 *
 * A11y: focus-trap, Escape-close, return-focus, aria-modal, scroll-lock,
 *       prefers-reduced-motion respected via CSS class.
 *
 * No-JS: aside renders visible (stacked layout); toggle hidden via CSS.
 * Enhanced: <body> gets .is-enhanced → CSS enables off-canvas behaviour.
 *
 * Spec: Spec 30 FR-30-3
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const BREAKPOINT = 782; // px — mirrors WP admin breakpoint

	/** Query focusable elements inside a container. */
	function getFocusable( container ) {
		return Array.from(
			container.querySelectorAll(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
				'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter( ( el ) => ! el.closest( '[hidden]' ) );
	}

	/** Main init — runs once after DOM is ready. */
	function init() {
		const toggle  = document.querySelector( '.sgs-shop-filters__toggle' );
		const aside   = document.getElementById( 'sgs-shop-filters' );
		const closeBtn = aside && aside.querySelector( '.sgs-shop-filters__close' );

		if ( ! toggle || ! aside ) {
			return; // Template parts not present on this page — bail.
		}

		// Signal to CSS that JS is active; enables off-canvas transform.
		document.body.classList.add( 'is-enhanced' );

		let backdropEl = null;

		// ── Open ──────────────────────────────────────────────────────────────

		function openDrawer() {
			if ( window.innerWidth >= BREAKPOINT ) {
				return; // Sidebar is static on desktop; do nothing.
			}

			aside.classList.add( 'is-open' );
			toggle.setAttribute( 'aria-expanded', 'true' );

			// ARIA dialog semantics while open.
			aside.setAttribute( 'role', 'dialog' );
			aside.setAttribute( 'aria-modal', 'true' );

			// Scroll-lock on body.
			document.body.classList.add( 'sgs-scroll-locked' );

			// Create and insert backdrop.
			if ( ! backdropEl ) {
				backdropEl = document.createElement( 'div' );
				backdropEl.className = 'sgs-shop-filters__backdrop';
				backdropEl.setAttribute( 'aria-hidden', 'true' );
				document.body.appendChild( backdropEl );
			}
			backdropEl.classList.add( 'is-visible' );
			backdropEl.addEventListener( 'click', closeDrawer );

			// Move focus into the drawer — close button first, else first focusable.
			const firstFocusable = closeBtn || getFocusable( aside )[ 0 ];
			if ( firstFocusable ) {
				// Delay one frame so the CSS transition doesn't skip focus ring paint.
				requestAnimationFrame( () => firstFocusable.focus() );
			}

			// Trap focus.
			aside.addEventListener( 'keydown', trapFocus );
			document.addEventListener( 'keydown', handleEscape );
		}

		// ── Close ─────────────────────────────────────────────────────────────

		function closeDrawer() {
			aside.classList.remove( 'is-open' );
			toggle.setAttribute( 'aria-expanded', 'false' );

			aside.removeAttribute( 'role' );
			aside.removeAttribute( 'aria-modal' );

			document.body.classList.remove( 'sgs-scroll-locked' );

			if ( backdropEl ) {
				backdropEl.classList.remove( 'is-visible' );
				backdropEl.removeEventListener( 'click', closeDrawer );
			}

			aside.removeEventListener( 'keydown', trapFocus );
			document.removeEventListener( 'keydown', handleEscape );

			// Return focus to the trigger.
			toggle.focus();
		}

		// ── Focus trap ────────────────────────────────────────────────────────

		function trapFocus( e ) {
			if ( 'Tab' !== e.key ) {
				return;
			}

			const focusable = getFocusable( aside );
			if ( ! focusable.length ) {
				e.preventDefault();
				return;
			}

			const first = focusable[ 0 ];
			const last  = focusable[ focusable.length - 1 ];

			if ( e.shiftKey ) {
				// Shift+Tab backwards: if on first element, wrap to last.
				if ( document.activeElement === first ) {
					e.preventDefault();
					last.focus();
				}
			} else {
				// Tab forwards: if on last element, wrap to first.
				if ( document.activeElement === last ) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		// ── Escape key ────────────────────────────────────────────────────────

		function handleEscape( e ) {
			if ( 'Escape' === e.key && aside.classList.contains( 'is-open' ) ) {
				e.preventDefault();
				closeDrawer();
			}
		}

		// ── Event bindings ────────────────────────────────────────────────────

		toggle.addEventListener( 'click', openDrawer );

		if ( closeBtn ) {
			closeBtn.addEventListener( 'click', closeDrawer );
		}

		// On resize above breakpoint: close if open, remove scroll-lock.
		window.addEventListener( 'resize', function () {
			if ( window.innerWidth >= BREAKPOINT && aside.classList.contains( 'is-open' ) ) {
				closeDrawer();
			}
		} );
	}

	// Run after DOM is ready.
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
