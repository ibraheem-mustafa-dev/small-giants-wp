/**
 * SGS motion — wave-gradient boot module (Spec 38 FR-38-31). Tier W.
 *
 * The `@sgs/fx-wave-gradient` script module the PHP motion registry enqueues
 * when a page renders a block carrying `data-sgs-fx="wave-gradient"`. It owns
 * the LIFECYCLE; `webgl/wave-gradient.js` owns the pixels.
 *
 * ── THIS EFFECT ANIMATES ON ITS OWN, SO IT OWES SC 2.2.2 AN ANSWER ────────
 *
 * Bean's ruling (2026-08-25): model stripe.com, which animates autonomously
 * rather than following a pointer. That choice fixes the mobile problem — a
 * cursor effect shows nothing at all on a phone, which is most client traffic —
 * but it engages WCAG SC 2.2.2 (Pause, Stop, Hide): motion that starts
 * automatically, runs beyond five seconds, and is presented IN PARALLEL WITH
 * OTHER CONTENT. A gradient behind a hero headline is the textbook case of
 * "in parallel with", so the "it's decorative" defence does not hold here.
 *
 * ⛔ `prefers-reduced-motion` DOES NOT DISCHARGE 2.2.2 on its own. It is an
 * opt-out for people who already found and set it; the criterion asks for a
 * mechanism on the page. Both ship:
 *   · a real, keyboard-reachable pause control the render layer emits, and
 *   · reduced-motion, which stops the loop before it ever starts.
 *
 * Three further stops exist for POWER, not compliance — continuous animation
 * prevents the CPU/GPU idling, which is the dominant battery cost of a page:
 *   · IntersectionObserver — off-screen means no frames at all
 *   · visibilitychange — a backgrounded tab draws nothing
 *   · a lost context that never restores gives up rather than retrying forever
 *
 * ── FAIL-OPEN ─────────────────────────────────────────────────────────────
 *
 * The canvas is added and revealed ONLY after a successful first draw. No
 * WebGL2, a shader that will not compile, a program that will not link, or JS
 * that never runs all leave the stylesheet's static gradient visible — built
 * from the SAME custom properties, so it carries the client's own colours.
 *
 * @package
 */

import { createWaveGradient, WAVE_LAYERS } from './webgl/wave-gradient';
import { prefersReducedMotion } from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="wave-gradient"]';

/** Live instances, so a bfcache restore can tear down before re-init. */
let instances = [];

/**
 * Parse `#rrggbb` (or `#rgb`) into 0-1 RGB. Returns null on anything else, so
 * a malformed value falls back rather than painting black.
 *
 * @param {string} hex Colour.
 * @return {number[]|null} [r,g,b] 0-1, or null.
 */
