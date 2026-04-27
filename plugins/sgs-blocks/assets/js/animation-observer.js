/**
 * SGS Animation Observer
 *
 * Watches elements with [data-sgs-animation] and adds .sgs-animated
 * when they scroll into view. Elements already visible on page load are
 * animated immediately (with a 100ms stagger by index) so they are not
 * missed by the IntersectionObserver which only fires on subsequent
 * intersections in some browsers.
 *
 * Progressive enhancement: adds .sgs-js to <html> so CSS only hides
 * content when JS is confirmed available. Try/catch removes the gate
 * if the observer fails, preventing invisible content.
 *
 * ~0.8KB minified.
 */
( function () {
	'use strict';

	// Progressive enhancement gate — CSS only hides content when this class is present.
	document.documentElement.classList.add( 'sgs-js' );

	const elements = document.querySelectorAll( '[data-sgs-animation]' );

	if ( ! elements.length ) {
		return;
	}

	// Set easing CSS custom property from data attribute on each element.
	elements.forEach( function ( el ) {
		const easing = el.dataset.sgsAnimationEasing;
		if ( easing && easing !== 'ease' ) {
			el.style.setProperty( '--sgs-anim-easing', easing );
		}
	} );

	// Respect prefers-reduced-motion — show all immediately.
	if ( globalThis.matchMedia && globalThis.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
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

	/**
	 * Check whether an element is currently within the viewport.
	 *
	 * Uses the same 15% threshold as the IntersectionObserver so the
	 * in-viewport check is consistent with the scroll-triggered check.
	 *
	 * @param {Element} el Element to test.
	 * @return {boolean} True if the element is in the viewport.
	 */
	function isInViewport( el ) {
		const rect           = el.getBoundingClientRect();
		const viewportHeight = globalThis.innerHeight || document.documentElement.clientHeight;
		const viewportWidth  = globalThis.innerWidth  || document.documentElement.clientWidth;

		// Element must be at least 15% visible (matches observer threshold).
		const visibleHeight = Math.min( rect.bottom, viewportHeight ) - Math.max( rect.top, 0 );
		const visibleWidth  = Math.min( rect.right, viewportWidth )   - Math.max( rect.left, 0 );

		if ( visibleHeight <= 0 || visibleWidth <= 0 ) {
			return false;
		}

		const visibleFraction = ( visibleHeight * visibleWidth ) / ( rect.height * rect.width );
		return visibleFraction >= 0.15;
	}

	try {
		const observer = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( ! entry.isIntersecting ) {
						return;
					}

					const el    = entry.target;
					const delay = Number.parseInt( el.dataset.sgsAnimationDelay || '0', 10 );

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

		// Animate elements already in the viewport on page load.
		// IntersectionObserver fires async and the rootMargin (-40px bottom)
		// can cause elements near the fold to be missed on initial load.
		const inViewOnLoad = [];
		elements.forEach( function ( el ) {
			if ( isInViewport( el ) ) {
				inViewOnLoad.push( el );
			} else {
				observer.observe( el );
			}
		} );

		// Stagger already-visible elements by 100ms per index so they
		// animate in sequence rather than all popping in simultaneously.
		inViewOnLoad.forEach( function ( el, index ) {
			const baseDelay    = Number.parseInt( el.dataset.sgsAnimationDelay || '0', 10 );
			const staggerDelay = baseDelay + index * 100;

			if ( staggerDelay > 0 ) {
				setTimeout( function () {
					el.classList.add( 'sgs-animated' );
				}, staggerDelay );
			} else {
				el.classList.add( 'sgs-animated' );
			}
		} );
	} catch ( observerError ) {
		// Observer construction failed (e.g. sandboxed iframe, feature-policy).
		// Remove the .sgs-js gate so CSS falls back to showing content immediately.
		document.documentElement.classList.remove( 'sgs-js' );

		// Expose in dev environments without crashing production.
		if ( globalThis.console ) {
			globalThis.console.warn( '[SGS] Animation observer failed to initialise:', observerError );
		}
	}
} )();
