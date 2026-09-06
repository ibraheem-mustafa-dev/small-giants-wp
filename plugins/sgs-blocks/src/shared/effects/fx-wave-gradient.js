/**
 * SGS motion — wave-gradient boot module (Spec 38 FR-38-31). Tier W.
 *
 * The `@sgs/fx-wave-gradient` script module the PHP motion registry enqueues
 * when a page renders a block carrying `data-sgs-fx="wave-gradient"`. It owns
 * the LIFECYCLE; `webgl/wave-gradient.js` owns the pixels.
 *
 * ── THIS EFFECT ANIMATES ON ITS OWN, SO IT OWES SC 2.2.2 AN ANSWER ────────
 *
 * Bean's ruling (2026-08-25): animate autonomously rather than following a
 * pointer. That choice fixes the mobile problem — a
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

// WAVE_LAYERS is the colour-slot count (base + 3), shared by both renderers.
// ⚠ createWaveGradient is deliberately NOT imported: the four non-aurora
// variants are painted by the stylesheet, so the original mesh renderer has
// no remaining caller. It is left on disk rather than deleted here — that is
// its own reviewable change, and it carries the MIT attribution the effect
// depends on.
import { WAVE_LAYERS } from './webgl/wave-gradient';
import { createAurora } from './webgl/aurora';
import { prefersReducedMotion } from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="wave-gradient"]';

/** Live instances, so a bfcache restore can tear down before re-init. */
let instances = [];

/**
 * One shared, never-rendered element used to ask the browser itself whether a
 * CSS colour string is valid. `display: none` still resolves computed colour
 * values (it only removes the box), so a single hidden, document-attached
 * probe is reused across every parse rather than creating one per call.
 *
 * @return {HTMLElement} The probe element.
 */
let colourProbe = null;
function getColourProbe() {
	if ( ! colourProbe ) {
		colourProbe = document.createElement( 'span' );
		colourProbe.style.display = 'none';
		document.body.appendChild( colourProbe );
	}
	return colourProbe;
}

/**
 * Parse a computed `rgb(...)`/`rgba(...)` string into 0-1 RGB.
 *
 * @param {string} str The computed colour string.
 * @return {number[]|null} [r,g,b] 0-1, or null if it did not match.
 */
function parseRgbString( str ) {
	const m = typeof str === 'string' && str.match(
		/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i
	);
	if ( ! m ) {
		return null;
	}
	return [
		parseFloat( m[ 1 ] ) / 255,
		parseFloat( m[ 2 ] ) / 255,
		parseFloat( m[ 3 ] ) / 255,
	];
}

/**
 * One shared, never-attached 1x1 canvas used to resolve any CSS colour syntax
 * `getComputedStyle().color` returned in its OWN function form (`oklch()`,
 * `color(display-p3 ...)`, `lab()`, …) instead of normalising to `rgb()`.
 * Canvas 2D's `fillStyle` setter resolves ANY valid CSS colour to sRGB bytes
 * internally, regardless of colour-space syntax — this is the fallback for
 * exactly the wide-gamut case `parseRgbString()` cannot match.
 *
 * @return {CanvasRenderingContext2D|null} The 1x1 probe context, or null if
 *                                          canvas 2D is unavailable.
 */
let colourCanvasCtx = null;
function getColourCanvasCtx() {
	if ( colourCanvasCtx === null ) {
		const canvas = document.createElement( 'canvas' );
		canvas.width = 1;
		canvas.height = 1;
		colourCanvasCtx = canvas.getContext( '2d' ) || false;
	}
	return colourCanvasCtx || null;
}

/**
 * Resolve a computed colour string to 0-1 RGB via canvas 2D, for colour
 * syntaxes `parseRgbString()` cannot match (`oklch()`, `color(display-p3 …)`,
 * wide-gamut forms a browser may return instead of normalising to `rgb()`).
 *
 * Only ever called on a string the DOM probe already accepted as valid CSS
 * (`parseCssColour()`'s `el.style.color === ''` check gates that) — so the
 * validity question is already settled; this only needs to resolve the VALUE.
 * `ctx.fillStyle` is reset to a known sentinel before each assignment because
 * an invalid assignment is silently ignored and the property keeps its
 * previous value, same "reset before assign" discipline the DOM probe uses.
 *
 * @param {string} str The computed colour string.
 * @return {number[]|null} [r,g,b] 0-1, or null if it could not be resolved.
 */
