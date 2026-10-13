/**
 * SGS motion keyframes — multi-keyframe entrances played through the Web Animations API.
 *
 * The renderer (includes/motion/class-sgs-motion-emitter.php) marks an entrance target with
 * `data-sgs-me="<trigger> <channels>"` and, when the entrance stores more than two keyframes,
 * `data-sgs-me-keyframes`: a JSON array of frames, each `{ offset?: 0-1, "--sgs-me-<x>": "<css value>", … }`.
 * Duration, delay and easing sit in the scoped rule as `--sgs-me-dur`, `--sgs-me-delay` and `--sgs-me-ease`.
 *
 * Each frame animates the entrance's registered `--sgs-me-*` custom properties and also declares every channel
 * those properties feed with that channel's full composite formula (the same formulas as the `@keyframes
 * sgs-me-*` rules in assets/css/motion.css), so the channel exists only while the entrance runs, during its
 * backwards-filled delay, and falls back to the stylesheet when it ends. The animation is created with
 * `fill: 'backwards'` and the stored delay; nothing else computes a delay.
 *
 * A `load` entrance plays at once. Any other trigger plays when `data-sgs-in` is set on the element (by the
 * reveal module for scroll, or by the owning block for open and state). With reduced motion nothing plays.
 * The script writes no inline style; it only creates animations and marks the element with `data-sgs-me-kf`.
 */
