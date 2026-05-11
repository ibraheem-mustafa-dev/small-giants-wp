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
	const cards = track ? track.querySelectorAll( '.sgs-trustpilot-reviews__card' ) : [];
	if ( ! track || cards.length < 2 ) {
		return;
	}

	const prevBtn = root.querySelector( '.sgs-trustpilot-reviews__arrow--prev' );
	const nextBtn = root.querySelector( '.sgs-trustpilot-reviews__arrow--next' );
	const dots = root.querySelectorAll( '.sgs-trustpilot-reviews__dot' );

	const getStep = () => {
		const cardWidth = cards[ 0 ].getBoundingClientRect().width;
		const gap = parseFloat( getComputedStyle( track ).columnGap || getComputedStyle( track ).gap || 16 );
		return cardWidth + gap;
	};

	const maxScrollLeft = () => Math.max( 0, track.scrollWidth - track.clientWidth );

	const atEnd = () => track.scrollLeft >= maxScrollLeft() - SCROLL_EPSILON;
	const atStart = () => track.scrollLeft <= SCROLL_EPSILON;

	const scrollTo = ( left ) => {
		track.scrollTo( { left, behavior: 'smooth' } );
	};

	const scrollByCard = ( dir ) => {
		const step = getStep();
		if ( dir > 0 && atEnd() ) {
			// Wrap from end -> start.
			scrollTo( 0 );
			return;
		}
		if ( dir < 0 && atStart() ) {
			// Wrap from start -> end.
			scrollTo( maxScrollLeft() );
			return;
		}
		track.scrollBy( { left: step * dir, behavior: 'smooth' } );
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
