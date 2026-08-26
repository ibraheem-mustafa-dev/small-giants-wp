/**
 * SGS motion — particle-trail boot module (Spec 38 §3.4, FR-38-32). Tier V.
 *
 * The `@sgs/fx-particles` script module the PHP motion registry enqueues
 * when a page renders a block carrying `data-sgs-fx="particles"`. It finds
 * those elements and drives them; the pool/integrator/canvas live in
 * `particles.js`, which knows nothing about blocks or WordPress.
 *
 * ── ONE DOCUMENT LISTENER, NOT N ELEMENT LISTENERS ────────────────────────
 * Same reasoning as `fx-magnet.js` — read that file's docblock for the full
 * argument. In short: an element-scoped `mousemove` would multiply
 * per-frame cost by the number of particle emitters on the page. This
 * module attaches exactly ONE `mousemove` listener, rAF-throttled once,
 * and every registered emitter's `push()` is called from that single tick.
 *
 * ── A COARSE STATIC GATE, ON TOP OF THE REACTIVE ONE ──────────────────────
 * `magnet.js` gates only reactively, via `isTouchInput()`, because its cost
 * if mis-gated is a handful of custom-property writes nobody sees. This
 * effect is heavier — it creates a `<canvas>` and a 150-particle pool per
 * instance — so `supportsFinePointer()` is checked ONCE at boot, before any
 * canvas exists, as a coarse pre-filter that skips instantiating the whole
 * effect on an all-touch device. Per `motion-utils.js`'s own docblock this
 * static check must never stand ALONE for a pointer-driven effect (a
 * hybrid trackpad+touchscreen device can report fine-pointer and still be
 * poked with a finger), so `isTouchInput()` remains the REACTIVE gate
 * inside the shared move handler below — the two together, never one
 * instead of the other.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ─────────────────────────────
 * It writes no CSS. `assets/css/fx-particles.css` owns the canvas's
 * position/inset/z-index/pointer-events (Spec 32: JS writes buffer-size
 * ATTRIBUTES only, never inline `style`), and the render layer owns
 * `data-sgs-fx`. Under `prefers-reduced-motion` this module creates NO
 * instances and attaches NO listener at all — byte-identical to the no-JS
 * state, the same SUPPRESS contract `magnet.js` documents.
 *
 * @package
 */

import { createParticles } from './particles';
import {
	prefersReducedMotion,
	rafThrottle,
	isTouchInput,
	supportsFinePointer,
} from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="particles"]';

/** The only three shipped presets — anything else falls back to 'sparks'. */
const VALID_PRESETS = [ 'sparks', 'gravity-dots', 'ripple' ];

/** Live instances, so a bfcache restore can tear down before re-init. */
let instances = [];

/**
 * PROBE HANDLE — read-only, permanent, no side effects (D807).
 *
 * `createParticles()` exposes per-emitter `stats()`, but a live browser probe
 * runs in page scope and cannot import a module, so the instance list needs a
 * window handle to be reachable at all. This is that handle and nothing more:
 * it returns the SAME array the module already keeps, so it adds no state to
 * go stale, and there is no setter.
 *
 * ⛔ Instrument THE MODULE through this, never the page. A global rAF counter
 * catches every other effect on the page and proves nothing about particles.
 *
 * It is also the negative control's instrument: a container carrying no
 * particle effect must appear in this list ZERO times, which is a stronger
 * statement than "its canvas looks empty".
 *
 * @return {Array<{el: Element, particles: Object}>} Live emitters.
 */
if ( typeof window !== 'undefined' ) {
	window.sgsFxParticles = { instances: () => instances };
}

/** The single shared pointer driver, or null when nothing is registered. */
let onPointerMove = null;

/**
 * Read one instance's options off its own attributes.
 *
 * Values are bounded rather than trusted, same reasoning `fx-magnet.js`'s
 * `readOptions()` documents: an absent attribute falls back to the preset's
 * own default (`undefined` passed through), never to a hand-picked
 * fallback number here that could drift from `particles.js`'s own table.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object} Options for {@link createParticles}.
 */
function readOptions( el ) {
	const preset = el.getAttribute( 'data-sgs-fx-particle-preset' );
	const density = parseFloat(
		el.getAttribute( 'data-sgs-fx-particle-density' )
	);
	const size = parseFloat( el.getAttribute( 'data-sgs-fx-particle-size' ) );

	return {
		preset: VALID_PRESETS.includes( preset ) ? preset : 'sparks',
		density: Number.isNaN( density ) ? undefined : density,
		size: Number.isNaN( size ) ? undefined : size,
	};
}

/**
 * Whether the pointer at (clientX, clientY) is over an element's own box.
 * This is a hover-triggered effect (§ fx_effects.triggers), so a trail must
 * never paint onto an emitter the pointer is not currently over — otherwise
 * every emitter on the page would react to every mousemove anywhere.
 *
 * @param {HTMLElement} el      The emitter.
 * @param {number}      clientX Pointer clientX.
 * @param {number}      clientY Pointer clientY.
 * @return {boolean} True while the pointer is inside the element's box.
 */
function isOver( el, clientX, clientY ) {
	const rect = el.getBoundingClientRect();
	return (
		clientX >= rect.left &&
		clientX <= rect.right &&
		clientY >= rect.top &&
		clientY <= rect.bottom
	);
}

/**
 * Attach every marked element and start the shared driver.
 *
 * @return {void}
 */
function boot() {
	// SUPPRESS (§10): no instance, no canvas, no listener. Mirrors
	// `magnet.js`'s reduced-motion branch exactly.
	if ( prefersReducedMotion() ) {
		return;
	}
	// Coarse static gate — see the module docblock. An all-touch device
	// never gets the canvas/pool built in the first place.
	if ( ! supportsFinePointer() ) {
		return;
	}

	const els = [ ...document.querySelectorAll( SELECTOR ) ];
	if ( ! els.length ) {
		return;
	}

	els.forEach( ( el ) => {
		instances.push( { el, particles: createParticles( el, readOptions( el ) ) } );
	} );

	onPointerMove = rafThrottle( ( event ) => {
		if ( isTouchInput() ) {
			return;
		}
		instances.forEach( ( { el, particles } ) => {
			if ( isOver( el, event.clientX, event.clientY ) ) {
				particles.push( event.clientX, event.clientY );
			}
		} );
	} );
	document.addEventListener( 'mousemove', onPointerMove );
}

/**
 * Tear every instance down and remove the shared listener.
 *
 * @return {void}
 */
function teardown() {
	if ( onPointerMove ) {
		onPointerMove.cancel();
		document.removeEventListener( 'mousemove', onPointerMove );
		onPointerMove = null;
	}
	instances.forEach( ( { particles } ) => particles.destroy() );
	instances = [];
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code, so the listener and instances would otherwise
 * survive against a DOM that may have since re-rendered. Tearing down and
 * re-booting on a persisted restore keeps the two in step, the same pattern
 * `fx-magnet.js` and `fx-wave-gradient.js` both use. On a normal load
 * `persisted` is false and this does nothing.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
