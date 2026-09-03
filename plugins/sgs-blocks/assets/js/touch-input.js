/**
 * Touch-input tracking — layer 2 of the touch-safe hover system.
 *
 * Sets `.sgs-touch-input` on <html> whenever the most recent pointer
 * interaction was a touch, and removes it again the moment a mouse or pen is
 * used. `includes/helpers-hover-state.php` scopes every emitted `:hover` rule
 * inside `:where(:root:not(.sgs-touch-input))`, so a hover style simply stops
 * applying while the page is being touched.
 *
 * WHY THIS EXISTS ON TOP OF THE CSS GUARD. `@media (hover: hover) and
 * (pointer: fine)` — layer 1 — describes the device's PRIMARY pointer only.
 * A hybrid (touchscreen laptop, Surface, iPad with a trackpad) reports
 * hover-capable and KEEPS reporting it for the whole session even while being
 * poked with a finger, so layer 1 alone leaves every hybrid with the
 * sticky-hover bug. The reasoning is recorded in full in
 * src/shared/effects/motion-utils.js's module docblock, which reaches the same
 * conclusion for motion effects and solves it the same reactive way.
 *
 * PROGRESSIVE ENHANCEMENT. Layer 1 works with this file absent: a page that
 * ships no JavaScript still gets correct hover behaviour on phones and
 * pure-touch tablets. This file only adds the hybrid case.
 *
 * Deliberately NOT a module and deliberately dependency-free: it must run on
 * any page carrying a hover rule, and importing motion-utils.js would pull the
 * motion layer onto pages that use none of it.
 */
( function () {
	var root = document.documentElement;

	if ( ! root || ! root.classList || ! window.addEventListener ) {
		return;
	}

	window.addEventListener(
		'pointerdown',
		function ( event ) {
			// Reactive on EVERY pointerdown, never cached: a hybrid device can
			// switch pointer type between one interaction and the next.
			root.classList.toggle( 'sgs-touch-input', 'touch' === event.pointerType );
		},
		{ capture: true, passive: true }
	);
} )();
