/**
 * SGS entrance timing — when an entrance starts and how much it is staggered.
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
 *   data-sgs-animation-stagger          A block's own stagger step (ms) against
 *                                       matching animated blocks beside it
 *                                       (reaches cards in a repeated list whose
 *                                       parent is not an SGS block).
 *   data-sgs-animation-stagger-children A parent's stagger step (ms) for the
 *                                       animated blocks inside it.
 *   data-sgs-animation-stagger-max      Where the stagger stops growing (items,
 *                                       default 7).
 *   data-sgs-animation-items            A block's own repeated items, which
 *                                       enter one by one with its settings.
 *
 * A stagger adds position × step to the block's own delay, position counted
 * among the animated blocks in the same group and capped at the max. With no
 * stagger set anywhere, the observer keeps its automatic spacing for blocks
 * that arrive together, and only for blocks with no delay of their own.
 */
( function () {
	'use strict';

	var DEFAULT_TRIGGER_PCT = 6;
	var DEFAULT_STAGGER_MAX = 7;

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

	/**
	 * The nearest parent that staggers its children, unless another animated
	 * block sits between (that block's own children belong to it).
	 *
	 * @param {Element} el Animated element.
	 * @return {Element|null} The staggering parent, or null.
	 */
	function groupOwner( el ) {
		for ( var p = el.parentElement; p && p !== document.body; p = p.parentElement ) {
			if ( p.hasAttribute( 'data-sgs-animation-stagger-children' ) ) {
				return p;
			}
			if ( p.hasAttribute( 'data-sgs-animation' ) ) {
				return null;
			}
		}
		return null;
	}

	var members = new WeakMap();

	/**
	 * A staggering parent's animated blocks, in page order.
	 *
	 * @param {Element} owner Staggering parent.
	 * @return {Element[]} Its group.
	 */
	function groupOf( owner ) {
		if ( ! members.has( owner ) ) {
			members.set( owner, Array.prototype.filter.call(
				owner.querySelectorAll( '[data-sgs-animation]' ),
				function ( d ) {
					return groupOwner( d ) === owner;
				}
			) );
		}
		return members.get( owner );
	}

	/**
	 * A block's position among the matching blocks beside it: the first
	 * ancestor level (up to four) where two or more siblings hold a block with
	 * its own stagger step. Reaches past the wrapper each item of a repeated
	 * list sits in (a product template's <li>).
	 *
	 * @param {Element} el Animated element with its own stagger step.
	 * @return {number} 0-based position.
	 */
	function repeatIndex( el ) {
		var node = el;
		for ( var depth = 0; depth < 4 && node.parentElement; depth++ ) {
			var peers = Array.prototype.filter.call( node.parentElement.children, function ( c ) {
				return c.matches( '[data-sgs-animation-stagger]' ) || null !== c.querySelector( '[data-sgs-animation-stagger]' );
			} );
			if ( peers.length > 1 ) {
				return Math.max( 0, peers.indexOf( node ) );
			}
			node = node.parentElement;
		}
		return 0;
	}

	/**
	 * The stagger added to a block's own delay, or null when no stagger applies.
	 *
	 * @param {Element} el Animated element.
	 * @return {number|null} Milliseconds, or null.
	 */
	function staggerOffset( el ) {
		var step  = intAttr( el, 'data-sgs-animation-stagger', 0, 1000 );
		var index;
		var source = el;
		if ( null !== step ) {
			index = repeatIndex( el );
		} else {
			source = groupOwner( el );
			step   = source ? intAttr( source, 'data-sgs-animation-stagger-children', 0, 1000 ) : null;
			if ( null === step ) {
				return null;
			}
			index = Math.max( 0, groupOf( source ).indexOf( el ) );
		}
		var max = intAttr( source, 'data-sgs-animation-stagger-max', 1, 50 );
		return Math.min( index, null === max ? DEFAULT_STAGGER_MAX : max ) * step;
	}

	globalThis.sgsEntranceTiming = {
		expandItems: expandItems,
		startsOnLoad: startsOnLoad,
		triggerPct: triggerPct,
		observerOptions: observerOptions,
		inTriggerZone: inTriggerZone,
		staggerOffset: staggerOffset,
	};
} )();
