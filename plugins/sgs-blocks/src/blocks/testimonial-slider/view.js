/**
 * SGS Testimonial Slider — Interactivity API store.
 *
 * CSS scroll-snap handles snapping. This store adds:
 * - Prev/next and dot navigation
 * - Scroll-position sync (debounced scroll event)
 * - Autoplay with WCAG 2.2.2 pause/play toggle
 * - Pause on hover/focus, resume on leave
 * - prefers-reduced-motion support
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

// Module-level timer registry — keyed by element reference to avoid shared state.
const timers     = new WeakMap();
const scrollJobs = new WeakMap();

/** Returns true when the user prefers reduced motion. */
function prefersReducedMotion() {
	return window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
}

/** Scroll the track to the given slide index. */
function scrollToSlide( track, slides, index, smooth ) {
	const target = slides[ index ];
	if ( ! target ) {
		return;
	}
	track.scrollTo( {
		left:     target.offsetLeft,
		behavior: ( smooth && ! prefersReducedMotion() ) ? 'smooth' : 'auto',
	} );
}

/** Find the closest slide index to the current scroll position. */
function detectIndex( track, slides ) {
	const trackLeft = track.getBoundingClientRect().left;
	let   closest   = 0;
	let   minDist   = Infinity;
	slides.forEach( ( slide, i ) => {
		const dist = Math.abs( slide.getBoundingClientRect().left - trackLeft );
		if ( dist < minDist ) {
			minDist  = dist;
			closest  = i;
		}
	} );
	return closest;
}

