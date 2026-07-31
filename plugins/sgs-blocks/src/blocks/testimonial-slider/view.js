/**
 * SGS Testimonial Slider — transform-based infinite carousel.
 *
 * Replaces the old native-scroll model (which clamped at the ends and could
 * not rotate at all when every card was already visible) with a translateX
 * track that wraps infinitely regardless of slidesVisible vs slide count.
 *
 * Mechanism:
 * - Real slides are moved into a JS-built `.sgs-testimonial-slider__list`
 *   flex row. The track becomes the fixed-width, `overflow:hidden` viewport.
 * - `slidesVisible` clones of the first slides are appended and `slidesVisible`
 *   clones of the last slides are prepended (aria-hidden + inert + no id), so
 *   the list can always move one step further in either direction.
 * - `currentIndex` tracks the REAL slide [0, total); `visualIndex` tracks the
 *   position inside the padded (clone + real + clone) list. Moving lands in a
 *   clone zone at the ends; once the transition finishes we silently snap the
 *   transform back to the equivalent real position with no animation, so the
 *   loop reads as continuous.
 * - Touch/pointer drag re-implements swipe (native scroll no longer does it).
 *
 * prefers-reduced-motion: transform still updates (so autoplay/arrows still
 * work) but with no transition — matches the previous scroll-behavior:auto
 * fallback per WCAG 2.3.3.
 *
 * No-inline contract (2026-07-10): the track position is driven entirely by a
 * CSS custom PROPERTY VALUE (--sgs-slider-offset, allowed — a var value is not
 * a property declaration) + a transition kill-switch class (.no-transition).
 * Never write .style.transform/.style.transition — style.css owns the
 * `transform: translateX(var(--sgs-slider-offset, 0))` + `transition` property
 * declarations, keyed off the var + class (D298 mobile-nav pattern).
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 *
 * DRAG MOMENTUM — BLOCK-PRIVATE, NOT THE SHARED Tier G ROSTER (Spec 38
 * FR-38-13; rescoped 2026-07-31):
 * this block briefly declared `supports.sgs.fx.draggable` and emitted
 * `data-sgs-fx="draggable"` on `.sgs-testimonial-slider__track`. Both were
 * removed, because the declaration was INERT here and not free: the shared
 * runtime (`shared/effects/gsap/fx-draggable.js`) only ever attaches to a
 * genuine native `overflow-x: auto|scroll` element, and this track is not one
 * (it is `overflow: hidden` with the transform-based clone-loop above), so
 * `initDraggable()` returned `undefined` every time — while the marker still
 * made `SGS_Motion_Registry` enqueue GSAP core + InertiaPlugin + the effect
 * module (~35KB gzip) to run it.
 *
 * Re-deriving this file's clone-zone wrap-around maths inside a block-agnostic
 * module would be exactly the per-block hyperfocus R-31-9 forbids, so the
 * momentum upgrade stays HERE, additively, on top of the pointer-drag that
 * already existed: `InertiaPlugin.track()`/`getVelocity()` (dynamically
 * imported, ONLY when an instance opts in — a page with the toggle off never
 * fetches GSAP) measures how fast the pointer was moving at release, so a
 * genuine flick, even over a short distance, registers as a deliberate slide
 * change, same as any native momentum scroll.
 *
 * The opt-in marker is now block-private grammar —
 * `data-sgs-slider-momentum="true"`, read only by this file. Deliberately NOT
 * a `data-sgs-fx*` name: the registry sniffs rendered markup for `data-sgs-fx`
 * to decide what to enqueue, so any name in that family would resurrect the
 * dead-weight enqueue this change exists to remove. See the "Drag momentum"
 * block below `endDrag()` for the implementation and its reduced-motion note.
 */

/**
 * Are we running inside wp-admin (the block editor) rather than the frontend?
 *
 * WordPress loads a block's `viewScriptModule` in the EDITOR as well as on the
 * frontend, but `SGS_Motion_Registry` deliberately registers/enqueues the Tier G
 * modules on the frontend only (`is_admin()` gate) — so in the editor the
 * import map contains no `@sgs/gsap-*` entries and any dynamic import of one
 * throws. Verified live 2026-07-31: the editor's import map held exactly
 * `@wordpress/route`, `@wordpress/latex-to-mathml`, `@wordpress/interactivity`
 * and `@sgs/gsap` — none of the plugin modules.
 *
 * Rather than register frontend motion modules into wp-admin (which would ship
 * animation machinery into an editing surface that must never animate — Spec 38
 * §9 "never active in editor or wp-admin"), the view module simply declines to
 * boot its motion layer there.
 *
 * @return {boolean} True when running in wp-admin.
 */
