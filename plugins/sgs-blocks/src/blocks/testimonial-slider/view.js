/**
 * SGS Testimonial Slider — scroll-snap carousel with autoplay.
 *
 * CSS scroll-snap handles the snap behaviour. This module adds:
 * - Prev/next arrow functionality (infinite wrapping)
 * - Dot navigation synced to scroll position
 * - Optional autoplay that loops infinitely and pauses on hover/focus
 * - WCAG 2.2.2-compliant persistent pause/play button (injected into DOM)
 *
 * Infinite loop: goToSlide wraps index at both ends for both manual nav and
 * autoplay. prefers-reduced-motion: loop still advances, scroll-behavior:auto
 * (no smooth animation), per WCAG 2.3.3 animation from interactions.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 * Target: < 3KB minified.
 */

const sliders = document.querySelectorAll( '.sgs-testimonial-slider' );

sliders.forEach( ( slider ) => {
	const track    = slider.querySelector( '.sgs-testimonial-slider__track' );
	const slides   = slider.querySelectorAll( '.sgs-testimonial-slider__slide' );
	const prevBtn  = slider.querySelector( '.sgs-testimonial-slider__arrow--prev' );
	const nextBtn  = slider.querySelector( '.sgs-testimonial-slider__arrow--next' );
	const dots     = slider.querySelectorAll( '.sgs-testimonial-slider__dot' );
	const controls = slider.querySelector( '.sgs-testimonial-slider__controls' );

	if ( ! track || slides.length === 0 ) {
		return;
	}

	const shouldAutoplay        = slider.dataset.autoplay === 'true';
	const speed                 = Number.parseInt( slider.dataset.speed || '5000', 10 );
	const prefersReducedMotion  = globalThis.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;
	const total = slides.length;

	let currentIndex  = 0;
	let autoplayTimer = null;
	let isPaused      = false;

	/**
	 * Wrap an index to [0, total) — enables infinite looping.
	 *
	 * @param {number} index Raw index (may be negative or ≥ total).
	 * @return {number} Wrapped index.
	 */
	function wrapIndex( index ) {
		return ( ( index % total ) + total ) % total;
	}

	/**
	 * Scroll to a specific slide index with infinite wrapping.
	 *
	 * @param {number} index Target slide index (may wrap).
	 */
	function goToSlide( index ) {
		currentIndex = wrapIndex( index );

		track.scrollTo( {
			left:     slides[ currentIndex ].offsetLeft,
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
		} );

		updateDots();
	}

	/**
	 * Update active dot and aria-current based on current index.
	 */
	function updateDots() {
		dots.forEach( ( dot, i ) => {
			const isActive = i === currentIndex;
			dot.classList.toggle(
				'sgs-testimonial-slider__dot--active',
				isActive
			);
			dot.setAttribute( 'aria-current', isActive ? 'true' : 'false' );
		} );
	}

	/**
	 * Detect current slide from scroll position (used on manual scroll).
	 */
	function detectCurrentSlide() {
		if ( ! slides.length ) {
			return;
		}

		const trackRect     = track.getBoundingClientRect();
		let closestIndex    = 0;
		let closestDistance = Infinity;

		slides.forEach( ( slide, i ) => {
			const slideRect = slide.getBoundingClientRect();
			const distance  = Math.abs( slideRect.left - trackRect.left );
			if ( distance < closestDistance ) {
				closestDistance = distance;
				closestIndex    = i;
			}
		} );

		if ( closestIndex !== currentIndex ) {
			currentIndex = closestIndex;
			updateDots();
		}
	}

	/* Arrow navigation — wraps at both ends */
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

	/* Autoplay — loops infinitely */
	function startAutoplay() {
		if ( ! shouldAutoplay || isPaused ) {
			return;
		}
		stopAutoplay();
		autoplayTimer = setInterval( () => {
			/*
			 * wrapIndex handles the boundary: after the last slide it wraps
			 * back to 0 and keeps going — no stop at the end.
			 */
			goToSlide( currentIndex + 1 );
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
	 * Prevents autoplay resuming when the mouse leaves or focus shifts.
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

	/* Pause temporarily on hover and focus (while not permanently paused) */
	slider.addEventListener( 'mouseenter', () => {
		if ( ! isPaused ) {
			stopAutoplay();
		}
	} );
	slider.addEventListener( 'focusin', () => {
		if ( ! isPaused ) {
			stopAutoplay();
		}
	} );
	slider.addEventListener( 'mouseleave', () => {
		if ( ! isPaused ) {
			startAutoplay();
		}
	} );
	slider.addEventListener( 'focusout', ( e ) => {
		if ( ! isPaused && ! slider.contains( e.relatedTarget ) ) {
			startAutoplay();
		}
	} );

	/*
	 * Keyboard navigation for the dot group (ARIA tab pattern).
	 * Left/Right arrow keys move between dots and navigate slides.
	 * Wraps at both ends to match infinite loop behaviour.
	 */
	dots.forEach( ( dot, i ) => {
		dot.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'ArrowLeft' || e.key === 'ArrowRight' ) {
				e.preventDefault();
				const next = wrapIndex(
					e.key === 'ArrowRight' ? i + 1 : i - 1
				);
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
	 * mechanism to pause, stop, or hide it. We inject a pause/play toggle
	 * button into .sgs-testimonial-slider__controls (after the dots). If
	 * prefers-reduced-motion is set the button is omitted — the browser has
	 * already suppressed animation so no auto-advancing motion occurs.
	 */
	let pauseBtn = null;

	if ( shouldAutoplay && ! prefersReducedMotion ) {
		pauseBtn      = document.createElement( 'button' );
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

		/*
		 * Insert into .sgs-testimonial-slider__controls (after the dots).
		 * Falls back to appending directly to the slider if controls are absent
		 * (e.g. showDots is off).
		 */
		if ( controls ) {
			controls.appendChild( pauseBtn );
		} else {
			slider.appendChild( pauseBtn );
		}
	}

	/* Initialise */
	startAutoplay();
} );
