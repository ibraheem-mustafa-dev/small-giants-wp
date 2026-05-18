/**
 * SGS Floating UI — frontend behaviour.
 *
 * Handles two elements:
 *   1. Back-to-top button — shown after 200 px of scroll, smooth-scrolls to top on click.
 *   2. Reading progress bar — fills 0-100 % based on scroll depth.
 *
 * Single passive scroll listener throttled by requestAnimationFrame.
 * Vanilla JS only, no jQuery. ES6+.
 */
( function () {
	'use strict';

	const bttBtn  = document.querySelector( '.sgs-floating-ui__back-to-top' );
	const rpBar   = document.querySelector( '.sgs-floating-ui__reading-progress' );
	const wrapper = document.querySelector( '.sgs-floating-ui' );

	// Nothing to wire up — both elements absent.
	if ( ! bttBtn && ! rpBar ) {
		return;
	}

	// Remove the PHP-side aria-hidden once JS owns the wrapper.
	if ( wrapper ) {
		wrapper.removeAttribute( 'aria-hidden' );
	}

	let rafPending = false;

	/**
	 * Update both elements on scroll. Runs inside a requestAnimationFrame so
	 * it executes at most once per repaint frame regardless of scroll frequency.
	 */
	function onScroll() {
		if ( rafPending ) {
			return;
		}
		rafPending = true;

		window.requestAnimationFrame( function () {
			rafPending = false;

			const scrollY     = window.scrollY;
			const totalHeight = document.body.scrollHeight - window.innerHeight;

			// -- Back to top --------------------------------------------------
			if ( bttBtn ) {
				const visible = scrollY > 200;
				bttBtn.classList.toggle( 'is-visible', visible );
				// Keep aria-hidden in sync so screen readers ignore it when not useful.
				bttBtn.setAttribute( 'aria-hidden', visible ? 'false' : 'true' );
				// Toggle hidden attribute for browsers without CSS support.
				if ( visible ) {
					bttBtn.removeAttribute( 'hidden' );
				} else {
					bttBtn.setAttribute( 'hidden', '' );
				}
			}

			// -- Reading progress ---------------------------------------------
			if ( rpBar && totalHeight > 0 ) {
				const percent = Math.min( 100, Math.max( 0, ( scrollY / totalHeight ) * 100 ) );
				rpBar.style.setProperty( '--rp-progress', percent.toFixed( 1 ) + '%' );
				rpBar.setAttribute( 'aria-valuenow', Math.round( percent ).toString() );
			}
		} );
	}

	// Passive scroll listener — does not block scrolling.
	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Run once on load to set initial state.
	onScroll();

	// -- Back to top click handler -------------------------------------------
	if ( bttBtn ) {
		bttBtn.addEventListener( 'click', function () {
			window.scrollTo( { top: 0, behavior: 'smooth' } );
		} );
	}
}() );
