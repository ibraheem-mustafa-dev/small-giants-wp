/**
 * The shared carousel runtime: arrows, dots, keyboard, loop and autoplay for a block whose slides sit in one
 * horizontally scrolling track (CSS scroll-snap does the snapping; this only moves the scroll position and keeps the
 * controls in step with it).
 *
 * Two layers, both used by the blocks that draw a carousel (`sgs/google-reviews`, `sgs/trustpilot-reviews`,
 * `sgs/post-grid`):
 *   - Primitives that take a track and its items and hold no state (`realItems`, `targetIndex`, `scrollToItem`, `syncDots`,
 *     `activeIndexByMidpoint`, `nearestIndex`, `scrollSettings`, `cardStep`). A block that drives the controls through
 *     another runtime (google-reviews calls them from its Interactivity store actions) uses these directly.
 *   - `createCarousel`, which wires a whole block from one options object.
 *
 * Looping (Spec 38 §11 loop FR): when the track carries `data-sgs-loop="1"`, `fx-carousel-loop.js` has cloned every item to
 * both ends and marks each clone `data-sgs-loop-clone`. Every count and position below reads only the real items
 * (`realItems`), and a looping arrow press scrolls one card (clones make it seamless), so a loop has no last item and no
 * arrow ever disables (WCAG 2.5.7).
 *
 * Autoplay pausing (WCAG 2.2.2) goes through `shared/motion-pause`: the server-rendered pause button holds a pause until
 * pressed again; hover, a finger press and keyboard focus pause it while they last. Reduced motion is read fresh on every
 * call (the setting can change while the page is open) and stops autoplay from starting.
 *
 * Markup is not built here: the arrows and dots are server-rendered (`includes/helpers-slider-nav.php`, or the block's own
 * list for a block not on that layer yet), styled by the button kit and the carousel dots kit, and found by selector.
 * `buildDots` is the one exception, for a block that prints an empty dots row and leaves the buttons to the script.
 *
 * @package SGS\Blocks
 */

import { initMotionPause } from '../motion-pause/index.js';
import { layoutBox } from '../layout-box.js';

/** Pixels of tolerance when a scroll position is compared with an item's offset or the scroll limits. */
export const SCROLL_EPSILON = 4;

/** Selector fragment that leaves out the clones the loop module adds. */
const REAL = ':not([data-sgs-loop-clone])';

/**
 * Whether the visitor asked for reduced motion, read fresh on every call.
 *
 * @return {boolean} True when `prefers-reduced-motion: reduce` is active.
 */
export function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/**
 * The `behavior` a scroll call takes now: smooth unless the visitor asked for reduced motion. The key is the DOM API's own
 * spelling (`behavior`); `behaviour` is silently discarded by the browser.
 *
 * @return {'auto'|'smooth'} The scroll behaviour.
 */
