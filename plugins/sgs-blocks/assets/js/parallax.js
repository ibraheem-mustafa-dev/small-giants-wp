/**
 * Parallax scroll fallback — IntersectionObserver + requestAnimationFrame.
 *
 * Activates only when CSS Scroll-Driven Animations are NOT supported
 * (i.e. pre-Chrome 115, pre-Firefox 135, Safari < 18).
 *
 * Uses background-position (background variant) or translateY (element variant).
 * All scroll work is batched through requestAnimationFrame for smooth 60fps
 * performance. Only blocks near the viewport (±1 viewport height) are updated
 * each frame to keep the CPU cost negligible on long pages.
 *
 * Respects prefers-reduced-motion — bails entirely when the user has opted out.
 *
 * @package SGS\Blocks
 */
( function () {
	'use strict';

	// Bail if CSS Scroll-Driven Animations are supported — the CSS handles it.
	if ( CSS.supports( 'animation-timeline', 'scroll()' ) ) {
		return;
	}

	// Respect the user's motion preference.
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}

	var blocks = Array.from( document.querySelectorAll( '[data-sgs-parallax]' ) );

	if ( ! blocks.length ) {
		return;
	}

	var ticking = false;

	/**
	 * Update parallax offsets for all visible blocks.
	 *
	 * Runs inside a requestAnimationFrame callback so it never blocks
	 * the main thread. The ticking flag prevents queueing more than
	 * one rAF per scroll event.
	 */
	function updateParallax() {
		var vh = window.innerHeight;

		blocks.forEach( function ( el ) {
			var type     = el.dataset.sgsParallax;
			var strength = parseInt(
				el.style.getPropertyValue( '--sgs-parallax-strength' ) || '30',
				10
			);
			var rect = el.getBoundingClientRect();

			// Only update blocks within ±1 viewport height of the visible area.
			if ( rect.bottom < -vh || rect.top > vh * 2 ) {
				return;
			}

			// Progress: 0.0 when the block enters the bottom of the viewport,
			// 1.0 when it exits the top.
			var progress = 1 - ( rect.bottom / ( vh + rect.height ) );

			// Map 0–1 progress to an offset of -(strength/2) → +(strength/2).
			var offset = ( progress - 0.5 ) * strength;

			if ( 'background' === type ) {
				// Shift background-position-y. Block must have a background image
				// set — otherwise this property has no visible effect.
				el.style.backgroundPositionY = ( 50 + offset * 0.5 ) + '%';
			} else if ( 'element' === type ) {
				el.style.transform = 'translateY(' + offset + 'px)';
			}
		} );

		ticking = false;
	}

	/**
	 * Scroll handler — gates rAF calls via the ticking flag.
	 */
	function onScroll() {
		if ( ! ticking ) {
			requestAnimationFrame( updateParallax );
			ticking = true;
		}
	}

	window.addEventListener( 'scroll', onScroll, { passive: true } );

	// Set initial positions on page load before the user scrolls.
	updateParallax();
}() );
