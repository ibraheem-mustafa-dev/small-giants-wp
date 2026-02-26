/**
 * SGS Image Gallery — frontend interactivity.
 *
 * Handles two distinct responsibilities:
 *
 * 1. Lightbox — uses the WordPress Interactivity API store/state/actions
 *    pattern. The data-wp-* directives in render.php wire up the lightbox
 *    modal to the store state. Context (per-gallery) holds the images array,
 *    the current index, and the open/closed flag.
 *
 * 2. Carousel — vanilla JS scroll-snap carousel with prev/next/dots/autoplay.
 *    Reuses the pattern from testimonial-slider/view.js. Initialised for all
 *    .sgs-gallery--carousel blocks on the page.
 *
 * Loaded as a viewScriptModule (ES module, deferred, frontend only).
 * No external libraries — vanilla JS only.
 *
 * Accessibility: Escape key closes lightbox; Arrow keys navigate. Focus is
 * trapped inside the lightbox modal while it is open.
 *
 * prefers-reduced-motion: all transitions and carousel autoplay are disabled.
 */

import { store, getContext } from '@wordpress/interactivity';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

// ==========================================================================
// Interactivity API store — lightbox
// ==========================================================================

store( 'sgs/gallery', {
	state: {
		/**
		 * Whether the lightbox overlay is currently open.
		 *
		 * @return {boolean}
		 */
		get isLightboxOpen() {
			return getContext().lightboxOpen;
		},

		/**
		 * Full-size URL of the currently displayed image.
		 *
		 * @return {string}
		 */
		get currentFullUrl() {
			const ctx = getContext();
			return ctx.images[ ctx.currentIndex ]?.fullUrl || '';
		},

		/**
		 * Alt text of the currently displayed image.
		 *
		 * @return {string}
		 */
		get currentAlt() {
			const ctx = getContext();
			return ctx.images[ ctx.currentIndex ]?.alt || '';
		},

		/**
		 * Caption of the currently displayed image.
		 *
		 * @return {string}
		 */
		get currentCaption() {
			const ctx = getContext();
			return ctx.images[ ctx.currentIndex ]?.caption || '';
		},

		/**
		 * "1 / 12" counter text for screen readers and the lightbox footer.
		 *
		 * @return {string}
		 */
		get counterText() {
			const ctx = getContext();
			return ( ctx.currentIndex + 1 ) + ' / ' + ctx.images.length;
		},
	},

	actions: {
		/**
		 * Open the lightbox at the index stored on the clicked element's context.
		 *
		 * Each gallery item button carries data-wp-context with its own index.
		 * The Interactivity API merges this with the parent context, so
		 * getContext().currentIndex on the button equals that image's position.
		 */
		openLightbox() {
			const ctx = getContext();
			ctx.lightboxOpen   = true;
			document.body.style.overflow = 'hidden';

			// Move focus to the lightbox close button after opening.
			const galleryEl = document.querySelector(
				'[data-wp-interactive="sgs/gallery"] .sgs-gallery__lightbox--open .sgs-gallery__lightbox-close'
			);
			if ( galleryEl ) {
				galleryEl.focus();
			}
		},

		/**
		 * Close the lightbox and restore scroll.
		 */
		closeLightbox() {
			const ctx = getContext();
			ctx.lightboxOpen          = false;
			document.body.style.overflow = '';
		},

		/**
		 * Advance to the next image, wrapping at the end.
		 */
		nextImage() {
			const ctx = getContext();
			ctx.currentIndex = ( ctx.currentIndex + 1 ) % ctx.images.length;
		},

		/**
		 * Go back to the previous image, wrapping at the start.
		 */
		prevImage() {
			const ctx = getContext();
			ctx.currentIndex = ( ctx.currentIndex - 1 + ctx.images.length ) % ctx.images.length;
		},
	},

	callbacks: {
		/**
		 * Keyboard handler attached to the window via data-wp-on-window--keydown.
		 *
		 * Escape closes the lightbox. Arrow keys navigate. Both are no-ops
		 * when the lightbox is closed, so the handler is always safe to attach.
		 *
		 * @param {KeyboardEvent} event
		 */
		onKeydown( event ) {
			const ctx = getContext();
			if ( ! ctx.lightboxOpen ) {
				return;
			}
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				const { actions } = store( 'sgs/gallery' );
				actions.closeLightbox();
			} else if ( 'ArrowRight' === event.key ) {
				event.preventDefault();
				const { actions } = store( 'sgs/gallery' );
				actions.nextImage();
			} else if ( 'ArrowLeft' === event.key ) {
				event.preventDefault();
				const { actions } = store( 'sgs/gallery' );
				actions.prevImage();
			}
		},
	},
} );

// ==========================================================================
// Carousel — vanilla JS, independent of Interactivity API
// ==========================================================================

/**
 * Initialise a single carousel gallery element.
 *
 * @param {Element} galleryEl The .sgs-gallery--carousel root element.
 */