( function () {
	'use strict';

	var DEFAULT_DURATION_MS = 750;
	var DEFAULT_EASING = 'ease-out';

	// Owner property -> channel (the `--sgs-me-*` rows of the §10 channel table).
	var PROPERTY_CHANNEL = {
		'--sgs-me-tx': 'translate',
		'--sgs-me-ty': 'translate',
		'--sgs-me-rot': 'rotate',
		'--sgs-me-s': 'scale',
		'--sgs-me-op': 'opacity',
		'--sgs-me-blur': 'filter',
		'--sgs-me-clip': 'clip-path',
	};

	// Channel -> [ CSS property, composite formula ]; identical to the formulas in assets/css/motion.css.
	var CHANNEL_FORMULA = {
		translate: [ 'translate', 'calc(var(--sgs-me-tx) + var(--sgs-mh-tx) + var(--sgs-mag-x) + var(--sgs-plx-x) + var(--sgs-float-x) + var(--sgs-kb-x)) calc(var(--sgs-me-ty) + var(--sgs-mh-ty) + var(--sgs-mag-y) + var(--sgs-plx-y) + var(--sgs-float-y) + var(--sgs-kb-y))' ],
		rotate: [ 'rotate', 'calc(var(--sgs-rot-rest) + var(--sgs-me-rot) + var(--sgs-mh-rot))' ],
		scale: [ 'scale', 'calc(var(--sgs-me-s) * var(--sgs-mh-s) * var(--sgs-focus-s) * var(--sgs-kb-s))' ],
		opacity: [ 'opacity', 'calc(var(--sgs-me-op) * var(--sgs-mh-op) * var(--sgs-focus-op))' ],
		filter: [ 'filter', 'blur(calc(var(--sgs-me-blur) + var(--sgs-mh-blur))) grayscale(var(--sgs-mh-gray)) brightness(var(--sgs-mh-bright))' ],
		'clip-path': [ 'clip-path', 'inset(var(--sgs-me-clip))' ],
	};

	/**
	 * Whether the visitor asked for reduced motion.
	 *
	 * @return {boolean} True when prefers-reduced-motion is reduce.
	 */
	function reducedMotion() {
		return !! ( globalThis.matchMedia && globalThis.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	}

	/**
	 * A CSS time ("300ms", "0.3s", "0") in milliseconds, or null when it is not a time.
	 *
	 * @param {string} raw CSS time.
	 * @return {number|null} Milliseconds, or null.
	 */
	function timeMs( raw ) {
		var m = /^\s*(-?\d*\.?\d+)\s*(ms|s)?\s*$/.exec( raw || '' );
		if ( ! m ) {
			return null;
		}
		var n = parseFloat( m[ 1 ] );
		return 's' === m[ 2 ] ? n * 1000 : n;
	}

	/**
	 * The stored keyframes as animate() frames: the owner properties plus each touched channel's formula.
	 *
	 * @param {string} json The data-sgs-me-keyframes value.
	 * @return {Object[]|null} Frames, or null when the JSON is not a list of at least two frames.
	 */
	function framesFrom( json ) {
		var list;
		try {
			list = JSON.parse( json );
		} catch ( parseError ) {
			return null;
		}
		if ( ! Array.isArray( list ) || list.length < 2 ) {
			return null;
		}
		var channels = {};
		list.forEach( function ( frame ) {
			Object.keys( frame || {} ).forEach( function ( key ) {
				if ( PROPERTY_CHANNEL[ key ] ) {
					channels[ PROPERTY_CHANNEL[ key ] ] = true;
				}
			} );
		} );
		return list.map( function ( frame ) {
			var out = {};
			Object.keys( frame || {} ).forEach( function ( key ) {
				if ( 'offset' === key || PROPERTY_CHANNEL[ key ] ) {
					out[ key ] = frame[ key ];
				}
			} );
			Object.keys( channels ).forEach( function ( channel ) {
				out[ CHANNEL_FORMULA[ channel ][ 0 ] ] = CHANNEL_FORMULA[ channel ][ 1 ];
			} );
			return out;
		} );
	}

	/**
	 * The entrance's timing from the scoped rule's custom properties.
	 *
	 * @param {Element} el Entrance target.
	 * @return {{duration: number, delay: number, easing: string}} Timing for animate().
	 */
	function timingOf( el ) {
		var cs = globalThis.getComputedStyle( el );
		var read = function ( name ) {
			return ( cs.getPropertyValue( name ) || '' ).trim();
		};
		var duration = timeMs( read( '--sgs-me-dur' ) );
		if ( null === duration ) {
			duration = timeMs( read( '--wp--custom--entrance--duration' ) );
		}
		var delay = timeMs( read( '--sgs-me-delay' ) );
		return {
			duration: null === duration ? DEFAULT_DURATION_MS : Math.max( 0, duration ),
			delay: null === delay ? 0 : delay,
			easing: read( '--sgs-me-ease' ) || read( '--wp--custom--entrance--easing' ) || DEFAULT_EASING,
		};
	}

	/**
	 * Play an element's multi-keyframe entrance once.
	 *
	 * @param {Element} el Element with data-sgs-me-keyframes.
	 * @return {Animation|null} The animation, or null when nothing played.
	 */
	function play( el ) {
		if ( reducedMotion() || 'function' !== typeof el.animate || el.hasAttribute( 'data-sgs-me-kf' ) ) {
			return null;
		}
		var frames = framesFrom( el.getAttribute( 'data-sgs-me-keyframes' ) );
		if ( ! frames ) {
			return null;
		}
		var timing = timingOf( el );
		var options = { duration: timing.duration, delay: timing.delay, easing: timing.easing, fill: 'backwards' };
		var animation;
		try {
			animation = el.animate( frames, options );
		} catch ( timingError ) {
			options.easing = DEFAULT_EASING;
			animation = el.animate( frames, options );
		}
		el.setAttribute( 'data-sgs-me-kf', 'played' );
		return animation;
	}

	/**
	 * Whether the entrance starts at page load rather than on a later signal.
	 *
	 * @param {Element} el Entrance target.
	 * @return {boolean} True for a load entrance.
	 */
	function startsOnLoad( el ) {
		return ( el.getAttribute( 'data-sgs-me' ) || '' ).split( /\s+/ ).indexOf( 'load' ) !== -1;
	}

	/**
	 * Wire every multi-keyframe entrance under a root: load entrances play now, the rest when data-sgs-in appears.
	 *
	 * @param {ParentNode} root Where to look.
	 * @return {MutationObserver|null} The observer waiting on signals, or null when nothing waits.
	 */
	function init( root ) {
		if ( reducedMotion() ) {
			return null;
		}
		var waiting = [];
		( root || document ).querySelectorAll( '[data-sgs-me][data-sgs-me-keyframes]' ).forEach( function ( el ) {
			if ( startsOnLoad( el ) || el.hasAttribute( 'data-sgs-in' ) ) {
				play( el );
			} else {
				waiting.push( el );
			}
		} );
		if ( ! waiting.length || 'function' !== typeof globalThis.MutationObserver ) {
			return null;
		}
		var observer = new globalThis.MutationObserver( function ( records ) {
			records.forEach( function ( record ) {
				if ( record.target.hasAttribute( 'data-sgs-in' ) ) {
					play( record.target );
				}
			} );
		} );
		waiting.forEach( function ( el ) {
			observer.observe( el, { attributes: true, attributeFilter: [ 'data-sgs-in' ] } );
		} );
		return observer;
	}

	var api = { init: init, play: play, framesFrom: framesFrom, timingOf: timingOf, CHANNEL_FORMULA: CHANNEL_FORMULA };
	globalThis.sgsMotionKeyframes = api;
	if ( 'undefined' !== typeof module && module.exports ) {
		module.exports = api;
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', function () {
			init( document );
		} );
	} else {
		init( document );
	}
} )();
