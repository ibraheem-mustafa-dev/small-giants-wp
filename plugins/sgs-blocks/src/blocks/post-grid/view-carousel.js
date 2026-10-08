/* Post grid: carousel prev/next/dots controls. */

import { REDUCED_MOTION } from './view-fetch.js';

// ==========================================================================
// Carousel
// ==========================================================================

/**
 * Initialise carousel prev/next/dots controls.
 *
 * The inner grid scrolls horizontally with CSS scroll-snap;
 * this script manages dot state and keyboard navigation.
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
export function initCarousel( gridEl, queryData ) {
	const innerEl = gridEl.querySelector( '.sgs-post-grid__inner' );
	const prevBtn = gridEl.querySelector( '.sgs-post-grid__carousel-prev' );
	const nextBtn = gridEl.querySelector( '.sgs-post-grid__carousel-next' );
	const dotsEl  = gridEl.querySelector( '.sgs-post-grid__carousel-dots' );

	if ( ! innerEl ) {
		return;
	}

	/*
	 * `:not([data-sgs-loop-clone])` — the a11y contract `fx-carousel-loop.js`
	 * (Spec 38 §11 loop FR) documents in its own docblock: when looping is on
	 * that module clones every item to both ends of the track so scrolling
	 * past the last one continues into the first, and marks each clone with
	 * `data-sgs-loop-clone="true"`. Without this filter `cards`/`totalCards`
	 * below would count the clones too, giving the wrong dot count and wrong
	 * "am I at the end" arrow state. The filter is a no-op when looping is
	 * off — there are no clones to exclude. Mirrors sgs/gallery's view.js.
	 */
	const cards = Array.from(
		innerEl.querySelectorAll( '.sgs-post-grid__card:not([data-sgs-loop-clone])' )
	);
	if ( ! cards.length ) {
		return;
	}

	// Whether `fx-carousel-loop.js` is attached to THIS track — read off the
	// same marker the render layer emits (`data-sgs-loop="1"` on the inner
	// scroller), so arrows/keyboard wrap instead of clamping at the ends.
	// Independent of drag (Bean's ruling): this reads true whether or not
	// drag is also on.
	const loopEnabled = innerEl.dataset.sgsLoop === '1';

	let currentIndex  = 0;
	let autoplayTimer = null;
	const totalCards  = cards.length;

	/**
	 * Sync `currentIndex` plus the dots/arrows UI to a card index, WITHOUT
	 * moving the scroller. Shared by `scrollToCard()` (button/dot/keyboard/
	 * autoplay navigation, which also scrolls) and the scroll-position sync
	 * below (drag/native-scroll navigation, which must NOT re-scroll — the
	 * scroller has already moved by the time this runs).
	 *
	 * @param {number} index Target card index (clamped to valid range).
	 */
	const updateCarouselUI = ( index ) => {
		// Looping has no last card to clamp against — wrap instead. Clamping
		// is kept for the non-looping default so an arrow click/scroll at
		// either end still just stops there, unchanged.
		currentIndex = loopEnabled
			? ( ( index % totalCards ) + totalCards ) % totalCards
			: Math.max( 0, Math.min( index, totalCards - 1 ) );

		if ( dotsEl ) {
			dotsEl.querySelectorAll( '.sgs-post-grid__dot' ).forEach( ( dot, i ) => {
				const isActive = i === currentIndex;
				dot.classList.toggle( 'sgs-post-grid__dot--active', isActive );
				dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
			} );
		}

		// A loop has no last item (WCAG 2.5.7 concern the loop module's own
		// docblock names): neither arrow may disable, so a visitor is never
		// stuck staring at a dead button. Disabled state is meaningful only
		// for the non-looping default.
		if ( prevBtn ) {
			prevBtn.disabled = ! loopEnabled && currentIndex === 0;
		}
		if ( nextBtn ) {
			nextBtn.disabled = ! loopEnabled && currentIndex >= totalCards - 1;
		}
	};

	/**
	 * Scroll the carousel to a specific card index.
	 *
	 * @param {number} index Target card index (clamped to valid range).
	 */
	const scrollToCard = ( index ) => {
		updateCarouselUI( index );
		const target = cards[ currentIndex ];

		if ( target ) {
			target.scrollIntoView( {
				behavior: REDUCED_MOTION ? 'auto' : 'smooth',
				block:    'nearest',
				inline:   'start',
			} );
		}
	};

	/**
	 * The card index nearest the carousel's CURRENT scroll position.
	 *
	 * Used to sync the dots/arrows after navigation the script did not itself
	 * drive — a drag (Spec 38 FR-38-13's shared draggable module writes
	 * `scrollLeft` directly and knows nothing about this block's dots) or a
	 * native touch/wheel/trackpad scroll. Matches the CSS
	 * `scroll-snap-align: start` the cards already use, so "nearest by
	 * offsetLeft" agrees with where the browser will actually snap to.
	 *
	 * @return {number} Nearest card index.
	 */
	const nearestCardIndex = () => {
		let nearest  = 0;
		let minDist  = Infinity;
		cards.forEach( ( card, i ) => {
			const dist = Math.abs( card.offsetLeft - innerEl.scrollLeft );
			if ( dist < minDist ) {
				minDist = dist;
				nearest = i;
			}
		} );
		return nearest;
	};

	// Build dot buttons.
	if ( dotsEl ) {
		cards.forEach( ( _card, i ) => {
			const dot = document.createElement( 'button' );
			dot.type      = 'button';
			dot.className = 'sgs-post-grid__dot' + ( i === 0 ? ' sgs-post-grid__dot--active' : '' );
			dot.setAttribute( 'role', 'tab' );
			dot.setAttribute( 'aria-selected', i === 0 ? 'true' : 'false' );
			dot.setAttribute( 'aria-label', 'Go to slide ' + ( i + 1 ) );
			dot.addEventListener( 'click', () => {
				scrollToCard( i );
				resetAutoplay();
			} );
			dotsEl.appendChild( dot );
		} );
	}

	// Arrow controls.
	if ( prevBtn ) {
		prevBtn.disabled = true;
		prevBtn.addEventListener( 'click', () => {
			scrollToCard( currentIndex - 1 );
			resetAutoplay();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			scrollToCard( currentIndex + 1 );
			resetAutoplay();
		} );
	}

	// Keyboard left/right within the carousel track.
	innerEl.addEventListener( 'keydown', ( evt ) => {
		if ( evt.key === 'ArrowLeft' ) {
			evt.preventDefault();
			scrollToCard( currentIndex - 1 );
			resetAutoplay();
		} else if ( evt.key === 'ArrowRight' ) {
			evt.preventDefault();
			scrollToCard( currentIndex + 1 );
			resetAutoplay();
		}
	} );

	// Autoplay (disabled when prefers-reduced-motion is set).
	const startAutoplay = () => {
		if ( ! queryData.carouselAutoplay || REDUCED_MOTION ) {
			return;
		}
		autoplayTimer = setInterval( () => {
			const next = currentIndex + 1 >= totalCards ? 0 : currentIndex + 1;
			scrollToCard( next );
		}, queryData.carouselSpeed || 5000 );
	};

	const stopAutoplay = () => {
		if ( autoplayTimer ) {
			clearInterval( autoplayTimer );
			autoplayTimer = null;
		}
	};

	const resetAutoplay = () => {
		stopAutoplay();
		startAutoplay();
	};

	// Pause on hover or focus to prevent users losing their place.
	gridEl.addEventListener( 'mouseenter', stopAutoplay );
	gridEl.addEventListener( 'mouseleave', startAutoplay );
	gridEl.addEventListener( 'focusin', stopAutoplay );
	gridEl.addEventListener( 'focusout', startAutoplay );

	/*
	 * Sync dots/arrows to the ACTUAL scroll position, however it got there.
	 *
	 * Proven live 2026-08-01 (post-grid canary, `.sgs-post-grid__inner`
	 * `scrollLeft` forced to 820 via direct assignment): the dots stayed on
	 * index 0 — nothing in this file previously listened for scroll at all,
	 * so `currentIndex` only ever changed via `scrollToCard()`'s own callers
	 * (arrows, dots, keyboard, autoplay). A drag (the shared Tier G draggable
	 * module, which drives `scrollLeft` directly and has no idea this block
	 * has dots) or plain native touch/wheel scrolling left the indicator
	 * silently stale, which read as the drag "not registering" at all.
	 *
	 * `requestAnimationFrame`-throttled rather than per-scroll-event: a drag
	 * or momentum coast can fire dozens of scroll events a second, and this
	 * only needs to settle on the nearest card, not re-run every tick.
	 * `{ passive: true }` because this listener never calls `preventDefault`.
	 */
	let scrollSyncFrame = null;
	innerEl.addEventListener( 'scroll', () => {
		if ( null !== scrollSyncFrame ) {
			return;
		}
		scrollSyncFrame = requestAnimationFrame( () => {
			scrollSyncFrame = null;
			updateCarouselUI( nearestCardIndex() );
		} );
	}, { passive: true } );

	startAutoplay();
	scrollToCard( 0 );
}
