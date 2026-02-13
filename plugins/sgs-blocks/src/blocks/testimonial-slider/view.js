/**
 * SGS Testimonial Slider — scroll-snap carousel with autoplay.
 *
 * CSS scroll-snap handles the snap behaviour. This module adds:
 * - Prev/next arrow functionality
 * - Dot navigation synced to scroll position
 * - Optional autoplay that pauses on hover/focus
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 * Target: < 3KB minified.
 */

const sliders = document.querySelectorAll( '.sgs-testimonial-slider' );

sliders.forEach( ( slider ) => {
	const track = slider.querySelector( '.sgs-testimonial-slider__track' );
	const slides = slider.querySelectorAll( '.sgs-testimonial-slider__slide' );
	const prevBtn = slider.querySelector( '.sgs-testimonial-slider__arrow--prev' );
	const nextBtn = slider.querySelector( '.sgs-testimonial-slider__arrow--next' );
	const dots = slider.querySelectorAll( '.sgs-testimonial-slider__dot' );

	if ( ! track || slides.length === 0 ) {
		return;
	}

	const shouldAutoplay = slider.dataset.autoplay === 'true';
	const speed = parseInt( slider.dataset.speed || '5000', 10 );
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	let currentIndex = 0;
	let autoplayTimer = null;

	/**
	 * Scroll to a specific slide index.
	 *
	 * @param {number} index Target slide index.
	 */
	function goToSlide( index ) {
		const clamped = Math.max( 0, Math.min( index, slides.length - 1 ) );
		currentIndex = clamped;

		slides[ clamped ].scrollIntoView( {
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
			block: 'nearest',
			inline: 'start',
		} );

		updateDots();
	}

	/**
	 * Update active dot based on current index.
	 */
	function updateDots() {
		dots.forEach( ( dot, i ) => {
			const isActive = i === currentIndex;
			dot.classList.toggle(
				'sgs-testimonial-slider__dot--active',
				isActive
			);
			dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
		} );
	}

	/**
	 * Detect current slide from scroll position.
	 */
	function detectCurrentSlide() {
		if ( ! slides.length ) {
			return;
		}

		const trackRect = track.getBoundingClientRect();
		let closestIndex = 0;
		let closestDistance = Infinity;

		slides.forEach( ( slide, i ) => {
			const slideRect = slide.getBoundingClientRect();
			const distance = Math.abs( slideRect.left - trackRect.left );
			if ( distance < closestDistance ) {
				closestDistance = distance;
				closestIndex = i;
			}
		} );

		if ( closestIndex !== currentIndex ) {
			currentIndex = closestIndex;
			updateDots();
		}
	}

	/* Arrow navigation */
	if ( prevBtn ) {
		prevBtn.addEventListener( 'click', () => {
			goToSlide( currentIndex - 1 );
			stopAutoplay();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			goToSlide( currentIndex + 1 );
			stopAutoplay();
		} );
	}

	/* Dot navigation */
	dots.forEach( ( dot, i ) => {
		dot.addEventListener( 'click', () => {
			goToSlide( i );
			stopAutoplay();
		} );
	} );

	/* Scroll detection — sync dots as user scrolls */
	let scrollTimeout;
	track.addEventListener(
		'scroll',
		() => {
			clearTimeout( scrollTimeout );
			scrollTimeout = setTimeout( detectCurrentSlide, 100 );
		},
		{ passive: true }
	);

	/* Autoplay */
	function startAutoplay() {
		if ( ! shouldAutoplay || prefersReducedMotion ) {
			return;
		}
		stopAutoplay();
		autoplayTimer = setInterval( () => {
			const next =
				currentIndex + 1 >= slides.length ? 0 : currentIndex + 1;
			goToSlide( next );
		}, speed );
	}

	function stopAutoplay() {
		if ( autoplayTimer ) {
			clearInterval( autoplayTimer );
			autoplayTimer = null;
		}
	}

	/* Pause autoplay on hover and focus */
	slider.addEventListener( 'mouseenter', stopAutoplay );
	slider.addEventListener( 'focusin', stopAutoplay );
	slider.addEventListener( 'mouseleave', startAutoplay );
	slider.addEventListener( 'focusout', startAutoplay );

	/* Keyboard navigation for the track */
	track.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'ArrowLeft' ) {
			e.preventDefault();
			goToSlide( currentIndex - 1 );
			stopAutoplay();
		} else if ( e.key === 'ArrowRight' ) {
			e.preventDefault();
			goToSlide( currentIndex + 1 );
			stopAutoplay();
		}
	} );

	/* Initialise */
	startAutoplay();
} );