function hexToRgb( hex ) {
	if ( typeof hex !== 'string' ) {
		return null;
	}
	let h = hex.trim().replace( /^#/, '' );
	if ( h.length === 3 ) {
		h = h[ 0 ] + h[ 0 ] + h[ 1 ] + h[ 1 ] + h[ 2 ] + h[ 2 ];
	}
	if ( ! /^[0-9a-f]{6}$/i.test( h ) ) {
		return null;
	}
	return [
		parseInt( h.slice( 0, 2 ), 16 ) / 255,
		parseInt( h.slice( 2, 4 ), 16 ) / 255,
		parseInt( h.slice( 4, 6 ), 16 ) / 255,
	];
}

/**
 * Read the four colours off the element's own computed custom properties.
 *
 * Deliberately read from COMPUTED STYLE rather than from data attributes: the
 * client may pick a palette SLUG, which resolves to a `var(--wp--preset--...)`
 * the stylesheet knows and JS does not. Reading the computed value means
 * re-theming a site re-colours the gradient with no JS change.
 *
 * @param {HTMLElement} el The marked element.
 * @return {number[][]|null} [base, l1, l2, l3] as 0-1 RGB, or null if unusable.
 */
function readColours( el ) {
	const cs = getComputedStyle( el );
	const out = [];
	for ( let i = 0; i <= WAVE_LAYERS; i++ ) {
		const name = i === 0 ? '--sgs-wave-base' : `--sgs-wave-${ i }`;
		const rgb = hexToRgb( cs.getPropertyValue( name ) );
		if ( ! rgb ) {
			return null;
		}
		out.push( rgb );
	}
	return out;
}

/**
 * Attach one instance.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object|null} A teardown record, or null if it could not start.
 */
function attach( el ) {
	const colours = readColours( el );
	if ( ! colours ) {
		return null;
	}

	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-wave-gradient__canvas';
	// aria-hidden: it is decoration with no informational content, and the
	// pause control is the only part a screen reader needs to reach.
	canvas.setAttribute( 'aria-hidden', 'true' );

	const speed = parseFloat( el.getAttribute( 'data-sgs-fx-wave-speed' ) );
	const amplitude = parseFloat( el.getAttribute( 'data-sgs-fx-wave-amplitude' ) );

	const gradient = createWaveGradient( canvas, {
		colours,
		amplitude: isNaN( amplitude )
			? undefined
			: Math.max( 0, Math.min( 1, amplitude / 100 ) ),
		onLost: () => stop(),
	} );
	if ( ! gradient ) {
		return null;
	}

	const rate = isNaN( speed ) ? 1 : Math.max( 0.1, Math.min( 3, speed / 50 ) );

	let frame = null;
	let visible = false;
	let paused = el.getAttribute( 'data-sgs-wave-paused' ) === '1';
	let started = false;
	let elapsed = 0;
	let last = 0;

	const sizeToElement = () => {
		const rect = el.getBoundingClientRect();
		gradient.resize( rect.width, rect.height, window.devicePixelRatio );
	};

	const tick = ( now ) => {
		if ( ! last ) {
			last = now;
		}
		// Accumulate ELAPSED time rather than using `now` directly, so pausing
		// and resuming continues from where it stopped instead of jumping
		// forward by however long the tab was hidden.
		elapsed += ( now - last ) * 0.001 * rate;
		last = now;
		if ( ! gradient.draw( elapsed ) ) {
			stop();
			return;
		}
		if ( ! started ) {
			started = true;
			// Revealed only after a draw actually succeeded — until this
			// moment the CSS fallback is what the visitor sees.
			el.setAttribute( 'data-sgs-wave-active', '1' );
		}
		frame = requestAnimationFrame( tick );
	};

	function start() {
		if ( frame !== null || paused || ! visible || document.hidden ) {
			return;
		}
		if ( prefersReducedMotion() ) {
			// Draw ONE frame and stop. Reduced motion should not mean a blank
			// section — it means a still gradient, which is a legitimate
			// finished state (§10 SIMPLIFY, never suppress).
			sizeToElement();
			if ( gradient.draw( 0 ) ) {
				el.setAttribute( 'data-sgs-wave-active', '1' );
			}
			return;
		}
		last = 0;
		frame = requestAnimationFrame( tick );
	}

	function stop() {
		if ( frame !== null ) {
			cancelAnimationFrame( frame );
			frame = null;
		}
	}

	const observer = new IntersectionObserver(
		( entries ) => {
			visible = entries.some( ( e ) => e.isIntersecting );
			if ( visible ) {
				sizeToElement();
				start();
			} else {
				stop();
			}
		},
		{ rootMargin: '100px' }
	);
	observer.observe( el );

	const onVisibility = () => ( document.hidden ? stop() : start() );
	document.addEventListener( 'visibilitychange', onVisibility );

	const resizeObserver = new ResizeObserver( () => {
		sizeToElement();
		// Redraw immediately at the new size even while paused, or a resize
		// would leave a stretched last frame on screen.
		if ( frame === null ) {
			gradient.draw( elapsed );
		}
	} );
	resizeObserver.observe( el );

	// The pause control the render layer emitted. Wired here rather than in
	// PHP so it is inert until JS proves it can actually pause something.
	const toggle = el.querySelector( '[data-sgs-wave-toggle]' );
	const onToggle = () => {
		paused = ! paused;
		el.setAttribute( 'data-sgs-wave-paused', paused ? '1' : '0' );
		toggle.setAttribute( 'aria-pressed', paused ? 'true' : 'false' );
		if ( paused ) {
			stop();
		} else {
			start();
		}
	};
	if ( toggle ) {
		toggle.hidden = false;
		toggle.addEventListener( 'click', onToggle );
	}

	el.appendChild( canvas );
	sizeToElement();
	start();

	return {
		destroy: () => {
			stop();
			observer.disconnect();
			resizeObserver.disconnect();
			document.removeEventListener( 'visibilitychange', onVisibility );
			if ( toggle ) {
				toggle.removeEventListener( 'click', onToggle );
			}
			gradient.destroy();
			canvas.remove();
			el.removeAttribute( 'data-sgs-wave-active' );
		},
	};
}

/**
 * Attach every marked element on the page.
 *
 * @return {void}
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		const instance = attach( el );
		if ( instance ) {
			instances.push( instance );
		}
	} );
}

/**
 * Tear every instance down.
 *
 * @return {void}
 */
function teardown() {
	instances.forEach( ( i ) => i.destroy() );
	instances = [];
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code. GPU contexts do not reliably survive that, so the
 * safe move is a full teardown and re-boot rather than trusting the old one.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
