/**
 * SGS entrance timing — when an entrance starts.
 *
 * Read by assets/js/animation-observer.js (enqueued as its dependency), which
 * plays the entrances. Everything here comes from data attributes written by
 * includes/animation-stagger.php (dynamic blocks) and
 * src/blocks/extensions/animation.js (static blocks), each set by a control
 * in the block editor's Animation panel:
 *
 *   data-sgs-animation-start            "load" plays the entrance on page load,
 *                                       whatever the block's position; absent
 *                                       waits for the block to scroll into view.
 *   data-sgs-animation-trigger          "Start when" — the entrance starts once
 *                                       1% of the block has passed a line this
 *                                       many % of the screen height above its
 *                                       bottom edge (0-50, default 6).
 *   data-sgs-animation-items            A block's own repeated items, which
 *                                       enter with its settings.
 */
( function () {
	'use strict';

	var DEFAULT_TRIGGER_PCT = 6;

	// Entrance settings an item inherits from its block (data-sgs-animation-items).
	var INHERITED = [
		'data-sgs-animation',
		'data-sgs-animation-delay',
		'data-sgs-animation-duration',
		'data-sgs-animation-easing',
		'data-sgs-animation-distance',
		'data-sgs-animation-start',
		'data-sgs-animation-trigger',
	];

	/**
	 * Read a whole-number data attribute, clamped; null when absent or not a number.
	 *
	 * @param {Element} el   Element.
	 * @param {string}  name Attribute name.
	 * @param {number}  min  Lowest value.
	 * @param {number}  max  Highest value.
	 * @return {number|null} The value, or null.
	 */
	function intAttr( el, name, min, max ) {
		var raw = el.getAttribute( name );
		if ( null === raw || ! /^\d+$/.test( raw ) ) {
			return null;
		}
		return Math.max( min, Math.min( max, parseInt( raw, 10 ) ) );
	}

	/**
	 * Hand a block's entrance to its own repeated items: each item takes the
	 * block's entrance settings, and the block itself no longer animates. An
	 * item that already has its own entrance keeps it.
	 *
	 * @param {ParentNode} root Where to look.
	 */
	function expandItems( root ) {
		root.querySelectorAll( '[data-sgs-animation-items][data-sgs-animation]' ).forEach( function ( owner ) {
			var found;
			try {
				found = owner.querySelectorAll( owner.getAttribute( 'data-sgs-animation-items' ) );
			} catch ( selectorError ) {
				return;
			}
			var items = Array.prototype.filter.call( found, function ( item ) {
				return item.parentElement.closest( '[data-sgs-animation-items]' ) === owner &&
					! item.hasAttribute( 'data-sgs-animation' );
			} );
			if ( ! items.length ) {
				return;
			}
			items.forEach( function ( item ) {
				INHERITED.forEach( function ( name ) {
					var value = owner.getAttribute( name );
					if ( null !== value ) {
						item.setAttribute( name, value );
					}
				} );
			} );
			INHERITED.forEach( function ( name ) {
				owner.removeAttribute( name );
			} );
		} );
	}

	/**
	 * Whether the block's entrance plays on page load rather than on scroll.
	 *
	 * @param {Element} el Animated element.
	 * @return {boolean} True when data-sgs-animation-start is "load".
	 */
	function startsOnLoad( el ) {
		return 'load' === el.getAttribute( 'data-sgs-animation-start' );
	}

	/**
	 * The block's "Start when" line, as a % of the screen height above its bottom edge.
	 *
	 * @param {Element} el Animated element.
	 * @return {number} 0-50.
	 */
	function triggerPct( el ) {
		var pct = intAttr( el, 'data-sgs-animation-trigger', 0, 50 );
		return null === pct ? DEFAULT_TRIGGER_PCT : pct;
	}

	/**
	 * IntersectionObserver options for a "Start when" line.
	 *
	 * @param {number} pct Trigger line, % above the bottom edge.
	 * @return {Object} Observer options.
	 */
	function observerOptions( pct ) {
		return { threshold: 0.01, rootMargin: '0px 0px -' + pct + '% 0px' };
	}

	/**
	 * Whether the block has already crossed its "Start when" line (checked at
	 * page load, when the observer has not reported yet).
	 *
	 * @param {Element} el Animated element.
	 * @return {boolean} True when 1% of it is above the line and on screen.
	 */
	function inTriggerZone( el ) {
		var rect = el.getBoundingClientRect();
		var vh   = globalThis.innerHeight || document.documentElement.clientHeight;
		var vw   = globalThis.innerWidth || document.documentElement.clientWidth;
		var line = vh * ( 1 - triggerPct( el ) / 100 );
		var h    = Math.min( rect.bottom, line ) - Math.max( rect.top, 0 );
		var w    = Math.min( rect.right, vw ) - Math.max( rect.left, 0 );
		if ( h <= 0 || w <= 0 ) {
			return false;
		}
		return rect.height <= 0 || h / rect.height >= 0.01;
	}

	globalThis.sgsEntranceTiming = {
		expandItems: expandItems,
		startsOnLoad: startsOnLoad,
		triggerPct: triggerPct,
		observerOptions: observerOptions,
		inTriggerZone: inTriggerZone,
	};
} )();
