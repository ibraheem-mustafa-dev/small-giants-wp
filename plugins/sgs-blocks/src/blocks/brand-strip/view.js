/**
 * SGS Brand Strip — Runtime cloning for seamless infinite scroll.
 *
 * Architecture (react-fast-marquee / Ryan Mulligan pattern):
 * 1. PHP outputs logos once inside a single .sgs-brand-strip__set
 * 2. This script measures the set width vs container width after images load
 * 3. It clones the set the minimum number of times needed to fill 2x the container
 * 4. CSS @keyframes animates translateX(-100%) on each set — the gap correction
 *    ensures a seamless loop
 *
 * This runs on the GPU compositor thread (CSS animation), not the JS main thread.
 * Zero duplication in PHP. Smart duplication in JS based on actual rendered widths.
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

	/**
	 * Measure and clone after all images in the set have loaded.
	 * Images may not have dimensions yet at DOMContentLoaded — we wait
	 * for every <img> in the set to fire its load event.
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
			Promise.all( pending ).then( setupClones );
		} else {
			setupClones();
		}
	}

	/**
	 * Calculate how many clones are needed and insert them.
	 * Formula: ceil(containerWidth / setWidth) + 1
	 * The +1 ensures there is always a full set off-screen ready to scroll in.
	 */
	function setupClones() {
		const containerWidth = strip.offsetWidth;
		const setWidth = originalSet.scrollWidth;

		if ( setWidth === 0 ) {
			return;
		}

		// How many total sets needed to fill the container + one full buffer.
		const setsNeeded = Math.ceil( containerWidth / setWidth ) + 1;

		// We already have 1 set (the original). Clone the remainder.
		const clonesToAdd = Math.max( setsNeeded - 1, 1 );

		for ( let i = 0; i < clonesToAdd; i++ ) {
			const clone = originalSet.cloneNode( true );
			clone.setAttribute( 'aria-hidden', 'true' );
			track.appendChild( clone );
		}

		// Set the CSS custom property for the gap so the keyframes can correct for it.
		const gap = parseFloat( getComputedStyle( track ).gap ) || 0;
		track.style.setProperty( '--sgs-track-gap', `${ gap }px` );

		// Start the animation. We delay applying the animation class until clones
		// are in place so the first paint is correct.
		track.classList.add( 'sgs-brand-strip__track--ready' );
	}

	// Pause on hover.
	strip.addEventListener( 'mouseenter', () => {
		track.style.animationPlayState = 'paused';
	} );
	strip.addEventListener( 'mouseleave', () => {
		track.style.animationPlayState = 'running';
	} );

	// Respect prefers-reduced-motion.
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return; // Don't initialise animation at all.
	}

	init();
} );
