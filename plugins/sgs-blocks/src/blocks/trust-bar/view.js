/**
 * SGS Trust Badges — Auto-scroll runtime.
 *
 * Activates only when `data-auto-scroll="true"` is present on the wrapper AND
 * the number of items overflows the visible columns. Follows the same pattern as
 * sgs/brand-strip (pixel-measurement + cloning for seamless infinite scroll).
 *
 * Steps:
 *  1. Find all auto-scroll-enabled trust-badge blocks.
 *  2. Bail immediately on prefers-reduced-motion.
 *  3. Measure the track's natural width after images load.
 *  4. If track width > container width (overflow): clone items, set
 *     --sgs-scroll-distance, add --ready class to start CSS animation.
 *  5. If no overflow: do nothing (badges display statically).
 *  6. Pause on hover if data-auto-scroll-pause="true".
 *
 * Loaded as a viewScriptModule (ES module, frontend only — never runs in editor).
 */

const wrappers = document.querySelectorAll( '.sgs-trust-bar[data-auto-scroll="true"]' );

wrappers.forEach( ( wrapper ) => {
	const track = wrapper.querySelector( '.sgs-trust-bar__track' );

	if ( ! track || track.children.length === 0 ) {
		return;
	}

	// Respect prefers-reduced-motion.
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}

	const pauseOnHover = wrapper.dataset.autoScrollPause !== 'false';

	/**
	 * Wait for all images inside the track to finish loading before measuring.
	 * Unloaded images report width 0, which produces wrong scroll distances.
	 */
	function init() {
		const images = track.querySelectorAll( 'img' );
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
	 * Measure overflow. If items overflow the container, clone and animate.
	 * If they fit, leave the layout static — no unnecessary animation.
	 */
	function measure() {
		const containerWidth = wrapper.offsetWidth;
		const trackWidth     = track.getBoundingClientRect().width;
		const gap            = parseFloat( getComputedStyle( track ).gap ) || 0;

		if ( trackWidth === 0 || containerWidth === 0 ) {
			return;
		}

		// Only activate scroll if items genuinely overflow the visible container.
		if ( trackWidth <= containerWidth ) {
			return;
		}

		// The scroll distance for one seamless cycle = full track width + one gap.
		const scrollDistance = trackWidth + gap;

		// Clone enough copies to guarantee the container is always covered.
		const clonesNeeded = Math.ceil( containerWidth / trackWidth ) + 1;

		for ( let i = 0; i < clonesNeeded; i++ ) {
			const clone = track.cloneNode( true );
			clone.setAttribute( 'aria-hidden', 'true' );
			// Remove the ready class from clones — only the original gets it.
			clone.classList.remove( 'sgs-trust-bar__track--ready' );
			wrapper.appendChild( clone );
		}

		// Tell CSS exactly how far to translate (pixels).
		track.style.setProperty( '--sgs-scroll-distance', `${ scrollDistance }px` );

		// Start animation only after clones are in the DOM.
		track.classList.add( 'sgs-trust-bar__track--ready' );
	}

	// Pause on hover (controllable via block attribute). D298 pattern: toggle a
	// class instead of writing the property inline — the declaration lives in
	// style.css (`.sgs-trust-bar__track.is-paused`), never on the element.
	if ( pauseOnHover ) {
		wrapper.addEventListener( 'mouseenter', () => {
			track.classList.add( 'is-paused' );
		} );
		wrapper.addEventListener( 'mouseleave', () => {
			track.classList.remove( 'is-paused' );
		} );
	}

	init();
} );
