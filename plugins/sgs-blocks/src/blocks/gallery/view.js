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

import { store, getContext, getElement } from '@wordpress/interactivity';

const REDUCED_MOTION = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

// ==========================================================================
/**
 * Resolve THIS gallery's lightbox dialog from the element that triggered the
 * action.
 *
 * ⛔ Deliberately NOT `document.querySelector( '.sgs-gallery__lightbox' )`:
 * that returns the FIRST lightbox in the document, so on a page with two
 * galleries clicking the second one's tile would open the first one's dialog.
 * Scoping to the interactive root keeps one gallery's actions inside its own
 * instance.
 *
 * @param {Element|undefined} ref Element the action fired on.
 * @return {HTMLDialogElement|null} This gallery's lightbox, or null.
 */
function lightboxFor( ref ) {
	const root = ref?.closest?.( '[data-wp-interactive="sgs/gallery"]' );
	return root ? root.querySelector( '.sgs-gallery__lightbox' ) : null;
}

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
			// No-inline contract: toggle a class instead of an inline style
			// property — style.css defines body.sgs-gallery-lightbox-open.
			document.body.classList.add( 'sgs-gallery-lightbox-open' );

			// Promote to the TOP LAYER (D806). A z-index cannot escape the
			// `z-index:1` stacking context that .entry-content puts on every
			// page, so the site header painted over the open lightbox. Only
			// showModal() escapes it. It also supplies the focus trap and
			// Escape handling, which is why the manual .focus() call that used
			// to live here is gone — the UA moves focus to the first focusable
			// child (the close button) by itself, and the old call queried for
			// a class that had not been applied yet at this tick.
			const dialogEl = lightboxFor( getElement()?.ref );
			if ( dialogEl && ! dialogEl.open && 'function' === typeof dialogEl.showModal ) {
				dialogEl.showModal();
			}
		},

		/**
		 * Close the lightbox and restore scroll.
		 *
		 * Also bound to the dialog's own `close` event, so the UA's built-in
		 * Escape handling cannot leave the state (and the body scroll lock)
		 * out of step with what is on screen. Re-entrant by design: close()
		 * on an already-closed dialog is a no-op.
		 */
		closeLightbox() {
			const ctx = getContext();
			ctx.lightboxOpen          = false;
			document.body.classList.remove( 'sgs-gallery-lightbox-open' );

			const dialogEl = lightboxFor( getElement()?.ref );
			if ( dialogEl && dialogEl.open && 'function' === typeof dialogEl.close ) {
				dialogEl.close();
			}
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
			// Escape is deliberately NOT handled here: a native modal dialog
			// closes on Escape itself and fires `close`, which render.php binds
			// to actions.closeLightbox. Handling it here as well would make two
			// writers for one transition (D806).
			if ( 'ArrowRight' === event.key ) {
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

	/*
	 * `:not([data-sgs-loop-clone])` — the a11y contract `fx-carousel-loop.js`
	 * (Spec 38 §11 loop FR) documents in its own docblock: when looping is on
	 * that module clones every item to both ends of the track so scrolling
	 * past the last one continues into the first, and marks each clone with
	 * `data-sgs-loop-clone="true"`. Without this filter `items`/`totalItems`
	 * below would count the clones too, giving the wrong dot count and wrong
	 * "am I at the end" arrow state. The filter is a no-op when looping is
	 * off — there are no clones to exclude.
	 */
	const items = Array.from(
		grid.querySelectorAll( '.sgs-gallery__item:not([data-sgs-loop-clone])' )
	);
	if ( ! items.length ) {
		return;
	}

	const shouldAutoplay = galleryEl.dataset.autoplay === 'true';
	const speed          = parseInt( galleryEl.dataset.speed || '5000', 10 );
	const totalItems     = items.length;
	// Whether `fx-carousel-loop.js` is attached to THIS track — read off the
	// same marker the render layer emits (`data-sgs-loop="1"` on the grid),
	// so arrows/keyboard wrap instead of clamping at the ends. Independent of
	// drag (Bean's ruling): this reads true whether or not drag is also on.
	const loopEnabled = grid.dataset.sgsLoop === '1';

	let currentIndex  = 0;
	let autoplayTimer = null;

	/**
	 * Scroll the carousel to a specific item index.
	 *
	 * @param {number} index Target index.
	 */
	function goToItem( index ) {
		// Looping has no last item to clamp against — wrap instead, the
		// same modulo shape the lightbox's own nextImage/prevImage already
		// use. Clamping is kept for the non-looping default so an arrow
		// click at either end still just stops there, unchanged.
		const resolved = loopEnabled
			? ( ( index % totalItems ) + totalItems ) % totalItems
			: Math.max( 0, Math.min( index, totalItems - 1 ) );
		currentIndex  = resolved;

		const target = items[ resolved ];
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
		// A loop has no last item (WCAG 2.5.7 concern the loop module's own
		// docblock names): "next" must never disable, so a visitor is never
		// stuck staring at a dead button. Disabled state is meaningful only
		// for the non-looping default.
		if ( prevBtn ) {
			prevBtn.disabled = ! loopEnabled && currentIndex === 0;
		}
		if ( nextBtn ) {
			nextBtn.disabled = ! loopEnabled && currentIndex >= totalItems - 1;
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
