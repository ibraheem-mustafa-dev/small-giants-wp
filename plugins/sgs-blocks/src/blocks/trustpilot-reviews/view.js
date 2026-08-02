/**
 * Trustpilot Reviews -- Frontend Interactivity
 *
 * Looping carousel: clicking next on the last card wraps to the first;
 * clicking prev on the first wraps to the last. Autoplay loops the same way.
 * Vanilla JS (no framework dep) -- the carousel is structural, not reactive.
 *
 * @package SGS\Blocks
 */

const SCROLL_EPSILON = 4; // px tolerance when comparing scroll positions

const initCarousel = ( root ) => {
	const variant = root.getAttribute( 'data-variant' );
	if ( variant !== 'carousel' && variant !== 'mini-carousel' ) {
		return;
	}

	const track = root.querySelector( '.sgs-trustpilot-reviews__track' );

	/*
	 * `:not([data-sgs-loop-clone])` — the a11y contract `fx-carousel-loop.js`
	 * (Spec 38 §11 loop FR) documents in its own docblock: when looping is on
	 * that module clones every card to both ends of the track so scrolling
	 * past the last one continues into the first, and marks each clone with
	 * `data-sgs-loop-clone="true"`. Without this filter `cards` below would
	 * count the clones too, desynchronising the dots (a STATIC SSR'd list,
	 * one per real review) from the card actually in view. The filter is a
	 * no-op when looping is off — there are no clones to exclude.
	 */
	const cards = track
		? track.querySelectorAll(
				'.sgs-trustpilot-reviews__card:not([data-sgs-loop-clone])'
		  )
		: [];
	if ( ! track || cards.length < 2 ) {
		return;
	}

	const prevBtn = root.querySelector( '.sgs-trustpilot-reviews__arrow--prev' );
	const nextBtn = root.querySelector( '.sgs-trustpilot-reviews__arrow--next' );
	const dots = root.querySelectorAll( '.sgs-trustpilot-reviews__dot' );

	// Whether `fx-carousel-loop.js` is attached to THIS track — read off the
	// same marker the render layer emits (`data-sgs-loop="1"` on the track),
	// mirroring sgs/gallery. Independent of drag (Bean's ruling): this reads
	// true whether or not drag is also on.
	const loopEnabled = track.dataset.sgsLoop === '1';

	const getStep = () => {
		const cardWidth = cards[ 0 ].getBoundingClientRect().width;
		const gap = parseFloat( getComputedStyle( track ).columnGap || getComputedStyle( track ).gap || 16 );
		return cardWidth + gap;
	};

	const maxScrollLeft = () => Math.max( 0, track.scrollWidth - track.clientWidth );

	const atEnd = () => track.scrollLeft >= maxScrollLeft() - SCROLL_EPSILON;
	const atStart = () => track.scrollLeft <= SCROLL_EPSILON;

	// Read FRESH per call, never cached at module load: the OS setting can be
	// toggled mid-visit, and a cached value would keep animating for the rest
	// of it. (The `reduceMotion` const further down is a separate, correct
	// read — it decides once whether autoplay starts at all.)
	const scrollBehavior = () =>
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
			? 'auto'
			: 'smooth';

	const scrollTo = ( left ) => {
		track.scrollTo( { left, behavior: scrollBehavior() } );
	};

	const scrollByCard = ( dir ) => {
		const step = getStep();

		if ( ! loopEnabled ) {
			// Non-looping default (opt-in, matching sgs/gallery): clamp at
			// either end, same as a plain scroller -- no dead-end snap.
			if ( ( dir > 0 && atEnd() ) || ( dir < 0 && atStart() ) ) {
				return;
			}
			track.scrollBy( { left: step * dir, behavior: scrollBehavior() } );
			return;
		}

		// Looping: `fx-carousel-loop.js` (Spec 38 §11) has already cloned
		// cards to both ends of the track, so continuing to scroll past the
		// last real card lands on a clone and stays visually seamless -- no
		// manual snap-to-start/end needed here, and none of this block's own
		// arrow/keyboard/dot logic ever disables (WCAG 2.5.7: a loop has no
		// last item).
		track.scrollBy( { left: step * dir, behavior: scrollBehavior() } );
	};

	if ( prevBtn ) {
		prevBtn.addEventListener( 'click', () => scrollByCard( -1 ) );
	}
	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => scrollByCard( 1 ) );
	}

	// Dot navigation + active-dot sync on scroll.
	const updateActiveDot = () => {
		if ( ! dots.length ) {
			return;
		}
		const trackRect = track.getBoundingClientRect();
		let activeIndex = 0;
		cards.forEach( ( card, idx ) => {
			const rect = card.getBoundingClientRect();
			if ( rect.left - trackRect.left < trackRect.width / 2 ) {
				activeIndex = idx;
			}
		} );
		dots.forEach( ( dot, idx ) => {
			const isActive = idx === activeIndex;
			dot.classList.toggle( 'is-active', isActive );
			dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
		} );
	};

	dots.forEach( ( dot, idx ) => {
		dot.addEventListener( 'click', () => {
			const target = cards[ idx ];
			if ( ! target ) {
				return;
			}
			scrollTo( target.offsetLeft - track.offsetLeft );
		} );
	} );

	let scrollRaf;
	track.addEventListener( 'scroll', () => {
		if ( scrollRaf ) {
			cancelAnimationFrame( scrollRaf );
		}
		scrollRaf = requestAnimationFrame( updateActiveDot );
	} );

	// Autoplay (only if enabled and user hasn't requested reduced motion).
	const autoplay = root.getAttribute( 'data-autoplay' ) === 'true';
	const speed = parseInt( root.getAttribute( 'data-autoplay-speed' ), 10 ) || 5000;
	const reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	if ( autoplay && ! reduceMotion ) {
		let timer = setInterval( () => scrollByCard( 1 ), speed );
		// Pause on hover/focus.
		root.addEventListener( 'mouseenter', () => clearInterval( timer ) );
		root.addEventListener( 'focusin', () => clearInterval( timer ) );
		root.addEventListener( 'mouseleave', () => {
			timer = setInterval( () => scrollByCard( 1 ), speed );
		} );
	}
};

const init = () => {
	document.querySelectorAll( '.wp-block-sgs-trustpilot-reviews' ).forEach( initCarousel );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
