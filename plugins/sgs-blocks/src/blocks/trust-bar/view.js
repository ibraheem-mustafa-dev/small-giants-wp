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
 *  6. Pause on hover if data-auto-scroll-pause="true", and ALWAYS pause while keyboard
 *     focus is inside the bar (WCAG 2.2.2: moving content needs a way to stop it that
 *     does not depend on a pointer). Clones are inert, so focus never enters them.
 *
 * Marquee below a breakpoint (data-auto-scroll-below="768" | "1024"): steps 3-4 only run
 * while the viewport is narrower than that width, and re-run if the window is resized into
 * that range. Above it the badges stay a static row; the show/hide is a media query in the
 * block's scoped stylesheet (includes/helpers-trust-bar-marquee.php), this script only clones
 * the track. Without the attribute (or 0) the scroll runs at every width, as before.
 *
 * Marquee and drop coexist: while the marquee runs every badge is in the scrolling track
 * (restoreDropped() runs before cloning, so no clone inherits a hidden badge). Leaving the
 * range removes the clones and the row class, and overflow-drop.js then drops what does not
 * fit. A visible pause/play button (WCAG 2.2.2) is un-hidden only while the scroll runs; a
 * user pause persists over hover-out and focus-out.
 *
 * Loaded as a viewScriptModule (ES module, frontend only — never runs in editor).
 */

