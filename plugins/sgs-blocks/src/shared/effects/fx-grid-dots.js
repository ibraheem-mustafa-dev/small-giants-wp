/**
 * SGS motion — cursor grid-dot field boot module (Spec 38 §3.3, FR-38-33). Tier V.
 *
 * The `@sgs/fx-grid-dots` script module the PHP motion registry enqueues when a
 * page renders a block carrying `data-sgs-fx="grid-dots"`. It finds those
 * elements and drives them; the lattice/integrator/canvas live in
 * `grid-dots.js`, which knows nothing about blocks or WordPress.
 *
 * ── ONE DOCUMENT LISTENER, NOT N ELEMENT LISTENERS ────────────────────────
 * Same reasoning as `fx-particles.js` and `fx-magnet.js`. An element-scoped
 * `mousemove` would multiply per-frame cost by the number of emitters. This
 * module attaches exactly ONE `mousemove` listener, rAF-throttled once, and
 * every registered emitter is updated from that single tick.
 *
 * ── WHY THIS IS NOT A cursor-field TYPE (FR-38-32's ruling, applied) ───────
 * A dot's offset depends on its own distance to the pointer and its travel is
 * clamped to its own cell. CSS cannot compute per-cell distance, so this can
 * never be a `[data-sgs-cursor-field="X"]` paint rule. Field types are also
 * mutually exclusive, so as a type it would REPLACE a client's chosen glow
 * rather than compose with it.
 *
 * ── TWO POINTER GATES, NOT ONE ────────────────────────────────────────────
 * `supportsFinePointer()` is a COARSE static check at boot, before any canvas
 * exists, so an all-touch device never builds the lattice at all. Per
 * `motion-utils.js` that static check must never stand alone for a
 * pointer-driven effect (a hybrid trackpad+touchscreen device reports
 * fine-pointer and can still be poked with a finger), so `isTouchInput()`
 * remains the REACTIVE gate inside the shared handler. Both, never one.
 *
 * ── REDUCED MOTION (§10) ──────────────────────────────────────────────────
 * SUPPRESS: no instance, no canvas, no listener — byte-identical to the no-JS
 * state, the same contract `magnet.js` and `fx-particles.js` document. The
 * resting picture (dots at cell centres) is what a reduced-motion visitor sees,
 * and it is the same picture the effect shows before the pointer arrives, so
 * one state serves both and nothing is hidden from anyone.
 *
 * @package
 */

import { createGridDots } from './grid-dots';
import {
	prefersReducedMotion,
	rafThrottle,
	isTouchInput,
	supportsFinePointer,
} from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="grid-dots"]';

/** Live instances, so a bfcache restore can tear down before re-init. */
let instances = [];

/** The single shared pointer driver, or null when nothing is registered. */
let onPointerMove = null;

/**
 * PROBE HANDLE — read-only, permanent, no side effects (D807 precedent).
 *
 * A live browser probe runs in page scope and cannot import a module, so the
 * instance list needs a window handle to be reachable at all. This returns the
 * SAME array the module already keeps, so it adds no state to go stale, and
 * there is no setter.
 *
 * ⛔ Instrument THE MODULE through this, never the page. A global rAF counter
 * catches every other effect on the page and proves nothing about this one.
 *
 * It is also the negative control's instrument: a container carrying no
 * grid-dot effect must appear here ZERO times, which is a stronger statement
 * than "its canvas looks empty".
 */
if ( typeof window !== 'undefined' ) {
	window.sgsFxGridDots = { instances: () => instances };
}

/**
 * Read one instance's options off its own attributes.
 *
 * Values are BOUNDED rather than trusted — an absent or unparseable attribute
 * passes `undefined` through so `grid-dots.js`'s own DEFAULTS table wins,
 * never a second hand-picked fallback here that could drift from it.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object} Options for {@link createGridDots}.
 */
function readOptions( el ) {
	const num = ( attr, min, max ) => {
		const v = parseFloat( el.getAttribute( attr ) );
		if ( Number.isNaN( v ) ) {
			return undefined;
		}
		return Math.min( Math.max( v, min ), max );
	};

	/*
	 * An unrecognised shape passes `undefined` so the engine's own default
	 * wins, exactly as an unparseable number does above. Validating against the
	 * SAME list the engine draws means a typo degrades to a circle rather than
	 * reaching `paintMarker()` and falling through to the triangle branch.
	 */
	const SHAPES = [ 'circle', 'line', 'square', 'triangle', 'cross' ];
	const rawShape = el.getAttribute( 'data-sgs-fx-grid-shape' );

	return {
		cell: num( 'data-sgs-fx-grid-cell', 12, 200 ),
		dot: num( 'data-sgs-fx-grid-dot', 0.5, 12 ),
		radius: num( 'data-sgs-fx-grid-radius', 20, 600 ),
		maxLean: num( 'data-sgs-fx-grid-lean', 1, 60 ),
		easeMs: num( 'data-sgs-fx-grid-ease', 60, 1200 ),
		shape: SHAPES.includes( rawShape ) ? rawShape : undefined,
		// Absent attribute => undefined => engine default (true). Only an
		// explicit "0" turns the proximity fade off.
		fade:
			el.getAttribute( 'data-sgs-fx-grid-fade' ) === null
				? undefined
				: el.getAttribute( 'data-sgs-fx-grid-fade' ) !== '0',
	};
}

/**
 * Attach every marked element and start the shared driver.
 *
 * @return {void}
 */
function boot() {
	// SUPPRESS (§10): no instance, no canvas, no listener.
	if ( prefersReducedMotion() ) {
		return;
	}
	// Coarse static gate — see the module docblock.
	if ( ! supportsFinePointer() ) {
		return;
	}

	const els = [ ...document.querySelectorAll( SELECTOR ) ];
	if ( ! els.length ) {
		return;
	}

	els.forEach( ( el ) => {
		instances.push( {
			el,
			field: createGridDots( el, readOptions( el ) ),
		} );
	} );

	onPointerMove = rafThrottle( ( event ) => {
		// REACTIVE gate — a hybrid device passes supportsFinePointer() and can
		// still be touched.
		if ( isTouchInput() ) {
			return;
		}
		instances.forEach( ( { el, field } ) => {
			const rect = el.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			// A pointer OUTSIDE the emitter must not drag its dots — otherwise
			// every emitter on the page reacts to every mousemove anywhere.
			// Clearing (rather than ignoring) is what makes the dots ease home
			// when the pointer leaves, which is half the specified behaviour.
			if ( x >= 0 && x <= rect.width && y >= 0 && y <= rect.height ) {
				field.setPointer( x, y );
			} else {
				field.clearPointer();
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
	instances.forEach( ( { field } ) => field.destroy() );
	instances = [];
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code, so the listener and instances would otherwise survive
 * against a DOM that may have since re-rendered. Tearing down and re-booting on
 * a persisted restore keeps the two in step — the pattern `fx-particles.js`,
 * `fx-magnet.js` and `fx-wave-gradient.js` all use. On a normal load
 * `persisted` is false and this does nothing.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
