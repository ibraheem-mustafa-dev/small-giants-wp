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
/**
 * SGS Animation Observer
 *
 * Watches elements with [data-sgs-animation] and adds .sgs-animated
 * when they scroll into view. Reads delay from data attributes and
 * sets easing as a CSS custom property.
 *
 * Progressive enhancement: adds .sgs-js to <html> so CSS only hides
 * content when JS is confirmed available. Try/catch removes the gate
 * if the observer fails, preventing invisible content.
 *
 * ~0.6KB minified.
 */
( function () {
	'use strict';

	// Progressive enhancement gate — CSS only hides content when this class is present.
	document.documentElement.classList.add( 'sgs-js' );

	var elements = document.querySelectorAll( '[data-sgs-animation]' );

	if ( ! elements.length ) {
		return;
	}

	// Set easing CSS custom property from data attribute on each element.
	elements.forEach( function ( el ) {
		var easing = el.dataset.sgsAnimationEasing;
		if ( easing && easing !== 'ease' ) {
			el.style.setProperty( '--sgs-anim-easing', easing );
		}
	} );

	// Respect prefers-reduced-motion — show all immediately.
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

	try {
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
			{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
		);

		elements.forEach( function ( el ) {
			observer.observe( el );
		} );
	} catch ( e ) {
		// Observer failed — remove gate so CSS shows content immediately.
		document.documentElement.classList.remove( 'sgs-js' );
	}
} )();