export function scrollSettings() {
	return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Whether the loop module is attached to this track.
 *
 * @param {Element} track The scrolling track.
 * @return {boolean} True when the track carries `data-sgs-loop="1"`.
 */
export function isLooping( track ) {
	return !! track && track.dataset?.sgsLoop === '1';
}

/**
 * The track's real items, in order, clones left out.
 *
 * @param {Element} track        The scrolling track.
 * @param {string}  itemSelector Selector of one item (for example `.sgs-post-grid__card`).
 * @return {Element[]} The items.
 */
export function realItems( track, itemSelector ) {
	return track
		? Array.from( track.querySelectorAll( itemSelector + REAL ) )
		: [];
}

/**
 * The largest scrollLeft the track reaches.
 *
 * @param {Element} track The scrolling track.
 * @return {number} Maximum scrollLeft.
 */
export function maxScrollLeft( track ) {
	return Math.max( 0, track.scrollWidth - track.clientWidth );
}

/**
 * @param {Element} track The scrolling track.
 * @return {boolean} True when the track sits at its start.
 */
export function atStart( track ) {
	return track.scrollLeft <= SCROLL_EPSILON;
}

/**
 * @param {Element} track The scrolling track.
 * @return {boolean} True when the track sits at its end.
 */
export function atEnd( track ) {
	return track.scrollLeft >= maxScrollLeft( track ) - SCROLL_EPSILON;
}

/**
 * One card's width plus the gap, in layout pixels: how far a looping arrow press scrolls.
 *
 * @param {Element}   track The scrolling track.
 * @param {Element[]} items The real items.
 * @return {number} Pixels per card.
 */
export function cardStep( track, items ) {
	const style = getComputedStyle( track );
	const gap = parseFloat( style.columnGap || style.gap || 16 );
	return layoutBox( items[ 0 ] ).width + ( Number.isNaN( gap ) ? 0 : gap );
}

/**
 * Where an item starts, measured from the start of the track's scrollable content (the `scrollLeft` that would put the item at
 * the track's left edge). Every position in this module is measured this one way, from bounding rectangles, so a track that is
 * inset in a positioned wrapper (arrows beside the list) reads the same as one that is its own offset parent; `offsetLeft` would
 * be relative to whichever ancestor is positioned.
 *
 * @param {Element} track The scrolling track.
 * @param {Element} item  An item in the track.
 * @return {number} The item's offset in scroll coordinates.
 */
export function itemOffset( track, item ) {
	return (
		item.getBoundingClientRect().left -
		track.getBoundingClientRect().left -
		( track.clientLeft || 0 ) +
		track.scrollLeft
	);
}

/**
 * The item an arrow press should land on, from where the track is scrolled now (not from a remembered index, so a drag,
 * a swipe or a native scroll never leaves the arrows stale).
 *
 * @param {Element}   track The scrolling track.
 * @param {Element[]} items The real items.
 * @param {number}    dir   1 for next, -1 for previous.
 * @param {number}    cards Cards per press (at least 1).
 * @return {number} The item index, or -1 when there is no item in that direction (the end of the track).
 */
export function targetIndex( track, items, dir, cards = 1 ) {
	const extra = Math.max( 1, cards ) - 1;
	let found = -1;
	if ( dir > 0 ) {
		items.forEach( ( item, i ) => {
			if (
				itemOffset( track, item ) > track.scrollLeft + SCROLL_EPSILON &&
				( found === -1 || i < found )
			) {
				found = i;
			}
		} );
		return found === -1 ? -1 : Math.min( items.length - 1, found + extra );
	}
	items.forEach( ( item, i ) => {
		if ( itemOffset( track, item ) < track.scrollLeft - SCROLL_EPSILON ) {
			found = i;
		}
	} );
	return found === -1 ? -1 : Math.max( 0, found - extra );
}

/**
 * Scroll the track so an item sits at its start.
 *
 * @param {Element} track The scrolling track.
 * @param {Element} item  The item to show.
 * @param {string}  mode  `track` scrolls the track to the item's offset inside it; `view` asks the browser to bring the item
 *                        to the start of the track (`scrollIntoView`, which also respects the item's scroll-margin).
 */
export function scrollToItem( track, item, mode = 'track' ) {
	const behavior = scrollSettings();
	if ( 'view' === mode ) {
		item.scrollIntoView( { behavior, block: 'nearest', inline: 'start' } );
		return;
	}
	track.scrollTo( { left: itemOffset( track, item ), behavior } );
}

/**
 * The index of the last item that starts left of the track's middle: the item the visitor is looking at.
 *
 * @param {Element}   track The scrolling track.
 * @param {Element[]} items The real items.
 * @return {number} The index.
 */
export function activeIndexByMidpoint( track, items ) {
	const trackRect = track.getBoundingClientRect();
	let active = 0;
	items.forEach( ( item, i ) => {
		if (
			item.getBoundingClientRect().left - trackRect.left <
			trackRect.width / 2
		) {
			active = i;
		}
	} );
	return active;
}

/**
 * The index of the item whose start is nearest the scroll position (agrees with `scroll-snap-align: start`).
 *
 * @param {Element}   track The scrolling track.
 * @param {Element[]} items The real items.
 * @return {number} The index.
 */
export function nearestIndex( track, items ) {
	let nearest = 0;
	let min = Infinity;
	items.forEach( ( item, i ) => {
		const distance = Math.abs(
			itemOffset( track, item ) - track.scrollLeft
		);
		if ( distance < min ) {
			min = distance;
			nearest = i;
		}
	} );
	return nearest;
}

/**
 * Mark one dot current and every other not current, for sight (class) and for assistive technology (`aria-selected`, and
 * `aria-current` when the block uses it), never by colour alone.
 *
 * @param {Element[]|NodeList} dots                 The dot buttons.
 * @param {number}             index                The current item's index.
 * @param {Object}             [options]
 * @param {string}             [options.activeClass] Class on the current dot.
 * @param {boolean}            [options.ariaCurrent] Also set `aria-current="true"` on the current dot.
 */
export function syncDots( dots, index, options = {} ) {
	const activeClass = options.activeClass || 'is-active';
	Array.from( dots ).forEach( ( dot, i ) => {
		const active = i === index;
		dot.classList.toggle( activeClass, active );
		dot.setAttribute( 'aria-selected', active ? 'true' : 'false' );
		if ( options.ariaCurrent ) {
			if ( active ) {
				dot.setAttribute( 'aria-current', 'true' );
			} else {
				dot.removeAttribute( 'aria-current' );
			}
		}
	} );
}

/**
 * Autoplay on the shared pause runtime: one interval at a time, never under reduced motion, paused while the visitor holds
 * the pointer or keyboard focus on the region or presses the pause button, and resumed from where it stopped.
 *
 * @param {Element}  root                The region the pause is read on (the block root).
 * @param {Object}   options
 * @param {number}   options.speed       Milliseconds between steps (default 5000).
 * @param {Function} options.tick        Called each step.
 * @param {Function} [options.enabled]   `() => boolean`: false when there is nothing to move (fewer than two items).
 * @return {{start: Function, stop: Function, restart: Function}|null} The clock, or null under reduced motion or with nothing to move.
 */
export function createAutoplay( root, { speed, tick, enabled = () => true } ) {
	if ( prefersReducedMotion() || ! enabled() ) {
		return { start() {}, stop() {}, restart() {} };
	}
	let timer = null;
	let pauser = null;
	const stop = () => {
		clearInterval( timer );
		timer = null;
	};
	const start = () => {
		if ( ! pauser || pauser.isPaused() ) {
			return;
		}
		stop();
		timer = setInterval( tick, speed || 5000 );
	};
	pauser = initMotionPause( root, {
		onChange: ( paused ) => ( paused ? stop() : start() ),
	} );
	pauser.setRunning( true );
	return {
		start,
		stop,
		restart() {
			stop();
			start();
		},
	};
}

/**
 * Wire one carousel.
 *
 * @param {Object}      options
 * @param {Element}     options.root                     The block's root: autoplay pause (hover, press, focus, the pause button) is read here.
 * @param {Element}     options.track                    The scrolling track.
 * @param {string}      options.itemSelector             Selector of one item inside the track.
 * @param {Element}     [options.prev]                   Previous arrow.
 * @param {Element}     [options.next]                   Next arrow.
 * @param {Element[]}   [options.dots]                   Dot buttons already in the page (one per item).
 * @param {Object}      [options.buildDots]              Build the dots instead: `{ host, className, activeClass, label }`, where `label( number )` names a dot.
 * @param {string}      [options.dotActiveClass]         Class on the current dot. Default `is-active`.
 * @param {boolean}     [options.dotAriaCurrent]         Also mark the current dot with `aria-current`.
 * @param {string}      [options.dotScroll]              `track` (default) or `view`: how a dot or arrow scrolls an item into place (`scrollToItem`).
 * @param {string}      [options.activeBy]               `midpoint` (default) or `nearest`: how the current item is read from the scroll position.
 * @param {string}      [options.edge]                   What an arrow does at either end of a track that does not loop: `clamp` (default) or `wrap` to the other end.
 * @param {string}      [options.moveBy]                 `item` (default): an arrow lands on the next item from the scroll position; `card`: an arrow scrolls one card width plus the gap and stops at either end.
 * @param {boolean}     [options.disableAtEnds]          Disable an arrow at its end of a track that does not loop.
 * @param {Function}    [options.cards]                  `() => n`: cards per arrow press (default 1), read at press time.
 * @param {boolean}     [options.keyboard]               Left and right arrow keys on the track move it.
 * @param {Object|null} [options.autoplay]               `{ speed, wrap }`: advance every `speed` ms; `wrap` steps by item index and returns to the first item after the last, and a track that does not loop returns to the first item at its end either way. Omit for none.
 * @param {boolean}     [options.restartAutoplayOnInput] Restart the autoplay clock after an arrow, dot or key press.
 * @return {{items: Function, move: Function, goTo: Function, sync: Function}|null} The controller, or null when there is nothing to move.
 */
export function createCarousel( options ) {
	const {
		root,
		track,
		itemSelector,
		prev = null,
		next = null,
		dotActiveClass = 'is-active',
		dotAriaCurrent = false,
		dotScroll = 'track',
		activeBy = 'midpoint',
		edge = 'clamp',
		moveBy = 'item',
		disableAtEnds = false,
		cards = () => 1,
		keyboard = false,
		autoplay = null,
		restartAutoplayOnInput = false,
	} = options;
	if ( ! root || ! track ) {
		return null;
	}
	const items = () => realItems( track, itemSelector );
	if ( ! items().length ) {
		return null;
	}

	const dots = Array.from( options.dots || [] );
	if ( options.buildDots?.host ) {
		const build = options.buildDots;
		items().forEach( ( _item, i ) => {
			const dot = document.createElement( 'button' );
			dot.type = 'button';
			dot.className = build.className;
			dot.setAttribute( 'role', 'tab' );
			dot.setAttribute( 'aria-label', build.label( i + 1 ) );
			build.host.appendChild( dot );
			dots.push( dot );
		} );
	}
	const activeClass = options.buildDots?.activeClass || dotActiveClass;

	const currentIndex = () =>
		'nearest' === activeBy
			? nearestIndex( track, items() )
			: activeIndexByMidpoint( track, items() );

	const sync = () => {
		syncDots( dots, currentIndex(), {
			activeClass,
			ariaCurrent: dotAriaCurrent,
		} );
		if ( disableAtEnds ) {
			const loops = isLooping( track );
			if ( prev ) {
				prev.disabled = ! loops && atStart( track );
			}
			if ( next ) {
				next.disabled = ! loops && atEnd( track );
			}
		}
	};

	const goTo = ( index ) => {
		const list = items();
		const item = list[ Math.max( 0, Math.min( index, list.length - 1 ) ) ];
		if ( item ) {
			scrollToItem( track, item, dotScroll );
		}
	};

	const move = ( dir ) => {
		const list = items();
		if ( ! list.length ) {
			return;
		}
		const looping = isLooping( track );
		if ( 'card' === moveBy || looping ) {
			if (
				! looping &&
				( ( dir > 0 && atEnd( track ) ) ||
					( dir < 0 && atStart( track ) ) )
			) {
				return;
			}
			track.scrollBy( {
				left: dir * cardStep( track, list ) * Math.max( 1, cards() ),
				behavior: scrollSettings(),
			} );
			return;
		}
		const index = targetIndex( track, list, dir, cards() );
		if ( index !== -1 ) {
			goTo( index );
		} else if ( 'wrap' === edge ) {
			goTo( dir > 0 ? 0 : list.length - 1 );
		}
	};

	const clock = autoplay
		? createAutoplay( root, {
				speed: autoplay.speed,
				tick: () => {
					// A track that does not loop and sits at its end goes back to the first item: a clock that
					// stopped at the end would still read as playing while nothing moved.
					if ( ! isLooping( track ) && atEnd( track ) ) {
						goTo( 0 );
					} else if ( autoplay.wrap ) {
						const list = items();
						const i = currentIndex();
						goTo( i + 1 >= list.length ? 0 : i + 1 );
					} else {
						move( 1 );
					}
				},
				enabled: () => items().length > 1,
		  } )
		: null;
	const input = () => {
		if ( restartAutoplayOnInput && clock ) {
			clock.restart();
		}
	};

	if ( prev ) {
		prev.addEventListener( 'click', () => {
			move( -1 );
			input();
		} );
	}
	if ( next ) {
		next.addEventListener( 'click', () => {
			move( 1 );
			input();
		} );
	}
	dots.forEach( ( dot, i ) => {
		dot.addEventListener( 'click', () => {
			goTo( i );
			input();
		} );
	} );
	if ( keyboard ) {
		track.addEventListener( 'keydown', ( event ) => {
			if ( 'ArrowLeft' === event.key || 'ArrowRight' === event.key ) {
				event.preventDefault();
				move( 'ArrowLeft' === event.key ? -1 : 1 );
				input();
			}
		} );
	}

	// One sync per frame however the scroll got there: an arrow, a dot, a drag, a swipe or the wheel.
	let frame = null;
	track.addEventListener(
		'scroll',
		() => {
			if ( null !== frame ) {
				return;
			}
			frame = requestAnimationFrame( () => {
				frame = null;
				sync();
			} );
		},
		{ passive: true }
	);

	sync();
	clock?.start();

	return { items, move, goTo, sync };
}
