/**
 * SGS Brand Strip — Runtime cloning for seamless infinite scroll.
 *
 * How it works:
 * 1. PHP outputs logos once inside a single .sgs-brand-strip__set
 * 2. This script waits for images to load, measures one set's pixel width
 * 3. Clones the set enough times to fill the container + one off-screen buffer
 * 4. Sets --sgs-scroll-distance to the exact pixel width of one set + gap
 * 5. CSS @keyframes translates by that exact distance — seamless loop
 *
 * Works regardless of logo count, container width, screen size, or nesting
 * (columns, groups, sidebars). The pixel measurement makes it universal.
 *
 * Animation runs on the GPU compositor thread (CSS transform), not JS.
 *
 * Pausing (WCAG 2.2.2) goes through the shared runtime (src/shared/motion-pause): the pause /
 * play button holds a pause until pressed again, keyboard focus inside the strip always pauses
 * it, and hover or a touch tap pause it unless the "Pause on hover" control is off.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

import { initSeparators } from '../../shared/separators';
import { prefersReducedMotion } from '../../shared/effects/motion-utils.js';
import { initMotionPause } from '../../shared/motion-pause/index.js';

// Lines between brands on a static strip, in a browser without CSS gap decorations.
initSeparators();

// How long to wait for logo images before measuring anyway, in milliseconds.
const IMAGE_WAIT_MS = 1500;

const strips = document.querySelectorAll( '.sgs-brand-strip--scrolling' );

strips.forEach( ( strip ) => {
	const track = strip.querySelector( '.sgs-brand-strip__track' );
	const originalSet = strip.querySelector( '.sgs-brand-strip__set' );

	if ( ! track || ! originalSet || originalSet.children.length === 0 ) {
		return;
	}

	// Respect prefers-reduced-motion — bail before any work.
	if ( prefersReducedMotion() ) {
		return;
	}

	// Per-strip state. Each strip in the page gets its own pair because this
	// callback body runs once per strip.
	let measured = false;
	let widthObserver = null;

	/**
	 * Wait for the images in the set to load, up to IMAGE_WAIT_MS, before measuring.
	 * Images without dimensions at parse time would give wrong widths.
	 */
	function init() {
		const images = originalSet.querySelectorAll( 'img' );
		const pending = [];

		images.forEach( ( img ) => {
			if ( ! img.complete ) {
				pending.push(
					new Promise( ( resolve ) => {
						img.addEventListener( 'load', resolve, { once: true } );
						img.addEventListener( 'error', resolve, { once: true } );
					} )
				);
			}
		} );

		if ( pending.length === 0 ) {
			measure();
			return;
		}

		// The wait is capped because some logos never fetch at all. One set is
		// wider than the strip, which is overflow:hidden, so the logos past its
		// right edge are outside the viewport horizontally and a lazy image
		// there is never fetched by the browser — no scroll can reveal it, so
		// its `load` event never fires. An uncapped wait on every image would
		// leave the strip measured never and the animation never started.
		// Measuring on the already-loaded logos gives the correct set width.
		Promise.race( [
			Promise.all( pending ),
			new Promise( ( resolve ) => {
				setTimeout( resolve, IMAGE_WAIT_MS );
			} ),
		] ).then( measure );
	}

	/**
	 * Measure one set, clone to fill, set the scroll distance, start animation.
	 */
	function measure() {
		// Clones are inserted once per strip, however many times a width
		// reading or a late image arrival calls back in here.
		if ( measured ) {
			return;
		}

		const containerWidth = strip.offsetWidth;
		const gap = parseFloat( getComputedStyle( track ).gap ) || 0;
		const setWidth = originalSet.getBoundingClientRect().width;

		if ( setWidth === 0 ) {
			// A zero width is a reading taken too early, not a permanent state:
			// a collapsed or hidden ancestor measures zero until it is laid out.
			// Watch the set and measure again once it has a real width.
			if ( ! widthObserver && 'undefined' !== typeof ResizeObserver ) {
				widthObserver = new ResizeObserver( () => {
					measure();
				} );
				widthObserver.observe( originalSet );
			}
			return;
		}

		measured = true;
		if ( widthObserver ) {
			widthObserver.disconnect();
			widthObserver = null;
		}

		// The distance the animation must travel for one seamless cycle:
		// one full set width + one gap (the gap between this set and the next).
		const scrollDistance = setWidth + gap;

		// How many total sets are needed to guarantee no visible empty space:
		// enough to fill the container, plus one full off-screen buffer.
		const setsNeeded = Math.ceil( containerWidth / setWidth ) + 1;
		const clonesToAdd = Math.max( setsNeeded - 1, 1 );

		for ( let i = 0; i < clonesToAdd; i++ ) {
			const clone = originalSet.cloneNode( true );
			clone.setAttribute( 'aria-hidden', 'true' );
			// aria-hidden alone leaves a linked logo in the tab order inside hidden content:
			// `inert` takes the copy out of focus and the accessibility tree, tabindex=-1
			// covers engines without `inert`.
			clone.setAttribute( 'inert', '' );
			clone.querySelectorAll( 'a, button, [tabindex]' ).forEach( ( el ) => {
				el.setAttribute( 'tabindex', '-1' );
			} );
			track.appendChild( clone );
		}

		// Tell the CSS keyframe exactly how far to move (pixels).
		track.style.setProperty( '--sgs-scroll-distance', `${ scrollDistance }px` );

		// Start animation only after clones are in place.
		track.classList.add( 'sgs-brand-strip__track--ready' );
		pauser.setRunning( true );
	}

	// Pause: the button (persistent), keyboard focus (always), and hover or a touch tap unless
	// the "Pause on hover" control is off (the root then carries `.sgs-brand-strip--no-pause`,
	// see render.php). A touch device has no hover, so a tap toggles the pause instead. The
	// paused state is a CLASS, not an inline style property (no-inline migration contract §A:
	// `.style.animationPlayState` would write a real inline CSS declaration;
	// `.sgs-brand-strip__track--paused` is a scoped class rule in style.css instead).
	const hoverPauses = ! strip.classList.contains( 'sgs-brand-strip--no-pause' );
	const pauser = initMotionPause( strip, {
		hover: hoverPauses,
		touch: hoverPauses ? 'toggle' : 'none',
		onChange: ( paused ) => {
			track.classList.toggle( 'sgs-brand-strip__track--paused', paused );
		},
	} );

	init();
} );
