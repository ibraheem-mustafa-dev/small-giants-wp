/**
 * SGS Animation Observer
 *
 * Plays each [data-sgs-animation] element's entrance as a script animation
 * (Web Animations API, element.animate()) instead of a CSS transition — a
 * script animation is its own effect in the element's animation stack, so it
 * never reads or writes the element's own `transition`, `animation` or
 * `transform` properties. A block's own hover transitions, CSS keyframe
 * animations (header shrink, counter reveal) and scroll-driven transforms
 * (hide-on-scroll) keep running underneath it unchanged.
 *
 * Elements already in the viewport on load play at once (their own delay
 * plus a 100ms-per-index stagger). The rest are created — paused, which
 * already paints their start pose — once they come within 200px of the
 * viewport, then played when 15% of them is in view. Nothing is hidden by
 * CSS, so content with no JavaScript, or a script that throws, both show
 * unanimated rather than invisible.
 *
 * Progressive enhancement: adds .sgs-js to <html> (also read by the
 * image-sequence and horizontal-panel blocks). Try/catch finishes every
 * animation already created and reveals every element if the observer
 * itself fails.
 */
( function () {
	'use strict';

	// Progressive enhancement gate — .sgs-js also gates the image-sequence
	// and horizontal-panel blocks; this extension no longer hides anything
	// itself, so nothing here depends on it.
	document.documentElement.classList.add( 'sgs-js' );

	var elements = document.querySelectorAll( '[data-sgs-animation]' );

	if ( ! elements.length ) {
		return;
	}

	/*
	 * Entrance effect table — one entry per preset, naming only the
	 * properties that preset moves. Values reproduce the extension's
	 * previous CSS start poses exactly. Consumed by keyframes() below and by
	 * the framework DB seeder (scripts/dbschema/seed-motion-shape-signatures.py
	 * ::_extract_entrance_rows), which reads this exact JSON block instead of
	 * parsing extensions.css.
	 */
	var EFFECTS = /* sgs-entrance-effects:start */ {
		"fade-up":     { "opacity": 0, "axis": "y", "sign": 1,  "distance": 30 },
		"fade-down":   { "opacity": 0, "axis": "y", "sign": -1, "distance": 30 },
		"fade-in":     { "opacity": 0 },
		"fade-left":   { "opacity": 0, "axis": "x", "sign": 1,  "distance": 30 },
		"fade-right":  { "opacity": 0, "axis": "x", "sign": -1, "distance": 30 },
		"slide-up":    { "axis": "y", "sign": 1,  "distance": 100 },
		"slide-down":  { "axis": "y", "sign": -1, "distance": 100 },
		"slide-left":  { "axis": "x", "sign": -1, "distance": 100 },
		"slide-right": { "axis": "x", "sign": 1,  "distance": 100 },
		"scale-in":    { "opacity": 0, "scale": 0.9 },
		"scale-out":   { "opacity": 0, "scale": 1.1 },
		"rotate-in":   { "opacity": 0, "rotate": -10 },
		"flip-in":     { "opacity": 0, "transform": "perspective(600px) rotateX(30deg)" },
		"blur-in":     { "opacity": 0, "filter": "blur(8px)", "filterTo": "blur(0px)" },
		"bounce-in":   { "opacity": 0, "scale": 0.3, "easing": "cubic-bezier(0.175, 0.885, 0.32, 1.275)" },
		"reveal-up":   { "clipPath": "inset(100% 0 0 0)", "clipPathTo": "inset(0 0 0 0)" }
	} /* sgs-entrance-effects:end */;

	var ALLOWED_DISTANCES     = { '15': 15, '30': 30, '50': 50, '100': 100 };
	var DURATION_FALLBACKS_MS = { instant: 60, fast: 150, medium: 300, slow: 500, 'extra-slow': 800 };
	var EASING_TOKEN_KEYS     = [ 'default', 'ease-out', 'ease-in', 'spring', 'linear' ];
	var FALLBACK_EASING       = 'cubic-bezier(0.4, 0, 0.2, 1)';

	/**
	 * Build the WAAPI keyframe list for one effect.
	 *
	 * Only a start keyframe (offset 0) is named, except for filter and
	 * clip-path, whose functions do not interpolate to `none` — those also
	 * get an explicit end keyframe (offset 1). Every other property ends at
	 * the element's own value implicitly.
	 *
	 * @param {Object} effect             Entry from EFFECTS.
	 * @param {number} [distanceOverride] Resolved data-sgs-animation-distance, if set.
	 * @return {Array} One or two keyframe objects.
	 */
	function keyframes( effect, distanceOverride ) {
		var start = { offset: 0 };
		var end   = null;

		if ( 'opacity' in effect ) {
			start.opacity = effect.opacity;
		}

		if ( effect.axis ) {
			var distance = distanceOverride || effect.distance;
			var value    = effect.sign * distance;
			start.translate = effect.axis === 'y' ? ( '0 ' + value + 'px' ) : ( value + 'px 0' );
		}

		if ( 'scale' in effect ) {
			start.scale = String( effect.scale );
		}

		if ( 'rotate' in effect ) {
			start.rotate = effect.rotate + 'deg';
		}

		if ( effect.filter ) {
			start.filter = effect.filter;
			end = end || { offset: 1 };
			end.filter = effect.filterTo;
		}

		if ( effect.clipPath ) {
			start.clipPath = effect.clipPath;
			end = end || { offset: 1 };
			end.clipPath = effect.clipPathTo;
		}

		if ( effect.transform ) {
			start.transform = effect.transform;
		}

		return end ? [ start, end ] : [ start ];
	}

	/**
	 * Parse a computed theme duration token ("300ms" or "0.3s") to milliseconds.
	 *
	 * @param {string} raw Computed custom-property value.
	 * @return {number|null} Milliseconds, or null when unparseable.
	 */
	function parseDurationMs( raw ) {
		if ( ! raw ) {
			return null;
		}
		raw = raw.trim();
		var msMatch = raw.match( /^(-?[\d.]+)ms$/ );
		if ( msMatch ) {
			return parseFloat( msMatch[ 1 ] );
		}
		var sMatch = raw.match( /^(-?[\d.]+)s$/ );
		if ( sMatch ) {
			return parseFloat( sMatch[ 1 ] ) * 1000;
		}
		return null;
	}

	/**
	 * Resolve one element's timing: duration and easing from its theme
	 * tokens (bounce-in's own overshoot curve wins over any stored easing),
	 * delay from its data attribute plus an optional load-time stagger.
	 *
	 * @param {Element}     el        Target element.
	 * @param {Object}      effect    Entry from EFFECTS.
	 * @param {number|null} loadIndex Stagger index among elements in view at load, else null.
	 * @return {Object} { duration, easing, delay, fill }.
	 */
	function timing( el, effect, loadIndex ) {
		var rootStyle = globalThis.getComputedStyle( document.documentElement );

		var durationKey = el.dataset.sgsAnimationDuration || 'medium';
		var durationRaw = rootStyle.getPropertyValue( '--wp--custom--duration--' + durationKey );
		var duration    = parseDurationMs( durationRaw );
		if ( null === duration ) {
			duration = Object.prototype.hasOwnProperty.call( DURATION_FALLBACKS_MS, durationKey )
				? DURATION_FALLBACKS_MS[ durationKey ]
				: 300;
		}

		var easing;
		if ( effect.easing ) {
			easing = effect.easing;
		} else {
			var easingKey = el.dataset.sgsAnimationEasing || 'default';
			if ( EASING_TOKEN_KEYS.indexOf( easingKey ) !== -1 ) {
				var easingRaw = rootStyle.getPropertyValue( '--wp--custom--easing--' + easingKey ).trim();
				easing = easingRaw || FALLBACK_EASING;
			} else {
				// Raw value stored before the token migration — createAnimation()
				// wraps the animate() call so an invalid string falls back at
				// creation time instead of throwing.
				easing = easingKey;
			}
		}

		var baseDelay = Number.parseInt( el.dataset.sgsAnimationDelay || '0', 10 );
		var delay     = null === loadIndex ? baseDelay : baseDelay + loadIndex * 100;

		return { duration: duration, easing: easing, delay: delay, fill: 'backwards' };
	}

	/**
	 * Resolve data-sgs-animation-distance to a number, allow-listed to the
	 * four preset steps.
	 *
	 * @param {Element} el Target element.
	 * @return {number|undefined} Distance in px, or undefined to use the effect's own default.
	 */
	function resolveDistance( el ) {
		var raw = el.dataset.sgsAnimationDistance;
		return raw && Object.prototype.hasOwnProperty.call( ALLOWED_DISTANCES, raw )
			? ALLOWED_DISTANCES[ raw ]
			: undefined;
	}

	var createdAnimations = [];
	var animations        = new WeakMap();

	/**
	 * Create (but do not play) the WAAPI animation for one element.
	 *
	 * Wrapped so an invalid stored easing string (a TypeError from animate())
	 * falls back to the default curve rather than leaving the element
	 * un-animated. Registers a finish handler that releases the animation —
	 * a finished, fill:'backwards' animation holds nothing once it ends, so
	 * this only frees the references.
	 *
	 * @param {Element}     el        Target element.
	 * @param {number|null} loadIndex Stagger index among elements in view at load, else null.
	 * @return {Animation|null} The created animation, or null when the preset is unknown.
	 */
	function createAnimation( el, loadIndex ) {
		var effect = EFFECTS[ el.dataset.sgsAnimation ];
		if ( ! effect ) {
			return null;
		}

		var kf      = keyframes( effect, resolveDistance( el ) );
		var t       = timing( el, effect, loadIndex );
		var options = { duration: t.duration, easing: t.easing, delay: t.delay, fill: t.fill };

		var animation;
		try {
			animation = el.animate( kf, options );
		} catch ( timingError ) {
			options.easing = FALLBACK_EASING;
			animation = el.animate( kf, options );
		}

		createdAnimations.push( animation );
		animation.addEventListener( 'finish', function () {
			animation.cancel();
			animations.delete( el );
		} );

		return animation;
	}

	// Respect prefers-reduced-motion — create nothing, show everything.
	if ( globalThis.matchMedia && globalThis.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		elements.forEach( function ( el ) {
			el.classList.add( 'sgs-animated' );
		} );
		return;
	}

	if ( typeof Element.prototype.animate !== 'function' || typeof IntersectionObserver === 'undefined' ) {
		elements.forEach( function ( el ) {
			el.classList.add( 'sgs-animated' );
		} );
		return;
	}

	/**
	 * Check whether an element is currently within the viewport.
	 *
	 * Uses the same 15% threshold as the play IntersectionObserver so the
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
		// "Near" observer — creates the animation paused (fill:'backwards'
		// already paints the start pose) once an element comes within 200px
		// of the viewport, so nothing runs, or even exists, far down a long
		// page.
		var nearObserver = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( ! entry.isIntersecting ) {
						return;
					}
					const el = entry.target;
					if ( ! animations.get( el ) ) {
						const animation = createAnimation( el, null );
						if ( animation ) {
							animation.pause();
							animations.set( el, animation );
						}
					}
					nearObserver.unobserve( el );
				} );
			},
			{ threshold: 0, rootMargin: '200px 0px 200px 0px' }
		);

		// "Play" observer — plays the animation once 15% of the element is
		// in view. Creates it first on a fast scroll where the near observer
		// has not fired yet.
		var playObserver = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( ! entry.isIntersecting ) {
						return;
					}
					const el = entry.target;
					let animation = animations.get( el );
					if ( ! animation ) {
						animation = createAnimation( el, null );
					}
					if ( animation ) {
						animations.set( el, animation );
						animation.play();
					}
					el.classList.add( 'sgs-animated' );
					playObserver.unobserve( el );
					nearObserver.unobserve( el );
				} );
			},
			{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
		);

		// Elements already in the viewport on page load play at once — both
		// observers fire async and would otherwise miss them.
		const inViewOnLoad = [];
		elements.forEach( function ( el ) {
			if ( isInViewport( el ) ) {
				inViewOnLoad.push( el );
			} else {
				nearObserver.observe( el );
				playObserver.observe( el );
			}
		} );

		// Stagger already-visible elements by 100ms per index so they play
		// in sequence rather than all at once.
		inViewOnLoad.forEach( function ( el, index ) {
			const animation = createAnimation( el, index );
			if ( ! animation ) {
				return;
			}
			animations.set( el, animation );
			animation.play();
			el.classList.add( 'sgs-animated' );
		} );

		// Header failsafe — a header entrance hides the header until it
		// plays; if it is still paused (never came within 200px of view for
		// some reason) 3s after the observer started, finish it so the
		// header is never stuck hidden.
		globalThis.setTimeout( function () {
			document.querySelectorAll( '.sgs-site-header[data-sgs-animation]' ).forEach( function ( el ) {
				const animation = animations.get( el );
				if ( animation && 'paused' === animation.playState ) {
					animation.finish();
				}
			} );
		}, 3000 );

		// Never print a paused (hidden-pose) or mid-flight entrance.
		globalThis.addEventListener( 'beforeprint', function () {
			createdAnimations.forEach( function ( animation ) {
				if ( 'finished' !== animation.playState ) {
					animation.finish();
				}
			} );
		} );
	} catch ( observerError ) {
		// Observer construction failed (e.g. sandboxed iframe, feature-policy).
		// Reveal every element and release every animation already created.
		createdAnimations.forEach( function ( animation ) {
			if ( 'finished' !== animation.playState ) {
				animation.finish();
			}
		} );
		elements.forEach( function ( el ) {
			el.classList.add( 'sgs-animated' );
		} );

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
