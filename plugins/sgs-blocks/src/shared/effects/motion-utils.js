/**
 * SGS shared motion utilities — the primitives every effect module in
 * `src/shared/effects/` is built on.
 *
 * These are plain ES modules (no bundler-specific syntax, no npm deps) so
 * they can be imported by any `viewScriptModule` across blocks/plugins
 * without a shared build step.
 *
 * @package
 */

/**
 * Whether the user has asked for reduced motion — checked LIVE every call
 * (never cached at module load), so a mid-session OS preference change is
 * honoured on the next effect init rather than requiring a page reload.
 *
 * @return {boolean} True when `prefers-reduced-motion: reduce` matches.
 */
export function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/* ==========================================================================
 * Reactive pointer-type tracking.
 *
 * `@media (hover: hover)` / `(pointer: fine)` describe the device's PRIMARY
 * pointer ONLY — a hybrid trackpad+touchscreen laptop, a Surface, or an iPad
 * with a trackpad reports hover-capable and stays reported that way for the
 * WHOLE session even while actually being poked with a finger (verified:
 * Elementor issue #22258 — hover-driven effects sticking on touch devices;
 * the "sticky hover" problem documented since the canonical 2013 Stack
 * Overflow thread; CSS-Tricks "Interaction Media Features and Their
 * Potential (for Incorrect Assumptions)"). A ONE-TIME capability check at
 * module load is therefore the wrong gate. This tracks the ACTUAL pointer
 * type of the most recent pointerdown, reactively, for the life of the page.
 * ========================================================================== */

let lastPointerType = null;

if (
	typeof window !== 'undefined' &&
	typeof window.addEventListener === 'function'
) {
	window.addEventListener(
		'pointerdown',
		( event ) => {
			lastPointerType = event.pointerType || null;
		},
		{ capture: true, passive: true }
	);
}

/**
 * Whether the MOST RECENT pointer interaction on the page was a touch
 * pointer. Reactive — re-evaluate on every call, never cache the result;
 * a hybrid device can switch pointer types between one interaction and the
 * next within the same session.
 *
 * @return {boolean} True when the last pointerdown reported `pointerType === 'touch'`.
 */
export function isTouchInput() {
	return 'touch' === lastPointerType;
}

/**
 * Whether the device currently reports a fine, hover-capable PRIMARY
 * pointer. A static capability check — combine with `isTouchInput()` (never
 * gate a pointer-driven effect on this alone; see the module doc-block).
 *
 * @return {boolean} True when `(hover: hover) and (pointer: fine)` matches.
 */
export function supportsFinePointer() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
	);
}

/**
 * Does this element structurally qualify as a native horizontal scroller?
 *
 * Deliberately a COMPUTED-STYLE + MEASURED-OVERFLOW check, not a class-name or
 * block check — `overflow-x: auto|scroll` is what makes `scrollLeft` a real,
 * visible property; anything else (e.g. `overflow: hidden` driving a
 * `transform`) is a different mechanism this test has no business qualifying.
 *
 * ⚠ THIS IS A DELIBERATE, DOCUMENTED DUPLICATE of the identically-named private
 * function in `gsap/fx-draggable.js`, not an import from it. That file carries
 * a hard "do not modify, not one line" constraint (Spec 38 FR-38-13's Tier G
 * contract is frozen — see its own docblock), and its copy is not exported, so
 * sharing code would require editing it to add an `export` keyword — itself a
 * modification. Extracting the test here instead gives `fx-carousel-loop.js`
 * (Tier V, independent control, Spec 38 §11 loop FR) the SAME structural
 * question without touching the frozen file. Keep both copies identical if
 * either changes — there is no gate that cross-checks them, the same
 * hand-maintained-duplicate risk this codebase already carries for a few
 * effect lists in `fx.js`.
 *
 * @param {HTMLElement} el Element to test.
 * @return {boolean} True when `el` itself natively scrolls horizontally.
 */
export function isNativeHorizontalScroller( el ) {
	const overflowX = getComputedStyle( el ).overflowX;
	if ( 'auto' !== overflowX && 'scroll' !== overflowX ) {
		return false;
	}
	return el.scrollWidth > el.clientWidth;
}

/* ==========================================================================
 * Shared rAF loop.
 *
 * Every pointer-driven effect (spotlight, magnet, nav-indicator's resize
 * re-measure) samples via `rafThrottle`. Rather than each consumer starting
 * its OWN `requestAnimationFrame` loop — which multiplies per-frame cost
 * linearly with the number of instances on a page — every `rafThrottle`
 * wrapper feeds ONE shared loop that runs only while there is pending work
 * and stops itself the instant the queue is empty.
 * ========================================================================== */

const pendingCalls = new Map();
let rafHandle = null;

/**
 * Process every queued call for this frame, then either stop (queue empty)
 * or schedule the next frame (a callback re-queued itself while running).
 */
function tick() {
	rafHandle = null;
	if ( 0 === pendingCalls.size ) {
		return;
	}
	// Snapshot + clear BEFORE invoking, so a callback that re-queues itself
	// (e.g. on the next mousemove) runs on the NEXT frame, not this one.
	const entries = Array.from( pendingCalls.entries() );
	pendingCalls.clear();
	entries.forEach( ( [ fn, args ] ) => fn( ...args ) );
	if ( pendingCalls.size > 0 ) {
		scheduleTick();
	}
}

/**
 * Ensure the shared loop is running.
 */
function scheduleTick() {
	if ( null === rafHandle ) {
		rafHandle = window.requestAnimationFrame( tick );
	}
}

/**
 * Wrap a function so it runs at most once per animation frame, always with
 * the MOST RECENT arguments it was called with (trailing-edge coalescing —
 * correct for high-frequency events like `mousemove`, where every call in a
 * frame should collapse to one, using the latest pointer position).
 *
 * Backed by the ONE shared rAF loop above (not a per-call loop) — every
 * `rafThrottle`-wrapped function on the page shares the same frame budget.
 *
 * The returned function carries a `.cancel()` method that drops this
 * function's pending call — call it from an effect's cleanup so a component
 * that's already been torn down never fires a stale callback.
 *
 * @param {Function} fn The function to throttle.
 * @return {Function} The throttled function, with an attached `.cancel()`.
 */
export function rafThrottle( fn ) {
	const throttled = ( ...args ) => {
		pendingCalls.set( fn, args );
		scheduleTick();
	};

	throttled.cancel = () => {
		pendingCalls.delete( fn );
		if ( 0 === pendingCalls.size && null !== rafHandle ) {
			window.cancelAnimationFrame( rafHandle );
			rafHandle = null;
		}
	};

	return throttled;
}
