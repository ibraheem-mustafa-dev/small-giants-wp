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

	/**
	 * Resolve a token key to its theme.json CSS variable reference.
	 *
	 * Easing values are stored as token keys (e.g. 'ease-out', 'spring')
	 * referencing theme.json settings.custom.easing.*.
	 * The CSS variable path is: var(--wp--custom--easing--<key>).
	 *
	 * Known token keys — anything outside this set is treated as a raw
	 * CSS value for backwards compatibility.
	 *
	 * @param {string} value Easing token key or raw CSS value.
	 * @return {string} CSS variable reference or raw value.
	 */
	var EASING_TOKEN_KEYS = [ 'default', 'ease-out', 'ease-in', 'spring', 'linear' ];

	function resolveEasing( value ) {
		if ( ! value ) {
			return 'var(--wp--custom--easing--default, cubic-bezier(0.4, 0, 0.2, 1))';
		}
		if ( EASING_TOKEN_KEYS.indexOf( value ) !== -1 ) {
			return 'var(--wp--custom--easing--' + value + ')';
		}
		// Backwards compatibility: raw CSS value stored before token migration.
		return value;
	}

	// Set easing CSS custom property from data attribute on each element.
	elements.forEach( function ( el ) {
		var easing = el.dataset.sgsAnimationEasing;
		el.style.setProperty( '--sgs-anim-easing', resolveEasing( easing ) );
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

/**
 * SVG Path Draw on Scroll
 *
 * When an element with [data-sgs-path-draw="true"] scrolls into view,
 * find all <path> children, measure their total length via getTotalLength(),
 * set stroke-dasharray + stroke-dashoffset to that length (hiding the stroke),
 * then transition stroke-dashoffset to 0 (drawing the stroke).
 *
 * Data attributes read from the host element:
 *   data-sgs-path-draw-duration  — ms (default 1500)
 *   data-sgs-path-draw-offset    — threshold 0-80 as integer % (default 20 → 0.2)
 *   data-sgs-path-draw-easing    — CSS easing string (default ease-out)
 *
 * Progressive enhancement: fails silently if SVG/IntersectionObserver unavailable.
 * Respects prefers-reduced-motion — draws immediately without animation.
 */
( function () {
	'use strict';

	var drawElements = document.querySelectorAll( '[data-sgs-path-draw="true"]' );
	if ( ! drawElements.length || typeof IntersectionObserver === 'undefined' ) {
		return;
	}

	var prefersReducedMotion = globalThis.matchMedia &&
		globalThis.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	/**
	 * Initialise stroke-dasharray on all <path> children of an SVG element.
	 *
	 * @param {Element} el   Host element (img or inline SVG wrapper).
	 * @param {string}  easing   CSS easing string.
	 * @param {number}  duration Animation duration in ms.
	 */
	function initPaths( el, easing, duration ) {
		// Support both inline <svg> and <img> loading an SVG (inline only — img src SVGs
		// are cross-origin and cannot be queried). Find the nearest <svg> in the DOM tree.
		var svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector( 'svg' );
		if ( ! svg ) {
			return;
		}

		var paths = svg.querySelectorAll( 'path' );
		if ( ! paths.length ) {
			return;
		}

		paths.forEach( function ( path ) {
			var length = path.getTotalLength();
			if ( ! length ) {
				return;
			}
			path.style.strokeDasharray  = length;
			path.style.strokeDashoffset = length;

			if ( ! prefersReducedMotion ) {
				path.style.transition = 'stroke-dashoffset ' + duration + 'ms ' + easing;
			}
		} );

		// Store paths for the draw trigger.
		el._sgsPaths = paths;
	}

	/**
	 * Trigger the draw animation — set stroke-dashoffset to 0 on all paths.
	 *
	 * @param {Element} el Host element.
	 */
	function drawPaths( el ) {
		if ( ! el._sgsPaths ) {
			return;
		}
		el._sgsPaths.forEach( function ( path ) {
			path.style.strokeDashoffset = 0;
		} );
	}

	var drawObserver = new IntersectionObserver(
		function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( ! entry.isIntersecting ) {
					return;
				}
				drawPaths( entry.target );
				drawObserver.unobserve( entry.target );
			} );
		},
		{ threshold: 0 } // threshold overridden per-element via rootMargin below
	);

	drawElements.forEach( function ( el ) {
		var duration  = parseInt( el.dataset.sgsPathDrawDuration  || '1500', 10 );
		var offsetPct = parseInt( el.dataset.sgsPathDrawOffset    || '20', 10 );
		var easing    = el.dataset.sgsPathDrawEasing || 'ease-out';

		// Clamp offset to 0-80.
		offsetPct = Math.max( 0, Math.min( 80, offsetPct ) );

		initPaths( el, easing, duration );

		if ( prefersReducedMotion ) {
			// Draw immediately without waiting for scroll.
			drawPaths( el );
			return;
		}

		// Create a per-element observer with the configured threshold.
		// IntersectionObserver threshold is 0-1; attribute is 0-80 integer %.
		var threshold = offsetPct / 100;
		var elObserver = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						drawPaths( entry.target );
						elObserver.unobserve( entry.target );
					}
				} );
			},
			{ threshold: threshold }
		);

		elObserver.observe( el );
	} );
} )();
