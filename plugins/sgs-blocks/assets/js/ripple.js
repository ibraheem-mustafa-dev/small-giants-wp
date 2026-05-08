/**
 * SGS Click Ripple
 *
 * Adds a radial ripple animation from the click point on any element with
 * the .sgs-has-click-ripple class. The CSS pseudo-element (::after) handles
 * the visual; this script sets the click coordinates and triggers the animation
 * by toggling .is-rippling.
 *
 * CSS custom properties set per-element:
 *   --ripple-x  — click X relative to element (px)
 *   --ripple-y  — click Y relative to element (px)
 *   --ripple-scale — scale factor so the ripple fills the element
 *
 * Progressive enhancement: only runs when IntersectionObserver is available
 * (i.e. modern browsers). Reduced-motion is handled entirely in CSS.
 *
 * ~0.4KB minified.
 *
 * @package SGS\Blocks
 */
( function () {
	'use strict';

	// Guard: skip if matchMedia reports reduced motion (belt-and-braces alongside CSS).
	if (
		globalThis.matchMedia &&
		globalThis.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	) {
		return;
	}

	document.addEventListener( 'click', function ( e ) {
		var target = e.target.closest( '.sgs-has-click-ripple' );
		if ( ! target ) {
			return;
		}

		var rect   = target.getBoundingClientRect();
		var x      = e.clientX - rect.left;
		var y      = e.clientY - rect.top;

		// Scale factor: ripple must reach the furthest corner from the click point.
		var dx    = Math.max( x, rect.width - x );
		var dy    = Math.max( y, rect.height - y );
		var scale = Math.ceil( Math.sqrt( dx * dx + dy * dy ) * 2 / 4 );

		// Reset before re-triggering so the animation restarts on rapid clicks.
		target.classList.remove( 'is-rippling' );

		// Set coordinates and scale as CSS custom properties.
		target.style.setProperty( '--ripple-x', x + 'px' );
		target.style.setProperty( '--ripple-y', y + 'px' );
		target.style.setProperty( '--ripple-scale', scale );

		// Force a reflow so the browser registers the class removal above
		// before adding it back — this restarts the CSS transition.
		// eslint-disable-next-line no-unused-expressions
		target.offsetWidth;

		target.classList.add( 'is-rippling' );
	} );
} )();
