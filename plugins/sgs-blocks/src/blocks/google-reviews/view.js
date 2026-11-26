/**
 * Google Reviews — Frontend Interactivity
 *
 * Slider autoplay and discrete navigation (arrows + dots) for the slider variant. The arrows and dots are drawn by the
 * shared slider navigation (includes/helpers-slider-nav.php) and the movement is the shared carousel runtime
 * (`src/shared/carousel`): this file only names the block's own classes, reads its cards-per-click setting and binds the
 * runtime to the block's Interactivity actions, because the root already carries `data-wp-interactive`,
 * `data-wp-context` and `data-wp-init` for autoplay. The dots exist only when the block's `pagination` is `dots`; with
 * `scrollbar` or `none` no dot sync runs at all.
 *
 * The active-dot state is applied straight to the DOM (a scroll-position read has no reactive state to bind to).
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import {
	SCROLL_EPSILON,
	activeIndexByMidpoint,
	atEnd,
	createAutoplay,
	prefersReducedMotion,
	realItems,
	scrollToItem,
	syncDots,
	targetIndex,
} from '../../shared/carousel/index.js';

const ITEM = '.sgs-google-reviews__review';
const DOT = '.sgs-google-reviews__dot';

// rAF handles keyed per scroller element, so rapid scroll events collapse to one active-dot recompute per frame.
const scrollRafByList = new WeakMap();

/**
 * The slider's scroll list and its real review slides (loop clones left out) for a block root.
 *
 * @param {Element} root `.sgs-google-reviews` root element.
 * @return {{list: Element|null, items: Element[]}} The list element and its items.
 */
function getSliderEls( root ) {
	const list = root.querySelector( '.sgs-google-reviews__list' );
	return { list, items: realItems( list, ITEM ) };
}

/**
 * Cards per arrow click for the current viewport (the block's arrowStep setting). render.php resolves each device tier
 * (inheriting down) and passes the framework's breakpoints alongside, so the choice matches the CSS tiers exactly. Read at
 * click time: a resize or rotation between clicks takes effect on the next one.
 *
 * @param {Object} ctx The block's interactivity context.
 * @return {number} Whole cards to move, at least 1.
 */
function arrowStep( ctx ) {
	const step = ctx?.arrowStep;
	if ( ! step ) {
		return 1;
	}
	const width = window.innerWidth;
	let tier = step.desktop;
	if ( width <= step.mobileMax ) {
		tier = step.mobile;
	} else if ( width <= step.tabletMax ) {
		tier = step.tablet;
	}
	return Math.max( 1, parseInt( tier, 10 ) || 1 );
}

/**
 * Apply the active dot for the slider's current scroll position, and reflect it to assistive tech through `aria-current`
 * as well as the class (never by colour alone).
 *
 * @param {Element} root `.sgs-google-reviews` root element.
 */
function updateActiveDot( root ) {
	const { list, items } = getSliderEls( root );
	const dots = root.querySelectorAll( DOT );
	if ( ! list || ! dots.length ) {
		return;
	}
	syncDots( dots, activeIndexByMidpoint( list, items ), {
		activeClass: 'is-active',
		ariaCurrent: true,
	} );
}

/**
 * Find the block root for an element that received an Interactivity action.
 *
 * @param {Element} el Any descendant of `.sgs-google-reviews`.
 * @return {Element|null} The block root, or null if not found.
 */
function findRoot( el ) {
	return el ? el.closest( '.sgs-google-reviews' ) : null;
}

/**
 * Step the slider one press in a direction, wrapping from the last card to the first and back. The first item past the
 * scroll position, not a remembered index, is the target; with looping on the loop module's clones are not items, so
 * reaching the end of the real items is the wrap point (WCAG 2.5.7: the arrow never dead-ends).
 *
 * @param {Element} root `.sgs-google-reviews` root element.
 * @param {number}  dir  1 for next, -1 for previous.
 */