function parseViaCanvas( str ) {
	const ctx = getColourCanvasCtx();
	if ( ! ctx || typeof str !== 'string' || ! str.trim() ) {
		return null;
	}
	ctx.fillStyle = '#000000';
	ctx.fillStyle = str.trim();
	ctx.fillRect( 0, 0, 1, 1 );
	const [ r, g, b ] = ctx.getImageData( 0, 0, 1, 1 ).data;
	return [ r / 255, g / 255, b / 255 ];
}

/**
 * Parse ANY valid CSS colour (hex, `rgb()`, `hsl()`, `oklch()`, named
 * colours, …) into 0-1 RGB. Returns null on anything invalid.
 *
 * Deliberately does NOT use the naive
 * `el.style.color = raw; getComputedStyle(el).color` pattern on its own —
 * that pattern cannot tell an invalid value from a legitimate black: an
 * invalid assignment leaves the CSS property unset, and the browser then
 * reports its OWN default for the unset property (often black), which is
 * indistinguishable from a real black. Checking `el.style.color === ''`
 * IMMEDIATELY after assignment is what actually distinguishes them — an
 * empty string means the browser rejected the value outright, before any
 * computed-style fallback ever comes into play.
 *
 * @param {string} raw Colour, in any valid CSS colour syntax.
 * @return {number[]|null} [r,g,b] 0-1, or null.
 */
function parseCssColour( raw ) {
	if ( typeof raw !== 'string' || ! raw.trim() ) {
		return null;
	}
	const probe = getColourProbe();
	probe.style.color = '';
	probe.style.color = raw.trim();
	if ( probe.style.color === '' ) {
		// The browser refused the assignment outright — invalid CSS.
		return null;
	}
	const computed = getComputedStyle( probe ).color;
	const rgb = parseRgbString( computed );
	if ( rgb ) {
		return rgb;
	}
	// The DOM probe already proved this is valid CSS, but the browser
	// returned it in its OWN function form (oklch()/color()/wide-gamut)
	// rather than normalising to rgb() — resolve it via canvas 2D instead.
	return parseViaCanvas( computed );
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
		const raw = cs.getPropertyValue( name );
		const rgb = parseCssColour( raw );
		if ( ! rgb ) {
			// Exactly one warning per element per attach() call — this is an
			// early return, so at most one colour failure is ever reported
			// even though up to 4 properties are checked.
			// eslint-disable-next-line no-console
			console.warn(
				`SGS wave-gradient: could not parse colour "${ raw.trim() }" for ${ name } — effect not started.`,
				el
			);
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
	/*
	 * Variant gate. Four of the five variants are drawn entirely in CSS, so
	 * they must NOT create a canvas, probe WebGL, or install a rAF loop — the
	 * stylesheet has already painted them from the root's variant class. Only
	 * "aurora" needs the shader, because filamentary curtains require
	 * per-pixel noise and domain warping that CSS cannot express (D838).
	 *
	 * Returning null here is the correct "nothing to tear down" signal that
	 * boot() already expects; it is NOT a failure path, and it deliberately
	 * leaves data-sgs-wave-active unset so the CSS keeps painting.
	 */
	/*
	 * Aurora and Ink are the SAME shader. They differ only in the colours the
	 * stylesheet hands it: on a dark ground the curtains add light and read as
	 * an aurora; on a light ground they darken and read as pigment settling
	 * into paper. The shader measures the base colour and picks the
	 * compositing itself, so there is one code path and no mode flag.
	 */
	const variant = ( el.getAttribute( 'data-sgs-fx-wave-variant' ) || 'pastel' ).trim();
	if ( variant !== 'aurora' && variant !== 'ink' ) {
		return null;
	}

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

	/*
	 * Only the aurora variant reaches here, so the renderer choice is a
	 * straight swap rather than a branch: both handles expose the identical
	 * draw / resize / destroy contract, and every lifecycle call below is
	 * written against that contract, not against either implementation.
	 */
	const createRenderer = createAurora;
	const gradient = createRenderer( canvas, {
		colours,
		amplitude: isNaN( amplitude )
			? undefined
			: Math.max( 0, Math.min( 1, amplitude / 100 ) ),
		// Context loss is the ONE stop() caller that must also drop the
		// active flag — every other stop() (pause, off-screen, tab-hidden,
		// draw-failure) is a temporary halt the CSS fallback must NOT flash
		// under. Losing the context is permanent from this instance's point
		// of view, so the visitor must see the fallback again, not a dead
		// rectangle over it.
		onLost: () => {
			stop();
			el.removeAttribute( 'data-sgs-wave-active' );
		},
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
