/**
 * SGS Animation Observer
 *
 * Watches elements with [data-sgs-animation] and adds .sgs-animated
 * when they scroll into view. Respects the delay data attribute.
 * Falls back to showing everything immediately if IntersectionObserver
 * is unavailable (progressive enhancement).
 *
 * ~0.5KB minified.
 */
( function () {
	'use strict';

	var elements = document.querySelectorAll( '[data-sgs-animation]' );

	if ( ! elements.length ) {
		return;
	}

	// L4: Respect prefers-reduced-motion. Immediately show all animated
	// elements without transitions — CSS already sets opacity/transform
	// to final values in the reduced-motion media query, so just add the
	// class to mark them as done without waiting for IntersectionObserver.
	if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		elements.forEach( function ( el ) {
			el.classList.add( 'sgs-animated' );
		} );
		return;
	}

	if ( typeof IntersectionObserver === 'undefined' ) {
		elements.forEach( function ( el ) {
			el.classList.add( 'sgs-animated' );
		} );
		return;
	}

	var observer = new IntersectionObserver(
		function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( ! entry.isIntersecting ) {
					return;
				}

				var el = entry.target;
				var delay = parseInt( el.dataset.sgsAnimationDelay || '0', 10 );

				if ( delay > 0 ) {
					setTimeout( function () {
						el.classList.add( 'sgs-animated' );
					}, delay );
				} else {
					el.classList.add( 'sgs-animated' );
				}

				observer.unobserve( el );
			} );
		},
		{ threshold: 0.15 }
	);

	elements.forEach( function ( el ) {
		observer.observe( el );
	} );
} )();