function step( root, dir ) {
	const { list, items } = getSliderEls( root );
	if ( ! list || items.length < 2 ) {
		return;
	}
	const first = items[ 0 ];
	const last = items[ items.length - 1 ];
	if ( dir > 0 && atEnd( list ) ) {
		scrollToItem( list, first );
		return;
	}
	if ( dir < 0 && list.scrollLeft <= SCROLL_EPSILON ) {
		scrollToItem( list, last );
		return;
	}
	const index = targetIndex( list, items, dir, arrowStep( getContext() ) );
	if ( index === -1 ) {
		scrollToItem( list, dir > 0 ? first : last );
		return;
	}
	scrollToItem( list, items[ index ] );
}

store( 'sgs/google-reviews', {
	actions: {
		/**
		 * Step the slider back one review, wrapping from the first to the
		 * last (matches the looping-carousel convention used elsewhere in
		 * the framework, e.g. sgs/trustpilot-reviews).
		 */
		prevSlide() {
			const root = findRoot( getElement().ref );
			if ( root ) {
				step( root, -1 );
			}
		},

		/**
		 * Step the slider forward one review, wrapping from the last to the
		 * first.
		 */
		nextSlide() {
			const root = findRoot( getElement().ref );
			if ( root ) {
				step( root, 1 );
			}
		},

		/**
		 * Jump directly to the review matching the clicked dot's
		 * `data-sgs-index`.
		 */
		goToSlide() {
			const { ref } = getElement();
			const root = findRoot( ref );
			const index = parseInt( ref.getAttribute( 'data-sgs-index' ), 10 );
			if ( ! root || Number.isNaN( index ) ) {
				return;
			}
			const { list, items } = getSliderEls( root );
			if ( list && items.length ) {
				scrollToItem(
					list,
					items[ Math.max( 0, Math.min( index, items.length - 1 ) ) ]
				);
			}
		},

		/**
		 * `data-wp-on--scroll` handler on the list — keeps the active dot in
		 * sync when the visitor drags/swipes the slider directly, not just
		 * when they use the arrows/dots. rAF-throttled per list element.
		 */
		syncActiveDot() {
			const { ref } = getElement();
			const root = findRoot( ref );
			if ( ! root ) {
				return;
			}
			const { list } = getSliderEls( root );
			if ( ! list ) {
				return;
			}
			if ( scrollRafByList.has( list ) ) {
				cancelAnimationFrame( scrollRafByList.get( list ) );
			}
			scrollRafByList.set(
				list,
				requestAnimationFrame( () => updateActiveDot( root ) )
			);
		},
	},

	callbacks: {
		/**
		 * Initialise slider on mount: sets the initial active dot, then
		 * (unchanged behaviour) starts autoplay when enabled.
		 */
		init() {
			const ctx = getContext();
			const element = getElement();
			const root = element.ref;

			const slider = root.querySelector( '.sgs-google-reviews__list' );
			if ( ! slider ) {
				return;
			}

			// Set the correct active dot for the initial scroll position
			// (e.g. RTL locales or a non-zero scroll restore) even when
			// autoplay is off. Only when there are dots: the scrollbar and
			// `none` indicators have nothing to keep in step.
			const hasDots = !! root.querySelector( '.sgs-google-reviews__dot' );
			if ( hasDots ) {
				updateActiveDot( root );
			}

			if ( ! ctx.autoplay ) {
				return;
			}

			const reviews = realItems( slider, ITEM );
			if ( reviews.length <= 1 || prefersReducedMotion() ) {
				return; // Nothing to slide, or the visitor asked for no motion (WCAG 2.3.3).
			}

			// WCAG 2.2.2 through the shared runtime: the server-rendered pause / play button holds a pause until pressed
			// again; hover, a finger press and keyboard focus (on the arrows and dots too) pause it while they last, each
			// independently. One interval at a time, resuming from where it stopped after a pause.
			createAutoplay( root, {
				speed: parseInt( ctx.autoplaySpeed, 10 ),
				tick: () => {
					// Step on from where the slider is now, not from a count of our own, so a visitor who scrolled by hand
					// is not sent back; wrap to the first review at the end of the track.
					const next = atEnd( slider )
						? 0
						: ( activeIndexByMidpoint( slider, reviews ) + 1 ) %
						  reviews.length;
					scrollToItem( slider, reviews[ next ] );
					if ( hasDots ) {
						updateActiveDot( root );
					}
				},
			} ).start();
		},
	},
} );