function initCarousel( galleryEl ) {
	const grid    = galleryEl.querySelector( '.sgs-gallery__grid' );
	const prevBtn = galleryEl.querySelector( '.sgs-gallery__carousel-prev' );
	const nextBtn = galleryEl.querySelector( '.sgs-gallery__carousel-next' );
	const dotsEl  = galleryEl.querySelector( '.sgs-gallery__carousel-dots' );

	if ( ! grid ) {
		return;
	}

	const items = Array.from( grid.querySelectorAll( '.sgs-gallery__item' ) );
	if ( ! items.length ) {
		return;
	}

	const shouldAutoplay = galleryEl.dataset.autoplay === 'true';
	const speed          = parseInt( galleryEl.dataset.speed || '5000', 10 );
	const totalItems     = items.length;

	let currentIndex  = 0;
	let autoplayTimer = null;

	/**
	 * Scroll the carousel to a specific item index.
	 *
	 * @param {number} index Target index.
	 */
	function goToItem( index ) {
		const clamped = Math.max( 0, Math.min( index, totalItems - 1 ) );
		currentIndex  = clamped;

		const target = items[ clamped ];
		if ( target ) {
			target.scrollIntoView( {
				behavior: REDUCED_MOTION ? 'auto' : 'smooth',
				block:    'nearest',
				inline:   'start',
			} );
		}

		updateDots();
		updateArrows();
	}

	/**
	 * Sync dot active state to the current index.
	 */
	function updateDots() {
		if ( ! dotsEl ) {
			return;
		}
		dotsEl.querySelectorAll( '.sgs-gallery__dot' ).forEach( ( dot, i ) => {
			const isActive = i === currentIndex;
			dot.classList.toggle( 'sgs-gallery__dot--active', isActive );
			dot.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
		} );
	}

	/**
	 * Update disabled state of prev/next arrows.
	 */
	function updateArrows() {
		if ( prevBtn ) {
			prevBtn.disabled = currentIndex === 0;
		}
		if ( nextBtn ) {
			nextBtn.disabled = currentIndex >= totalItems - 1;
		}
	}

	// Build dot navigation buttons.
	if ( dotsEl ) {
		items.forEach( ( _item, i ) => {
			const dot = document.createElement( 'button' );
			dot.type      = 'button';
			dot.className = 'sgs-gallery__dot' + ( 0 === i ? ' sgs-gallery__dot--active' : '' );
			dot.setAttribute( 'role', 'tab' );
			dot.setAttribute( 'aria-selected', 0 === i ? 'true' : 'false' );
			dot.setAttribute( 'aria-label', 'Go to image ' + ( i + 1 ) );
			dot.addEventListener( 'click', () => {
				goToItem( i );
				resetAutoplay();
			} );
			dotsEl.appendChild( dot );
		} );
	}

	// Arrow controls.
	if ( prevBtn ) {
		prevBtn.disabled = true;
		prevBtn.addEventListener( 'click', () => {
			goToItem( currentIndex - 1 );
			resetAutoplay();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', () => {
			goToItem( currentIndex + 1 );
			resetAutoplay();
		} );
	}

	// Keyboard navigation within the carousel track.
	grid.addEventListener( 'keydown', ( evt ) => {
		if ( 'ArrowLeft' === evt.key ) {
			evt.preventDefault();
			goToItem( currentIndex - 1 );
			resetAutoplay();
		} else if ( 'ArrowRight' === evt.key ) {
			evt.preventDefault();
			goToItem( currentIndex + 1 );
			resetAutoplay();
		}
	} );

	// Sync dots when user manually scrolls the track.
	let scrollTimeout;
	grid.addEventListener(
		'scroll',
		() => {
			clearTimeout( scrollTimeout );
			scrollTimeout = setTimeout( () => {
				const gridRect = grid.getBoundingClientRect();
				let closestIndex    = 0;
				let closestDistance = Infinity;
				items.forEach( ( item, i ) => {
					const itemRect = item.getBoundingClientRect();
					const distance = Math.abs( itemRect.left - gridRect.left );
					if ( distance < closestDistance ) {
						closestDistance = distance;
						closestIndex    = i;
					}
				} );
				if ( closestIndex !== currentIndex ) {
					currentIndex = closestIndex;
					updateDots();
					updateArrows();
				}
			}, 100 );
		},
		{ passive: true }
	);

	// Autoplay.
	function startAutoplay() {
		if ( ! shouldAutoplay || REDUCED_MOTION ) {
			return;
		}
		stopAutoplay();
		autoplayTimer = setInterval( () => {
			const next = currentIndex + 1 >= totalItems ? 0 : currentIndex + 1;
			goToItem( next );
		}, speed );
	}

	function stopAutoplay() {
		if ( autoplayTimer ) {
			clearInterval( autoplayTimer );
			autoplayTimer = null;
		}
	}

	function resetAutoplay() {
		stopAutoplay();
		startAutoplay();
	}

	// Pause autoplay on hover and focus to prevent users losing their place.
	galleryEl.addEventListener( 'mouseenter', stopAutoplay );
	galleryEl.addEventListener( 'mouseleave', startAutoplay );
	galleryEl.addEventListener( 'focusin',    stopAutoplay );
	galleryEl.addEventListener( 'focusout',   startAutoplay );

	// Initialise.
	startAutoplay();
	goToItem( 0 );
}

// Initialise all carousel galleries on the page.
document.querySelectorAll( '.sgs-gallery--carousel' ).forEach( initCarousel );
