/**
 * SGS Testimonial Slider — scroll-snap carousel with autoplay.
 *
 * CSS scroll-snap handles the snap behaviour. This module adds:
 * - Prev/next arrow functionality
 * - Dot navigation synced to scroll position
 * - Optional autoplay that pauses on hover/focus
 * - WCAG 2.2.2-compliant persistent pause/play button (injected into DOM)
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
	let isPaused = false;

	/**
	 * Scroll to a specific slide index.
	 *
	 * @param {number} index Target slide index.
	 */
	function goToSlide( index ) {
		const clamped = Math.max( 0, Math.min( index, slides.length - 1 ) );
		currentIndex = clamped;

		track.scrollTo( {
			left: slides[ clamped ].offsetLeft,
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
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
			pausePermanently();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			goToSlide( currentIndex + 1 );
			pausePermanently();
		} );
	}

	/* Dot navigation */
	dots.forEach( ( dot, i ) => {
		dot.addEventListener( 'click', () => {
			goToSlide( i );
			pausePermanently();
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
		if ( ! shouldAutoplay || prefersReducedMotion || isPaused ) {
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

	/**
	 * Permanently pause autoplay — called when the user explicitly interacts.
	 * This prevents autoplay resuming when the mouse leaves or focus shifts.
	 * The pause button re-enables it.
	 */
	function pausePermanently() {
		isPaused = true;
		stopAutoplay();
		if ( pauseBtn ) {
			pauseBtn.setAttribute( 'aria-label', 'Play testimonials' );
			pauseBtn.setAttribute( 'aria-pressed', 'false' );
			pauseBtn.querySelector( '.sgs-testimonial-slider__pause-icon' ).textContent = '▶';
		}
	}

	function resumeAutoplay() {
		isPaused = false;
		startAutoplay();
		if ( pauseBtn ) {
			pauseBtn.setAttribute( 'aria-label', 'Pause testimonials' );
			pauseBtn.setAttribute( 'aria-pressed', 'true' );
			pauseBtn.querySelector( '.sgs-testimonial-slider__pause-icon' ).textContent = '⏸';
		}
	}

	/* Pause autoplay temporarily on hover and focus (while not permanently paused) */
	slider.addEventListener( 'mouseenter', () => {
		if ( ! isPaused ) stopAutoplay();
	} );
	slider.addEventListener( 'focusin', () => {
		if ( ! isPaused ) stopAutoplay();
	} );
	slider.addEventListener( 'mouseleave', () => {
		if ( ! isPaused ) startAutoplay();
	} );
	slider.addEventListener( 'focusout', ( e ) => {
		if ( ! isPaused && ! slider.contains( e.relatedTarget ) ) {
			startAutoplay();
		}
	} );

	/*
	 * Keyboard navigation for the dot tablist (ARIA tab pattern).
	 *
	 * When a dot button has focus, Left/Right arrow keys move between dots
	 * and navigate slides. This is the correct pattern for role="tablist".
	 * The prev/next arrow buttons also accept focus for keyboard access.
	 */
	dots.forEach( ( dot, i ) => {
		dot.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'ArrowLeft' || e.key === 'ArrowRight' ) {
				e.preventDefault();
				const next = e.key === 'ArrowRight'
					? Math.min( i + 1, slides.length - 1 )
					: Math.max( i - 1, 0 );
				dots[ next ].focus();
				goToSlide( next );
				pausePermanently();
			}
		} );
	} );

	/*
	 * WCAG 2.2.2 — Pause, Stop, Hide
	 *
	 * Auto-playing content that lasts more than 5 seconds MUST provide a
	 * mechanism to pause, stop, or hide it. The prev/next/dot interactions
	 * pause autoplay, but they do not provide a persistent mechanism — the
	 * user has no way to know autoplay will resume when they leave.
	 *
	 * We inject a pause/play toggle button into the arrows container (or
	 * adjacent to the slider if no arrows are shown). This button persists
	 * the paused state for the lifetime of the page session.
	 */
	let pauseBtn = null;

	if ( shouldAutoplay && ! prefersReducedMotion ) {
		pauseBtn = document.createElement( 'button' );
		pauseBtn.type = 'button';
		pauseBtn.className = 'sgs-testimonial-slider__pause-btn';
		pauseBtn.setAttribute( 'aria-label', 'Pause testimonials' );
		pauseBtn.setAttribute( 'aria-pressed', 'true' );
		pauseBtn.setAttribute( 'aria-live', 'polite' );

		const icon = document.createElement( 'span' );
		icon.className = 'sgs-testimonial-slider__pause-icon';
		icon.setAttribute( 'aria-hidden', 'true' );
		icon.textContent = '⏸';
		pauseBtn.appendChild( icon );

		pauseBtn.addEventListener( 'click', () => {
			if ( isPaused ) {
				resumeAutoplay();
			} else {
				pausePermanently();
			}
		} );

		/* Insert after the arrows container, or directly after the track */
		const arrowsContainer = slider.querySelector( '.sgs-testimonial-slider__arrows' );
		if ( arrowsContainer ) {
			arrowsContainer.appendChild( pauseBtn );
		} else {
			slider.appendChild( pauseBtn );
		}
	}

	/* Initialise */
	startAutoplay();
} );
