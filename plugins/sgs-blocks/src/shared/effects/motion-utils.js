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

/**
 * Height of the persistent chrome occupying the top of the viewport, in px.
 *
 * WHY PINNING EFFECTS MUST KNOW THIS
 * ScrollTrigger's `pin` holds an element wherever it sat when the trigger
 * fired. With the default `start: 'top top'` that is viewport y=0 — space the
 * sticky site header already owns. Measured on the canary: header 93px at
 * `z-index: 100`, pinned element `position: fixed` at `z-index: auto`, so the
 * header wins the paint contest and the top 93px of the pinned section is
 * invisible for the entire pin. A heading in that band is simply gone.
 *
 * ⚠ RAISING THE PINNED ELEMENT'S z-index IS THE WRONG FIX. It inverts the
 * problem: the section then covers the header, so navigation disappears for the
 * duration of the pin and any focusable header control stays in the tab order
 * while being visually obscured — a WCAG 2.4.11 focus-obscured failure. Trading
 * a hidden heading for hidden navigation is strictly worse. The defect is
 * GEOMETRY, not stacking: move the pin below the chrome and nothing competes
 * for those pixels at all.
 *
 * WHY THE CSS CUSTOM PROPERTY, RATHER THAN MEASURING HERE
 * `--sgs-header-height` is not a static guess. `src/header-behaviours/view.js`
 * measures the header with a ResizeObserver and publishes the rounded px value
 * to `:root` and `body`, so it tracks shrink-on-scroll and per-breakpoint
 * heights. (The `80px` literal in `theme/.../utilities.css` is only the pre-JS
 * fallback; verified live, the published value reads 93px and matches the
 * measured header exactly.) Critically, that module publishes an explicit `0`
 * when the header is NOT pinned — it gates on the COMPUTED position, which is
 * the only reliable signal here: a header set both sticky and transparent
 * computes `absolute` and is not pinned despite still carrying the sticky body
 * class. So conditionality comes free, and a non-sticky header self-disables
 * the offset.
 *
 * Re-measuring the header in this file would recreate the duplicate
 * `--sgs-header-height` publisher the project deliberately deleted (D330,
 * 2026-07-14) and would have to re-derive that sticky-vs-transparent rule —
 * a known trap. Consuming the published value inherits the reasoning instead.
 *
 * @return {number} Offset in px; 0 when nothing persistent occupies the top.
 */
export function chromeOffsetPx() {
	let offset = 0;

	const published = getComputedStyle( document.documentElement )
		.getPropertyValue( '--sgs-header-height' )
		.trim();
	const parsed = parseFloat( published );

	if ( Number.isFinite( parsed ) ) {
		offset = parsed;
	} else {
		// Fallback for a page where header-behaviours/view.js is not enqueued:
		// measure, but gate on the same COMPUTED-position test that module uses
		// so a non-pinned header still yields 0.
		const header = document.querySelector( 'header' );
		if ( header ) {
			const position = getComputedStyle( header ).position;
			if ( 'sticky' === position || 'fixed' === position ) {
				offset = header.getBoundingClientRect().height;
			}
		}
	}

	// The admin bar is a SEPARATE term — `--sgs-header-height` deliberately
	// excludes it (utilities.css composes them with calc() for scroll-padding).
	// It is fixed to the very top for logged-in users only, so it is measured
	// from the live element rather than assumed: reading the CSS var with a
	// 32px default would wrongly add 32px for every logged-OUT visitor.
	// Worth knowing when triaging: this term makes the defect look worse when
	// signed in and can vanish entirely in a logged-out check.
	const adminBar = document.getElementById( 'wpadminbar' );
	if ( adminBar && 'fixed' === getComputedStyle( adminBar ).position ) {
		offset += adminBar.getBoundingClientRect().height;
	}

	return offset;
}
