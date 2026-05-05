/**
 * SGS Viewport Width Helper
 *
 * Sets a CSS custom property `--viewport-width` on `:root` equal to
 * `document.documentElement.clientWidth`, which excludes the vertical
 * scrollbar width on platforms that render a persistent scrollbar
 * (notably Windows desktop browsers).
 *
 * The full-bleed rule on `section.sgs-hero` falls back to `100vw` when
 * this property is absent (Mac, mobile — no persistent scrollbar). When
 * the property is present, the JS-measured value wins and prevents the
 * 15px horizontal overflow caused by `100vw` including the scrollbar.
 *
 * Listens for `resize` events with a 150ms debounce so rapid window
 * dragging does not thrash style recalculation.
 *
 * Pure vanilla — no dependencies. Wrapped in an IIFE to avoid leaking
 * helpers into the global scope.
 */
( function () {
	'use strict';

	var DEBOUNCE_MS = 150;
	var resizeTimer = null;

	function setViewportWidth() {
		var width = document.documentElement.clientWidth;
		document.documentElement.style.setProperty(
			'--viewport-width',
			width + 'px'
		);
	}

	function onResize() {
		if ( resizeTimer ) {
			window.clearTimeout( resizeTimer );
		}
		resizeTimer = window.setTimeout( setViewportWidth, DEBOUNCE_MS );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', setViewportWidth );
	} else {
		setViewportWidth();
	}

	window.addEventListener( 'resize', onResize, { passive: true } );
}() );
