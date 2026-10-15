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
 * reveal module for scroll, or by the owning block for open and state). A `state` entrance also REPLAYS each time
 * its state token is added to `data-sgs-motion-state` on the target or an ancestor (by `@sgs/motion-state`'s
 * `setMotionState` or `pulseMotionState`; a pulse removes and re-adds the token, so a second failed submit replays the
 * shake). The target's state name is the renderer's `--sgs-mt-kf` custom property, set on the target itself
 * (includes/motion/class-sgs-motion-trigger-open-state.php). A replay cancels the target's previous animation first.
 * Entrances a block prints after load (a post-grid's load more) are wired when the block fires `sgs-motion:scan` on the
 * element holding them; a target already played is never played again, so a repeated scan plays nothing twice.
 * With reduced motion nothing plays, read at each play, so a mid-session change is honoured.
 * The script writes no inline style; it only creates animations and marks the element with `data-sgs-me-kf`.
 */
( function () {
	'use strict';

	var DEFAULT_DURATION_MS = 750;
	var DEFAULT_EASING = 'ease-out';
	var STATE_ATTR = 'data-sgs-motion-state';
	var STATE_PROP = '--sgs-mt-kf';
	var STATE_TARGETS = '[data-sgs-me~="state"][data-sgs-me-keyframes]';
	var TARGETS = '[data-sgs-me][data-sgs-me-keyframes]';

	// Target -> the animation this module last created on it, so a replay can cancel it.
	var running = typeof WeakMap === 'function' ? new WeakMap() : null;

	// Owner property -> channel (the `--sgs-me-*` rows of the §10 channel table).
	var PROPERTY_CHANNEL = {
		'--sgs-me-tx': 'translate',
		'--sgs-me-ty': 'translate',
		'--sgs-me-rot': 'rotate',
		'--sgs-me-rx': 'transform',
		'--sgs-me-ry': 'transform',
		'--sgs-me-s': 'scale',
		'--sgs-me-sx': 'scale',
		'--sgs-me-sy': 'scale',
		'--sgs-me-op': 'opacity',
		'--sgs-me-blur': 'filter',
		'--sgs-me-clip-t': 'clip-path',
		'--sgs-me-clip-r': 'clip-path',
		'--sgs-me-clip-b': 'clip-path',
		'--sgs-me-clip-l': 'clip-path',
	};

	// Plain input -> the owner properties it stands for: a keyframe's uniform clip amount (the schema's clip-path
	// `inputs`) is every edge's value, so it animates as the four registered edge owners.
	var INPUT_OWNERS = {
		'--sgs-me-clip': [ '--sgs-me-clip-t', '--sgs-me-clip-r', '--sgs-me-clip-b', '--sgs-me-clip-l' ],
	};

	// Channel -> [ CSS property, composite formula ]; identical to the formulas in assets/css/motion.css.
	var CHANNEL_FORMULA = {
		translate: [ 'translate', 'calc(var(--sgs-me-tx) + var(--sgs-mh-tx) + var(--sgs-mag-x) + var(--sgs-plx-x) + var(--sgs-float-x) + var(--sgs-kb-x)) calc(var(--sgs-me-ty) + var(--sgs-mh-ty) + var(--sgs-mag-y) + var(--sgs-plx-y) + var(--sgs-float-y) + var(--sgs-kb-y))' ],
		rotate: [ 'rotate', 'calc(var(--sgs-rot-rest) + var(--sgs-me-rot) + var(--sgs-mh-rot) + var(--sgs-svl-rot))' ],
		transform: [ 'transform', 'perspective(var(--sgs-persp-self)) rotateX(calc(var(--sgs-rx-rest) + var(--sgs-me-rx) + var(--sgs-mh-rx) + var(--sgs-tilt-x))) rotateY(calc(var(--sgs-ry-rest) + var(--sgs-me-ry) + var(--sgs-mh-ry) + var(--sgs-tilt-y)))' ],
		scale: [ 'scale', 'calc(var(--sgs-me-s) * var(--sgs-mh-s) * var(--sgs-focus-s) * var(--sgs-kb-s) * var(--sgs-svl-s) * var(--sgs-sp-x) * var(--sgs-me-sx)) calc(var(--sgs-me-s) * var(--sgs-mh-s) * var(--sgs-focus-s) * var(--sgs-kb-s) * var(--sgs-svl-s) * var(--sgs-sp-y) * var(--sgs-me-sy))' ],
		opacity: [ 'opacity', 'calc(var(--sgs-me-op) * var(--sgs-mh-op) * var(--sgs-focus-op) * var(--sgs-svl-op))' ],
		filter: [ 'filter', 'blur(calc(var(--sgs-me-blur) + var(--sgs-mh-blur))) grayscale(calc(var(--sgs-gray-rest) + var(--sgs-mh-gray))) brightness(var(--sgs-mh-bright))' ],
		'clip-path': [ 'clip-path', 'inset(var(--sgs-me-clip-t) var(--sgs-me-clip-r) var(--sgs-me-clip-b) var(--sgs-me-clip-l))' ],
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
				var owner = INPUT_OWNERS[ key ] ? INPUT_OWNERS[ key ][ 0 ] : key;
				if ( PROPERTY_CHANNEL[ owner ] ) {
					channels[ PROPERTY_CHANNEL[ owner ] ] = true;
				}
			} );
		} );
		return list.map( function ( frame ) {
			var out = {};
			Object.keys( frame || {} ).forEach( function ( key ) {
				if ( INPUT_OWNERS[ key ] ) {
					INPUT_OWNERS[ key ].forEach( function ( owner ) {
						out[ owner ] = frame[ key ];
					} );
				} else if ( 'offset' === key || PROPERTY_CHANNEL[ key ] ) {
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
		if ( running && animation ) {
			running.set( el, animation );
		}
		return animation;
	}

	/**
	 * Play an element's multi-keyframe entrance again, cancelling the run this module started before.
	 *
	 * @param {Element} el Element with data-sgs-me-keyframes.
	 * @return {Animation|null} The new animation, or null when nothing played.
	 */
	function replay( el ) {
		if ( reducedMotion() || 'function' !== typeof el.animate ) {
			return null;
		}
		var previous = running ? running.get( el ) : null;
		if ( previous && 'function' === typeof previous.cancel ) {
			previous.cancel();
		}
		el.removeAttribute( 'data-sgs-me-kf' );
		return play( el );
	}

	/**
	 * A state attribute value as a token list.
	 *
	 * @param {string|null} value Attribute value.
	 * @return {string[]} Tokens.
	 */
	function stateTokens( value ) {
		return ( value || '' ).split( /\s+/ ).filter( Boolean );
	}

	/**
	 * The state a multi-keyframe state entrance replays on, from its own `--sgs-mt-kf`.
	 *
	 * @param {Element} el Entrance target.
	 * @return {string} State name, or ''.
	 */
	function stateOf( el ) {
		return (
			globalThis.getComputedStyle( el ).getPropertyValue( STATE_PROP ) ||
			''
		).trim();
	}

	/**
	 * Replay the state entrances whose state token a batch of attribute changes added.
	 *
	 * Each record carries the value before its change; the value after it is the next record's old value for the same
	 * host, or the attribute now. A pulse is two records (token removed, token added), so the add is seen once.
	 *
	 * @param {MutationRecord[]} records Changes to data-sgs-motion-state.
	 * @param {Element[]}        targets Multi-keyframe state entrance targets.
	 * @return {number} How many replays started.
	 */
	function onStateChange( records, targets ) {
		var started = 0;
		records.forEach( function ( record, i ) {
			var host = record.target;
			var after = null;
			for ( var j = i + 1; j < records.length; j++ ) {
				if ( records[ j ].target === host ) {
					after = records[ j ].oldValue;
					break;
				}
			}
			if ( j >= records.length ) {
				after = host.getAttribute( STATE_ATTR );
			}
			var before = stateTokens( record.oldValue );
			var added = stateTokens( after ).filter( function ( name ) {
				return before.indexOf( name ) === -1;
			} );
			if ( ! added.length ) {
				return;
			}
			targets.forEach( function ( el ) {
				if (
					( el === host || host.contains( el ) ) &&
					added.indexOf( stateOf( el ) ) !== -1 &&
					replay( el )
				) {
					started++;
				}
			} );
		} );
		return started;
	}

	/**
	 * Watch the state attribute under a root for the multi-keyframe state entrances in it.
	 *
	 * @param {ParentNode} root Where to look.
	 * @return {MutationObserver|null} The observer, or null when there is no such entrance.
	 */
	function watchStates( root ) {
		var scope = root || document;
		var targets = Array.prototype.slice.call(
			scope.querySelectorAll( STATE_TARGETS )
		);
		if (
			! targets.length ||
			'function' !== typeof globalThis.MutationObserver
		) {
			return null;
		}
		var observer = new globalThis.MutationObserver( function ( records ) {
			onStateChange( records, targets );
		} );
		observer.observe( scope.documentElement || scope, {
			attributes: true,
			attributeFilter: [ STATE_ATTR ],
			attributeOldValue: true,
			subtree: true,
		} );
		return observer;
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
	 * Wire multi-keyframe entrances: load entrances play now, the rest when data-sgs-in appears (`play` marks a target
	 * `data-sgs-me-kf`, so a second scan of the same items plays nothing again).
	 *
	 * @param {Element[]} list Entrance targets.
	 * @return {MutationObserver|null} The observer waiting on signals, or null when nothing waits.
	 */
	function wire( list ) {
		if ( reducedMotion() ) {
			return null;
		}
		var waiting = [];
		list.forEach( function ( el ) {
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

	/**
	 * Wire every multi-keyframe entrance under a root.
	 *
	 * @param {ParentNode} root Where to look.
	 * @return {MutationObserver|null} The observer waiting on signals, or null when nothing waits.
	 */
	function init( root ) {
		if ( reducedMotion() ) {
			return null;
		}
		watchStates( root );
		return wire( Array.prototype.slice.call( ( root || document ).querySelectorAll( TARGETS ) ) );
	}

	/**
	 * Wire the entrances a block printed after load, when it fires `sgs-motion:scan` on the element holding them
	 * (a post-grid's load more, Spec 38A §8).
	 *
	 * @param {Event} event The scan event; its target holds the new items.
	 * @return {MutationObserver|null} The observer waiting on signals, or null when nothing waits.
	 */
	function onScan( event ) {
		var host = event && event.target;
		if ( ! host || 'function' !== typeof host.querySelectorAll ) {
			return null;
		}
		var list = Array.prototype.slice.call( host.querySelectorAll( TARGETS ) );
		if ( 'function' === typeof host.matches && host.matches( TARGETS ) ) {
			list.unshift( host );
		}
		return wire( list );
	}

	var api = {
		init: init,
		wire: wire,
		onScan: onScan,
		play: play,
		replay: replay,
		watchStates: watchStates,
		onStateChange: onStateChange,
		framesFrom: framesFrom,
		timingOf: timingOf,
		CHANNEL_FORMULA: CHANNEL_FORMULA,
	};
	globalThis.sgsMotionKeyframes = api;
	if ( 'undefined' !== typeof module && module.exports ) {
		module.exports = api;
	}
	document.addEventListener( 'sgs-motion:scan', onScan );

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', function () {
			init( document );
		} );
	} else {
		init( document );
	}
} )();
