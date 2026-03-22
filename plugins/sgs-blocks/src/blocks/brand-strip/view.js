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
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const strips = document.querySelectorAll( '.sgs-brand-strip--scrolling' );

strips.forEach( ( strip ) => {
	const track = strip.querySelector( '.sgs-brand-strip__track' );
	const originalSet = strip.querySelector( '.sgs-brand-strip__set' );

	if ( ! track || ! originalSet || originalSet.children.length === 0 ) {
		return;
	}

	// Respect prefers-reduced-motion — bail before any work.
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}

	/**
	 * Wait for all images in the set to load before measuring.
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

		if ( pending.length > 0 ) {
			Promise.all( pending ).then( measure );
		} else {
			measure();
		}
	}

	/**
	 * Measure one set, clone to fill, set the scroll distance, start animation.
	 */
	function measure() {
		const containerWidth = strip.offsetWidth;
		const gap = parseFloat( getComputedStyle( track ).gap ) || 0;
		const setWidth = originalSet.getBoundingClientRect().width;

		if ( setWidth === 0 ) {
			return;
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
			track.appendChild( clone );
		}

		// Tell the CSS keyframe exactly how far to move (pixels).
		track.style.setProperty( '--sgs-scroll-distance', `${ scrollDistance }px` );

		// Start animation only after clones are in place.
		track.classList.add( 'sgs-brand-strip__track--ready' );
	}

	// Pause on hover.
	strip.addEventListener( 'mouseenter', () => {
		track.style.animationPlayState = 'paused';
	} );
	strip.addEventListener( 'mouseleave', () => {
		track.style.animationPlayState = 'running';
	} );

	init();
} );
