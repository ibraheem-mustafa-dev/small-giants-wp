/**
 * Google Reviews — Frontend Interactivity
 *
 * Handles slider autoplay and discrete navigation (arrows + dots) for the
 * slider variant. Mirrors sgs/trustpilot-reviews's carousel mechanics
 * (scroll-position wrap, rAF-throttled active-dot sync) but implemented as
 * imperative DOM helpers called FROM WP Interactivity API actions, rather
 * than a second plain-DOM `DOMContentLoaded` listener — this block already
 * carries `data-wp-interactive`/`data-wp-context`/`data-wp-init` on its root
 * (set in render.php for the existing autoplay callback), so extending that
 * one store keeps a single init/wiring path instead of two competing
 * paradigms on the same markup.
 *
 * The active-dot / arrow-enabled state is NOT driven through reactive
 * `data-wp-bind--*` directives: syncing "which card is centred" needs a
 * scroll-position read (`getBoundingClientRect`), which has no reactive
 * state to bind to — it has to be measured on scroll, same as the existing
 * autoplay callback measures `offsetLeft` imperatively. Dot/class updates
 * are therefore applied directly to the DOM inside the action, exactly as
 * the pre-existing `init()` callback already does for autoplay.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const SCROLL_EPSILON = 4; // px tolerance when comparing scroll positions.

// rAF handles keyed per scroller element, so rapid scroll events collapse to
// one active-dot recompute per frame (mirrors trustpilot-reviews/view.js).
const scrollRafByList = new WeakMap();

/**
 * Read the slider's scroll list + its review "slides" for a given block root.
 *
 * @param {Element} root `.sgs-google-reviews` root element.
 * @return {{list: Element|null, items: Element[]}} The list element + its items.
 */
function getSliderEls( root ) {
	const list = root.querySelector( '.sgs-google-reviews__list' );
	/*
	 * `:not([data-sgs-loop-clone])` — the a11y contract `fx-carousel-loop.js`
	 * (Spec 38 §11 loop FR) documents in its own docblock: when looping is on
	 * that module clones every item to both ends of the track and marks each
	 * clone `data-sgs-loop-clone="true"`. Without this filter every index/
	 * offset/scroll calculation below would count the clones too, and the
	 * active dot could light against a clone rather than the real card it
	 * doubles. No-op when looping is off — there are no clones to exclude.
	 */
	const items = list
		? Array.from(
				list.querySelectorAll(
					'.sgs-google-reviews__review:not([data-sgs-loop-clone])'
				)
		  )
		: [];
	return { list, items };
}

/**
 * Maximum scrollLeft value for a horizontally-scrolling list.
 *
 * @param {Element} list The scrolling list element.
 * @return {number} Maximum scrollLeft.
 */
function maxScrollLeft( list ) {
	return Math.max( 0, list.scrollWidth - list.clientWidth );
}

/**
 * Smooth-scroll a slider's list so the item at `index` is at its start.
 *
 * @param {Element} root  `.sgs-google-reviews` root element.
 * @param {number}  index Target item index (clamped to the valid range).
 */
function scrollToItem( root, index ) {
	const { list, items } = getSliderEls( root );
	if ( ! list || ! items.length ) {
		return;
	}
	const clamped = Math.max( 0, Math.min( index, items.length - 1 ) );
	list.scrollTo( {
		left: items[ clamped ].offsetLeft - list.offsetLeft,
		behavior: 'smooth',
	} );
}

/**
 * Recompute + apply the active dot for a slider based on current scroll
 * position, and reflect it to assistive tech via `aria-current` (never by
 * colour alone).
 *
 * @param {Element} root `.sgs-google-reviews` root element.
 */
function updateActiveDot( root ) {
	const { list, items } = getSliderEls( root );
	const dots = root.querySelectorAll( '.sgs-google-reviews__dot' );
	if ( ! list || ! dots.length ) {
		return;
	}

	const listRect = list.getBoundingClientRect();
	let activeIndex = 0;
	items.forEach( ( item, idx ) => {
		const itemRect = item.getBoundingClientRect();
		if ( itemRect.left - listRect.left < listRect.width / 2 ) {
			activeIndex = idx;
		}
	} );

	dots.forEach( ( dot, idx ) => {
		const isActive = idx === activeIndex;
		dot.classList.toggle( 'is-active', isActive );
		dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
		if ( isActive ) {
			dot.setAttribute( 'aria-current', 'true' );
		} else {
			dot.removeAttribute( 'aria-current' );
		}
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

store( 'sgs/google-reviews', {
	actions: {
		/**
		 * Step the slider back one review, wrapping from the first to the
		 * last (matches the looping-carousel convention used elsewhere in
		 * the framework, e.g. sgs/trustpilot-reviews).
		 */
		prevSlide() {
			const { ref } = getElement();
			const root = findRoot( ref );
			if ( ! root ) {
				return;
			}
			const { list, items } = getSliderEls( root );
			if ( ! list || items.length < 2 ) {
				return;
			}
			if ( list.scrollLeft <= SCROLL_EPSILON ) {
				scrollToItem( root, items.length - 1 );
				return;
			}
			let target = 0;
			items.forEach( ( item, idx ) => {
				if ( item.offsetLeft < list.scrollLeft - SCROLL_EPSILON ) {
					target = idx;
				}
			} );
			scrollToItem( root, target );
		},

		/**
		 * Step the slider forward one review, wrapping from the last to the
		 * first.
		 */
		nextSlide() {
			const { ref } = getElement();
			const root = findRoot( ref );
			if ( ! root ) {
				return;
			}
			const { list, items } = getSliderEls( root );
			if ( ! list || items.length < 2 ) {
				return;
			}
			if ( list.scrollLeft >= maxScrollLeft( list ) - SCROLL_EPSILON ) {
				scrollToItem( root, 0 );
				return;
			}
			let target = items.length - 1;
			items.forEach( ( item, idx ) => {
				if ( item.offsetLeft > list.scrollLeft + SCROLL_EPSILON ) {
					target = Math.min( target, idx );
				}
			} );
			scrollToItem( root, target );
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
			scrollToItem( root, index );
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
			// autoplay is off.
			updateActiveDot( root );

			if ( ! ctx.autoplay ) {
				return;
			}

			// `:not([data-sgs-loop-clone])` — see getSliderEls() above; the
			// same clone-exclusion contract applies to autoplay's own item
			// count and offsetLeft targets.
			const reviews = slider.querySelectorAll(
				'.sgs-google-reviews__review:not([data-sgs-loop-clone])'
			);
			if ( reviews.length <= 1 ) {
				return; // Nothing to slide.
			}

			// WCAG 2.3.3 — auto-advancing content must respect a stated
			// preference for reduced motion.
			const reduceMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)'
			).matches;
			if ( reduceMotion ) {
				return;
			}

			let currentSlide = 0;
			const speed = parseInt( ctx.autoplaySpeed, 10 );

			const slideNext = () => {
				currentSlide = ( currentSlide + 1 ) % reviews.length;
				slider.scrollTo( {
					left: reviews[ currentSlide ].offsetLeft,
					behavior: 'smooth',
				} );
				updateActiveDot( root );
			};

			let timer = setInterval( slideNext, speed );

			// Pause on hover/focus — a user interacting with the slider
			// (including via keyboard-focused arrows/dots) shouldn't have
			// their position yanked mid-interaction.
			root.addEventListener( 'mouseenter', () => clearInterval( timer ) );
			root.addEventListener( 'focusin', () => clearInterval( timer ) );
			root.addEventListener( 'mouseleave', () => {
				timer = setInterval( slideNext, speed );
			} );
		},
	},
} );
