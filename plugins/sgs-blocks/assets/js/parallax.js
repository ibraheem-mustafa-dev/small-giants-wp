/**
 * Element parallax — requestAnimationFrame scroll writer for every browser.
 *
 * Writes the registered `--sgs-plx-y` custom property (px) on the element;
 * CSS moves it (`extensions.css` `.sgs-parallax-element`, or the `translate`
 * composite in `motion.css`). No inline transform is written. ('background' variant — background-
 * position on the block's own background image — was RETIRED 2026-08-19;
 * BackgroundPanel's own bgKenBurns/bgParallax pair is the real, working
 * background-motion mechanism.)
 * All scroll work is batched through requestAnimationFrame for smooth 60fps
 * performance. Only blocks near the viewport (±1 viewport height) are updated
 * each frame to keep the CPU cost negligible on long pages.
 *
 * Respects prefers-reduced-motion — writes nothing while the user has opted out, and follows a mid-session change
 * of that preference in both directions. Scroll and resize share one throttled handler.
 *
 * @package SGS\Blocks
 */
( function () {
	'use strict';

	var reducedQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );

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
		if ( reducedQuery.matches ) {
			ticking = false;
			return;
		}
		var vh = window.innerHeight;

		blocks.forEach( function ( el ) {
			var type     = el.dataset.sgsParallax;
			// Read the CASCADED value, not the inline style — the strength var is
			// now emitted via a scoped <style> rule (Spec 32 no-inline contract,
			// FR-32-11), not an inline style="" attribute, so el.style would
			// always read empty here.
			var strength = parseInt(
				getComputedStyle( el ).getPropertyValue( '--sgs-parallax-strength' ) || '30',
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

			if ( 'element' === type ) {
				el.style.setProperty( '--sgs-plx-y', offset.toFixed( 2 ) + 'px' );
			}
		} );

		ticking = false;
	}

	/**
	 * Scroll and resize handler — gates rAF calls via the ticking flag.
	 */
	function onScroll() {
		if ( ! ticking ) {
			requestAnimationFrame( updateParallax );
			ticking = true;
		}
	}

	var listening = false;

	/**
	 * Listen for scroll and resize and set the initial positions.
	 */
	function start() {
		if ( listening ) {
			return;
		}
		listening = true;
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		window.addEventListener( 'resize', onScroll );
		updateParallax();
	}

	/**
	 * Stop listening and clear every written offset.
	 */
	function stop() {
		listening = false;
		window.removeEventListener( 'scroll', onScroll );
		window.removeEventListener( 'resize', onScroll );
		blocks.forEach( function ( el ) {
			el.style.removeProperty( '--sgs-plx-y' );
		} );
	}

	// A mid-session change of the motion preference stops or resumes the effect.
	reducedQuery.addEventListener( 'change', function () {
		if ( reducedQuery.matches ) {
			stop();
		} else {
			start();
		}
	} );

	if ( ! reducedQuery.matches ) {
		start();
	}
}() );