const { state } = store( 'sgs/testimonial-slider', {
	state: {
		/**
		 * True when the current slide element is the active slide.
		 * Reads context.currentIndex (wrapper) and context.slideIndex (slide).
		 *
		 * Used by: data-wp-class--is-active on each <blockquote> slide.
		 *
		 * @returns {boolean}
		 */
		get isActiveSlide() {
			const ctx = getContext();
			return ctx.currentIndex === ctx.slideIndex;
		},

		/**
		 * True when the current dot button is the active dot.
		 * Reads context.currentIndex (wrapper) and context.dotIndex (dot).
		 *
		 * Used by: data-wp-class--is-active on each dot button.
		 *
		 * @returns {boolean}
		 */
		get isActiveDot() {
			const ctx = getContext();
			return ctx.currentIndex === ctx.dotIndex;
		},

		/**
		 * "true" or "false" string for dot aria-selected.
		 * Must be a string — IA removes the attribute when value is boolean false.
		 *
		 * Used by: data-wp-bind--aria-selected on each dot button.
		 *
		 * @returns {string}
		 */
		get dotAriaSelected() {
			const ctx = getContext();
			return ctx.currentIndex === ctx.dotIndex ? 'true' : 'false';
		},

		/**
		 * Accessible label for the pause/play button.
		 *
		 * Used by: data-wp-bind--aria-label on the pause button.
		 *
		 * @returns {string}
		 */
		get pauseAriaLabel() {
			return getContext().isPlaying ? 'Pause testimonials' : 'Play testimonials';
		},

		/**
		 * "true"/"false" string for aria-pressed on the pause button.
		 *
		 * Used by: data-wp-bind--aria-pressed on the pause button.
		 *
		 * @returns {string}
		 */
		get pauseAriaPressed() {
			return getContext().isPlaying ? 'true' : 'false';
		},

		/**
		 * Icon character for the pause/play button.
		 *
		 * Used by: data-wp-text on the icon <span>.
		 *
		 * @returns {string}
		 */
		get pauseIcon() {
			return getContext().isPlaying ? '⏸' : '▶';
		},
	},

	actions: {
		/** Navigate to the previous slide and stop autoplay. */
		prev() {
			const ctx     = getContext();
			const { ref } = getElement();
			const slider  = ref.closest( '.sgs-testimonial-slider' );
			const track   = slider?.querySelector( '.sgs-testimonial-slider__track' );
			const slides  = slider ? Array.from( slider.querySelectorAll( '.sgs-testimonial-slider__slide' ) ) : [];
			const next    = Math.max( 0, ctx.currentIndex - 1 );

			ctx.currentIndex = next;
			ctx.isPlaying    = false; // User interaction: permanently pause.
			scrollToSlide( track, slides, next, true );
		},

		/** Navigate to the next slide and stop autoplay. */
		next() {
			const ctx     = getContext();
			const { ref } = getElement();
			const slider  = ref.closest( '.sgs-testimonial-slider' );
			const track   = slider?.querySelector( '.sgs-testimonial-slider__track' );
			const slides  = slider ? Array.from( slider.querySelectorAll( '.sgs-testimonial-slider__slide' ) ) : [];
			const next    = Math.min( ctx.totalSlides - 1, ctx.currentIndex + 1 );

			ctx.currentIndex = next;
			ctx.isPlaying    = false;
			scrollToSlide( track, slides, next, true );
		},

		/** Navigate to a specific slide via dot button click. */
		goTo( event ) {
			const ctx      = getContext();
			const { ref }  = getElement(); // ref = dot button
			const slider   = ref.closest( '.sgs-testimonial-slider' );
			const track    = slider?.querySelector( '.sgs-testimonial-slider__track' );
			const slides   = slider ? Array.from( slider.querySelectorAll( '.sgs-testimonial-slider__slide' ) ) : [];
			const dotIndex = ctx.dotIndex; // from dot's data-wp-context

			ctx.currentIndex = dotIndex;
			ctx.isPlaying    = false;
			scrollToSlide( track, slides, dotIndex, true );
		},

		/** Toggle autoplay play/pause. */
		togglePlay() {
			const ctx     = getContext();
			ctx.isPlaying = ! ctx.isPlaying;
		},

		/** Temporarily pause autoplay while hovering (if not manually paused). */
		pauseOnHover() {
			const ctx     = getContext();
			const { ref } = getElement();
			const slider  = ref.closest( '.sgs-testimonial-slider' ) || ref;
			if ( ctx.autoplay && ctx.isPlaying ) {
				const timer = timers.get( slider );
				if ( timer ) {
					clearInterval( timer );
					timers.set( slider, null );
				}
			}
		},

		/** Resume autoplay after hover ends (if still in isPlaying state). */
		resumeOnLeave() {
			const ctx     = getContext();
			const { ref } = getElement();
			const slider  = ref.closest( '.sgs-testimonial-slider' ) || ref;
			if ( ctx.autoplay && ctx.isPlaying ) {
				startTimer( slider, ctx );
			}
		},

		/** Debounced scroll handler — syncs currentIndex as user drags. */
		handleScroll() {
			const { ref } = getElement(); // ref = track
			const slider  = ref.closest( '.sgs-testimonial-slider' );
			if ( ! slider ) { return; }

			// Debounce: detect after scroll settles.
			const existing = scrollJobs.get( ref );
			if ( existing ) { clearTimeout( existing ); }
			const job = setTimeout( () => {
				const ctx    = getContext();
				const slides = Array.from( slider.querySelectorAll( '.sgs-testimonial-slider__slide' ) );
				ctx.currentIndex = detectIndex( ref, slides );
				scrollJobs.delete( ref );
			}, 80 );
			scrollJobs.set( ref, job );
		},
	},

	callbacks: {
		/**
		 * On block init: check prefers-reduced-motion and start autoplay if configured.
		 * Also adds hover/focus pause listeners.
		 * Attached via data-wp-init="callbacks.init" on the wrapper.
		 */
		init() {
			const ctx     = getContext();
			const { ref } = getElement(); // ref = outer wrapper

			if ( prefersReducedMotion() ) {
				ctx.isPlaying = false;
				return;
			}

			// Pause on mouseenter/focusin, resume on mouseleave/focusout.
			ref.addEventListener( 'mouseenter', () => {
				if ( ctx.autoplay && ctx.isPlaying ) {
					const timer = timers.get( ref );
					if ( timer ) { clearInterval( timer ); timers.set( ref, null ); }
				}
			} );
			ref.addEventListener( 'mouseleave', () => {
				if ( ctx.autoplay && ctx.isPlaying ) { startTimer( ref, ctx ); }
			} );
			ref.addEventListener( 'focusin', () => {
				if ( ctx.autoplay && ctx.isPlaying ) {
					const timer = timers.get( ref );
					if ( timer ) { clearInterval( timer ); timers.set( ref, null ); }
				}
			} );
			ref.addEventListener( 'focusout', ( e ) => {
				if ( ctx.autoplay && ctx.isPlaying && ! ref.contains( e.relatedTarget ) ) {
					startTimer( ref, ctx );
				}
			} );

			if ( ctx.autoplay && ctx.isPlaying ) {
				startTimer( ref, ctx );
			}
		},

		/**
		 * Reactive callback — starts or stops the autoplay timer when isPlaying changes.
		 * Attached via data-wp-watch="callbacks.onPlayChange" on the wrapper.
		 */
		onPlayChange() {
			const ctx     = getContext();
			const { ref } = getElement();

			if ( ctx.isPlaying ) {
				startTimer( ref, ctx );
			} else {
				const timer = timers.get( ref );
				if ( timer ) { clearInterval( timer ); timers.set( ref, null ); }
			}
		},
	},
} );

/**
 * Start the autoplay interval for a given slider wrapper element.
 *
 * @param {HTMLElement} wrapper The slider wrapper element.
 * @param {object}      ctx     The Interactivity API context object.
 */
function startTimer( wrapper, ctx ) {
	const existing = timers.get( wrapper );
	if ( existing ) { clearInterval( existing ); }

	const track  = wrapper.querySelector( '.sgs-testimonial-slider__track' );
	const slides = Array.from( wrapper.querySelectorAll( '.sgs-testimonial-slider__slide' ) );

	const timer = setInterval( () => {
		if ( ! ctx.isPlaying ) {
			clearInterval( timer );
			timers.delete( wrapper );
			return;
		}
		const next = ( ctx.currentIndex + 1 ) % ctx.totalSlides;
		ctx.currentIndex = next;
		scrollToSlide( track, slides, next, true );
	}, ctx.speed );

	timers.set( wrapper, timer );
}