// "drop" overflow mode (overflowMode="drop") is a separate concern — kept in
// its own file to stay under the 250-line budget for this one; it self-runs
// on import.
import { restoreDropped } from './overflow-drop.js';
import { marqueeRangeQuery } from './marquee-mode.js';

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

	// null = scroll at every width. Otherwise scroll only while the viewport matches.
	const marqueeQuery = marqueeRangeQuery( wrapper );
	const inRange = () => ! marqueeQuery || marqueeQuery.matches;
	const pauseButton = wrapper.querySelector( '.sgs-trust-bar__pause' );

	// The clones sit beside the track inside its own parent (the wrapper, or the content band
	// when there is one) so the copies form one row, at every width and below a breakpoint alike.
	const cloneParent = track.parentElement || wrapper;
	// Set synchronously by start() BEFORE any await, so two matchMedia `change` events
	// (rotate / resize) that arrive while images are still loading cannot both init.
	let started = false;

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
		// The viewport may have left the marquee range while images were loading.
		if ( ! inRange() ) {
			return;
		}

		// Lay the track and its clones out as one non-shrinking nowrap row BEFORE
		// measuring, so the track is as wide as its badges. Without this the track is a
		// shrinkable flex item that is never wider than the bar, and the overflow test
		// below could never pass (scroll at every width, `below` 0, never started).
		cloneParent.classList.add( 'sgs-trust-bar__marquee-row' );

		// Idempotent: a re-run never stacks a second set of clones on the first.
		cloneParent.querySelectorAll( ':scope > [data-sgs-marquee-clone]' ).forEach( ( old ) => old.remove() );
		track.classList.remove( 'sgs-trust-bar__track--ready' );

		const containerWidth = wrapper.offsetWidth;
		const trackWidth     = track.getBoundingClientRect().width;
		// column-gap, not the gap shorthand: a "row column" pair would parse as the row gap.
		const gap            = parseFloat( getComputedStyle( track ).columnGap ) || 0;

		// Only activate scroll if items genuinely overflow the visible container.
		if ( trackWidth === 0 || containerWidth === 0 || trackWidth <= containerWidth ) {
			cloneParent.classList.remove( 'sgs-trust-bar__marquee-row' );
			setPauseButtonVisible( false );
			// Nothing scrolls, so allow a later resize into range to measure again.
			started = false;
			return;
		}

		// The scroll distance for one seamless cycle = full track width + one gap.
		const scrollDistance = trackWidth + gap;

		// Clone enough copies to guarantee the container is always covered.
		const clonesNeeded = Math.ceil( containerWidth / trackWidth ) + 1;

		for ( let i = 0; i < clonesNeeded; i++ ) {
			const clone = track.cloneNode( true );
			clone.setAttribute( 'aria-hidden', 'true' );
			clone.setAttribute( 'data-sgs-marquee-clone', '' );
			// aria-hidden alone is an ARIA violation on a subtree with focusable badges
			// (a link): keyboard focus would land in hidden content. `inert` removes the
			// subtree from the tab order and the accessibility tree; tabindex=-1 covers
			// engines without `inert`.
			clone.setAttribute( 'inert', '' );
			clone.querySelectorAll( 'a, button, input, select, textarea, [tabindex]' ).forEach( ( el ) => {
				el.setAttribute( 'tabindex', '-1' );
			} );
			// Remove the ready class from clones — only the original gets it.
			clone.classList.remove( 'sgs-trust-bar__track--ready' );
			cloneParent.appendChild( clone );
		}

		// Tell CSS exactly how far to translate (pixels).
		track.style.setProperty( '--sgs-scroll-distance', `${ scrollDistance }px` );

		// Start animation only after clones are in the DOM.
		track.classList.add( 'sgs-trust-bar__track--ready' );
		setPauseButtonVisible( true );
		syncPause();
	}

	/**
	 * Leave marquee mode: remove the clones and row layout so the badges are the
	 * plain static row again (overflow-drop.js then measures it).
	 */
	function stop() {
		started = false;
		cloneParent.querySelectorAll( ':scope > [data-sgs-marquee-clone]' ).forEach( ( old ) => old.remove() );
		cloneParent.classList.remove( 'sgs-trust-bar__marquee-row' );
		track.classList.remove( 'sgs-trust-bar__track--ready', 'is-paused' );
		track.style.removeProperty( '--sgs-scroll-distance' );
		setPauseButtonVisible( false );
	}

	// Pause on hover (controllable via block attribute), on keyboard focus (always) and
	// on the visible pause button (user choice, persists). D298 pattern: toggle a class
	// instead of writing the property inline — the declaration lives in style.css
	// (`.sgs-trust-bar__track.is-paused`), never on the element. Each cause is tracked
	// separately so leaving one does not resume a bar another is still holding.
	// Pressing play is an explicit choice: it overrides the hover and focus pause
	// (the button itself sits inside the bar, so using it always hovers or focuses
	// the bar) until both have ended.
	let hovered = false;
	let focused = false;
	let userPaused = false;
	let userPlayed = false;
	const syncPause = () =>
		track.classList.toggle( 'is-paused', userPaused || ( ! userPlayed && ( hovered || focused ) ) );
	const releasePlay = () => {
		if ( ! hovered && ! focused ) {
			userPlayed = false;
		}
	};

	function setPauseButtonVisible( visible ) {
		if ( pauseButton ) {
			pauseButton.hidden = ! visible;
		}
	}

	if ( pauseButton ) {
		pauseButton.addEventListener( 'click', () => {
			userPaused = ! userPaused;
			userPlayed = ! userPaused;
			pauseButton.setAttribute( 'aria-pressed', userPaused ? 'true' : 'false' );
			syncPause();
		} );
	}

	if ( pauseOnHover ) {
		wrapper.addEventListener( 'mouseenter', () => {
			hovered = true;
			syncPause();
		} );
		wrapper.addEventListener( 'mouseleave', () => {
			hovered = false;
			releasePlay();
			syncPause();
		} );
	}
	wrapper.addEventListener( 'focusin', () => {
		focused = true;
		syncPause();
	} );
	wrapper.addEventListener( 'focusout', ( event ) => {
		// Focus moving to another badge inside the bar is not leaving it.
		if ( event.relatedTarget && wrapper.contains( event.relatedTarget ) ) {
			return;
		}
		focused = false;
		releasePlay();
		syncPause();
	} );

	// Start now, or as soon as the viewport is in range; stop when it leaves it.
	function start() {
		if ( started || ! inRange() ) {
			return;
		}
		started = true;
		// Every badge must be in the scrolling track: bring back any the drop mode hid
		// before the track is measured and cloned.
		restoreDropped( wrapper );
		init();
	}

	function sync() {
		if ( inRange() ) {
			start();
		} else {
			stop();
		}
	}

	sync();
	if ( marqueeQuery ) {
		marqueeQuery.addEventListener( 'change', sync );
	}
} );