function isEditorSurface() {
	return (
		document.body?.classList.contains( 'wp-admin' ) ||
		!! document.getElementById( 'wpwrap' ) ||
		// The editor CANVAS is a same-origin iframe whose body carries neither
		// `wp-admin` nor `#wpwrap`, so those two checks alone miss it. These are
		// the canvas's own markers. Checked 2026-07-31 because the editor loads
		// block view modules INTO that iframe, which is exactly where an
		// unguarded motion boot would run.
		!! document.querySelector( '.block-editor-iframe__body, .editor-styles-wrapper' ) ||
		document.body?.classList.contains( 'block-editor-iframe__body' )
	);
}

const sliders = document.querySelectorAll( '.sgs-testimonial-slider' );

sliders.forEach( ( slider ) => {
	const track = slider.querySelector( '.sgs-testimonial-slider__track' );
	const originalSlides = Array.from(
		slider.querySelectorAll( '.sgs-testimonial-slider__slide' )
	);
	const prevBtn = slider.querySelector(
		'.sgs-testimonial-slider__arrow--prev'
	);
	const nextBtn = slider.querySelector(
		'.sgs-testimonial-slider__arrow--next'
	);
	const dots = slider.querySelectorAll( '.sgs-testimonial-slider__dot' );
	const controls = slider.querySelector(
		'.sgs-testimonial-slider__controls'
	);

	if ( ! track || originalSlides.length === 0 ) {
		return;
	}

	const shouldAutoplay = slider.dataset.autoplay === 'true';
	const speed = Number.parseInt( slider.dataset.speed || '5000', 10 );
	const visibleRaw = Number.parseInt( slider.dataset.slides || '1', 10 ) || 1;
	const prefersReducedMotion = globalThis.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	const total = originalSlides.length;
	const cloneCount = total > 1 ? Math.min( visibleRaw, total ) : 0;

	let currentIndex = 0;
	let visualIndex = cloneCount; // position inside the padded list
	let slideStep = 0; // px — one slide's width + gap
	let autoplayTimer = null;
	let isPaused = false;

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
	 * Clone a slide for the loop padding — inert, unfocusable, no duplicate id.
	 *
	 * @param {HTMLElement} original Real slide to clone.
	 * @return {HTMLElement} Cloned slide.
	 */
	function cloneSlide( original ) {
		const clone = original.cloneNode( true );
		clone.removeAttribute( 'id' );
		clone.setAttribute( 'aria-hidden', 'true' );
		clone.setAttribute( 'inert', '' );
		clone.dataset.clone = 'true';
		clone
			.querySelectorAll( 'a, button, input, select, textarea' )
			.forEach( ( el ) => el.setAttribute( 'tabindex', '-1' ) );
		return clone;
	}

	/* Build the transform track: move real slides into a new list wrapper,
	 * pad it with clones at both ends so the loop can wrap seamlessly. */
	const list = document.createElement( 'div' );
	list.className = 'sgs-testimonial-slider__list';
	originalSlides.forEach( ( slide ) => list.appendChild( slide ) );

	if ( cloneCount > 0 ) {
		originalSlides
			.slice( -cloneCount )
			.forEach( ( slide ) =>
				list.insertBefore( cloneSlide( slide ), list.firstChild )
			);
		originalSlides
			.slice( 0, cloneCount )
			.forEach( ( slide ) => list.appendChild( cloneSlide( slide ) ) );
	}

	track.appendChild( list );

	/**
	 * Measure one real slide's rendered width + the list's gap, in px.
	 * Re-run on resize since flex-basis is a percentage of the viewport width.
	 */
	function measure() {
		const sample = list.querySelector(
			'.sgs-testimonial-slider__slide:not([data-clone])'
		);
		if ( ! sample ) {
			return;
		}
		const gapPx = Number.parseFloat( getComputedStyle( list ).gap ) || 0;
		slideStep = sample.getBoundingClientRect().width + gapPx;
	}

	/**
	 * True when a visual position sits inside the clone padding, not the
	 * real slide range.
	 *
	 * @param {number} index Visual (padded-list) index.
	 * @return {boolean} Whether index is in a clone zone.
	 */
	function isInCloneZone( index ) {
		return index < cloneCount || index >= cloneCount + total;
	}

	/**
	 * If the current visual position landed in a clone, snap (no transition)
	 * back to the equivalent real position so the loop reads as continuous.
	 */
	function resetIfInCloneZone() {
		if ( ! isInCloneZone( visualIndex ) ) {
			return;
		}
		visualIndex = cloneCount + wrapIndex( visualIndex - cloneCount );
		list.classList.add( 'no-transition' );
		list.style.setProperty(
			'--sgs-slider-offset',
			`${ -( visualIndex * slideStep ) }px`
		);
		void list.offsetWidth; // force reflow before re-enabling the transition
		list.classList.remove( 'no-transition' );
	}

	/**
	 * Paint the track at the current visualIndex.
	 *
	 * @param {boolean} animate Whether to transition (false = instant snap).
	 */
	function render( animate ) {
		const useTransition = animate && ! prefersReducedMotion;
		list.classList.toggle( 'no-transition', ! useTransition );
		list.style.setProperty(
			'--sgs-slider-offset',
			`${ -( visualIndex * slideStep ) }px`
		);
		updateDots();
		if ( ! useTransition ) {
			resetIfInCloneZone();
		}
	}

	list.addEventListener( 'transitionend', ( e ) => {
		if ( e.target === list && e.propertyName === 'transform' ) {
			resetIfInCloneZone();
		}
	} );

	/**
	 * Move to a target real slide index, picking whichever equivalent
	 * padded-list position is nearest the current one (shortest visual hop).
	 *
	 * @param {number} targetIndex Target slide index (may be out of range — wraps).
	 */
	function goToSlide( targetIndex ) {
		currentIndex = wrapIndex( targetIndex );

		if ( cloneCount > 0 ) {
			const base = cloneCount + currentIndex;
			let best = base;
			let bestDist = Math.abs( base - visualIndex );
			[ base - total, base + total ].forEach( ( candidate ) => {
				const dist = Math.abs( candidate - visualIndex );
				if ( dist < bestDist ) {
					bestDist = dist;
					best = candidate;
				}
			} );
			visualIndex = best;
		} else {
			visualIndex = currentIndex;
		}

		render( true );
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

	/*
	 * Keyboard navigation for the dot group (ARIA tab pattern).
	 * Left/Right arrow keys move between dots and navigate slides.
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

	/* Touch/pointer swipe — native scroll no longer provides this. */
	let isDragging = false;
	let dragStartX = 0;
	let dragDelta = 0;

	/*
	 * Drag momentum (Spec 38 FR-38-13) — see the file docblock for why this
	 * lives here rather than in the shared fx-draggable.js runtime, and why
	 * the marker is block-private `data-sgs-slider-momentum` rather than a
	 * `data-sgs-fx*` name. Nothing below fires for an instance that left the
	 * inspector toggle off, so a page with no opted-in slider never even
	 * attempts the dynamic import (fail-open + zero-byte-when-unused,
	 * Spec 38 §4.4).
	 */
	const wantsDragMomentum = 'true' === track.dataset.sgsSliderMomentum;
	// A plain tracked object, not a DOM property — InertiaPlugin.track() can
	// observe any numeric property on any object; there is nothing here that
	// needs to be an actual CSS value or element attribute.
	const velocityTracker = { x: 0 };
	let inertiaPlugin = null;

	if ( wantsDragMomentum && ! isEditorSurface() ) {
		Promise.all( [
			import( 'gsap/InertiaPlugin' ),
			import( '@sgs/motion-provider' ),
		] )
			.then( ( [ { InertiaPlugin }, { tierG } ] ) => {
				// tierG() is idempotent (provider.js tracks registration in a
				// Set) — safe to call here even if fx-draggable.js has already
				// registered the same plugin elsewhere on the page, in either
				// order.
				tierG( InertiaPlugin );
				InertiaPlugin.track( velocityTracker, 'x' );
				inertiaPlugin = InertiaPlugin;
			} )
			.catch( () => {
				// Momentum is an ENHANCEMENT: the pointer-drag above already
				// works without it, so a failed module load must degrade
				// silently rather than reject unhandled. Added 2026-07-31 after
				// the real editor threw an uncaught
				// `Failed to resolve module specifier "@sgs/gsap-inertia"` —
				// the rejection had nowhere to go because this chain had no
				// catch at all.
			} );
	}

	function endDrag() {
		if ( ! isDragging ) {
			return;
		}
		isDragging = false;
		track.classList.remove( 'is-dragging' );
		// No .no-transition removal needed here — the subsequent render( true )
		// call below (via goToSlide or directly) always sets the class to match
		// its own `animate` argument, overriding whatever drag left behind.

		let threshold = slideStep / 4;

		/*
		 * REDUCED MOTION (§10) — checked LIVE here, not cached, per the
		 * house contract (provider.js): momentum is autonomous-feeling
		 * follow-through, so §10 classifies it as the part that switches
		 * off under reduced motion. The drag itself (this whole function)
		 * is unaffected either way — dragging is user-driven input, never
		 * gated. Only the flick-sensitivity upgrade below is skipped, which
		 * is exactly the pre-existing fixed slideStep/4 threshold this
		 * block already used, honoured for a reduced-motion visitor.
		 */
		const reducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;

		if ( inertiaPlugin && ! reducedMotion ) {
			const velocity = Math.abs(
				inertiaPlugin.getVelocity( velocityTracker, 'x' )
			);
			// A deliberate flick registers even over a short drag distance —
			// real momentum feel, not just "did they drag far enough".
			if ( velocity > 800 ) {
				threshold = Math.min( threshold, slideStep / 10 );
			}
		}

		if ( dragDelta > threshold ) {
			goToSlide( currentIndex - 1 );
		} else if ( dragDelta < -threshold ) {
			goToSlide( currentIndex + 1 );
		} else {
			render( true );
		}
		dragDelta = 0;
		pausePermanently();
	}

	if ( total > 1 ) {
		track.addEventListener( 'pointerdown', ( e ) => {
			isDragging = true;
			dragStartX = e.clientX;
			dragDelta = 0;
			list.classList.add( 'no-transition' );
			track.classList.add( 'is-dragging' );
			track.setPointerCapture?.( e.pointerId );
		} );

		track.addEventListener( 'pointermove', ( e ) => {
			if ( ! isDragging ) {
				return;
			}
			dragDelta = e.clientX - dragStartX;
			list.style.setProperty(
				'--sgs-slider-offset',
				`${ -( visualIndex * slideStep ) + dragDelta }px`
			);
			// Feeds InertiaPlugin.track() above — a no-op object write when
			// the draggable opt-in is off (inertiaPlugin stays null, nothing
			// ever reads this value).
			velocityTracker.x = dragDelta;
		} );

		track.addEventListener( 'pointerup', endDrag );
		track.addEventListener( 'pointercancel', endDrag );
		track.addEventListener( 'pointerleave', endDrag );
	}

	/* Recompute on resize (debounced) — flex-basis is % of viewport width */
	let resizeTimer;
	globalThis.addEventListener( 'resize', () => {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( () => {
			measure();
			render( false );
		}, 150 );
	} );

	/* Autoplay — loops infinitely */
	function startAutoplay() {
		if ( ! shouldAutoplay || isPaused ) {
			return;
		}
		stopAutoplay();
		autoplayTimer = setInterval( () => {
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
			pauseBtn.querySelector(
				'.sgs-testimonial-slider__pause-icon'
			).textContent = '▶';
		}
	}

	function resumeAutoplay() {
		isPaused = false;
		startAutoplay();
		if ( pauseBtn ) {
			pauseBtn.setAttribute( 'aria-label', 'Pause testimonials' );
			pauseBtn.setAttribute( 'aria-pressed', 'true' );
			pauseBtn.querySelector(
				'.sgs-testimonial-slider__pause-icon'
			).textContent = '⏸';
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

		if ( controls ) {
			controls.appendChild( pauseBtn );
		} else {
			slider.appendChild( pauseBtn );
		}
	}

	/* Initialise */
	measure();
	render( false );
	startAutoplay();
} );
