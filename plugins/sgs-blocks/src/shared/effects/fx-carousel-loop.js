/**
 * SGS motion — infinite-loop carousels. Tier V. Spec 38 §11 (loop FR).
 *
 * Bean, verbatim: "for the dragging physics feel the option to make the
 * carousels looping is important so it doesn't get abruptly stopped by the
 * end of the list and just loops round" — and, decisively, "looping should
 * not be tied to the drag effect — they should be independent controls" and
 * "we're not setting the default behaviour in all carousels, just making the
 * functionality available to those who want it."
 *
 * ⛔ WHY THIS IS A SEPARATE MODULE, NOT ADDED TO `gsap/fx-draggable.js`
 * `fx-draggable.js`'s own docblock (lines 54-74, as measured 2026-08-01) is a
 * documented prior decision that rejects exactly that: "re-deriving such a
 * block's own wrap-around maths inside a block-agnostic module is exactly the
 * per-block hyperfocus R-31-9 forbids", and its contract states it never
 * creates a wrapper, never transforms an element, never reorders DOM — all
 * three of which looping a native scroller requires. That file is NOT
 * modified by this work, not one line. Bean's "independent controls" ruling
 * is what dissolves the conflict: this module owns wrap-around as its own
 * explicit job, on the SAME element `fx-draggable.js` may also be attached
 * to, coordinating with it rather than replacing or editing it.
 *
 * WHAT THIS MODULE DOES
 * Clones every child of a qualifying native horizontal scroller once to each
 * end (`[clones of all][originals][clones of all]`), repositions `scrollLeft`
 * so the visible starting frame is still the first REAL item, and then
 * watches `scroll` events to snap `scrollLeft` back by exactly one loop-width
 * whenever the visitor crosses into a clone zone — so scrolling (or dragging,
 * when that is also enabled) past the last item continues into the first
 * with no dead end and, in the common case, no visible seam.
 *
 * ELIGIBILITY (Spec 38 §2, R-31-9): the SAME structural question
 * `fx-draggable.js` asks — `isNativeHorizontalScroller()`, extracted to
 * `../motion-utils.js` because that file is frozen and does not export its
 * own copy (see the docblock there for why this is a deliberate duplicate,
 * not an import). This module never names a block; it only ever asks the DOM
 * "does this element genuinely scroll horizontally, and does it have more
 * than one child to loop?".
 *
 * DEFAULT OFF, PER-INSTANCE OPT-IN. This module only ever runs on an element
 * a block's own render layer has marked with `data-sgs-loop="1"` — Bean was
 * explicit that no carousel gets this behaviour by default.
 *
 * COORDINATING WITH DRAG WITHOUT TOUCHING IT (the one real integration
 * point). `fx-draggable.js` derives its momentum bounds as
 * `el.scrollWidth - el.clientWidth` FRESH at every release
 * (`momentum.throw()`, not cached at init) — so once this module's clones
 * exist, drag's own bounds already include them with no change needed there.
 * Verified by reading the source (this session shipped with no live deploy
 * available to also confirm it at runtime — see the build report).
 *
 * The remaining risk is a WRITE race, not a stale bound: while
 * `fx-draggable.js` owns a gesture (raw drag OR its momentum coast — its own
 * docblock states both phases keep `scrollSnapType` suspended to `'none'`
 * until "the gesture — including any momentum coast — finishes"), it writes
 * `el.scrollLeft` on every `pointermove`/inertia tick from its own internal
 * state, unaware of any correction this module might make mid-gesture — a
 * correction applied then would be overwritten on the very next tick. This
 * module therefore reads that same PUBLIC, DOCUMENTED style side effect
 * (`el.style.scrollSnapType === 'none'`) as a non-invasive "drag currently
 * owns this element" signal: it defers its own correction while that holds,
 * and applies it the moment the flag clears. This keeps `fx-draggable.js`
 * untouched while still coexisting with it correctly, for both the
 * loop-only and both-on states.
 *
 * A11Y CONTRACT WITH THE BLOCK'S OWN CAROUSEL JS (Spec 38 §10 / WCAG 2.5.7).
 * A loop has no last item, so "next never disables" and a fixed dot count
 * has no meaning against the CLONED count. This module cannot itself own a
 * block's arrows/dots — their markup and class names differ per block, and
 * hard-coding any of them here would be exactly the block-naming R-31-9
 * forbids. Instead every clone is marked `data-sgs-loop-clone="true"`, made
 * `inert` (removed from focus order and the accessibility tree in one
 * property — supported Chrome/Edge/Firefox and Safari 17+) and additionally
 * `aria-hidden="true"` as a defence-in-depth belt for older assistive-tech
 * combinations that do not yet honour `inert`. A block's own carousel script
 * excludes these from its item count and wrap logic with a single selector
 * change: `:not([data-sgs-loop-clone])`. `sgs/gallery`'s `view.js` is the
 * first block wired to this contract; see its own comments for the wrap-math
 * change that makes its arrows loop instead of disabling at the ends.
 *
 * REDUCED MOTION (§10). Not classified as either "suppress" or "simplify" in
 * the usual sense, because there is no ANIMATION here to gate either way: the
 * `scrollLeft` correction this module performs is an instantaneous position
 * write, never a tween, and is only ever meant to be imperceptible — it is
 * closer in kind to fx-draggable's own base drag binding (bound
 * unconditionally, §10 SIMPLIFY) than to a scrub or reveal. The only place
 * actual animated motion can occur near this capability — an arrow click
 * calling `scrollIntoView({ behavior: 'smooth' })` — belongs to and is
 * already gated by each block's own view.js (see `sgs/gallery`'s
 * `REDUCED_MOTION` check), unchanged by this module. So this module runs
 * identically for every visitor regardless of their motion preference.
 *
 * @package SGS\Blocks
 */

import { isNativeHorizontalScroller } from './motion-utils';

/** Elements the render layer marked as loop-eligible. */
const SELECTOR = '[data-sgs-loop]';

/**
 * Suspend / restore the CSS properties that would otherwise fight a direct
 * `scrollLeft` write, for one instantaneous correction.
 *
 * Same discovery `fx-draggable.js` made independently for the same reason
 * (its own docblock: a mandatory-snap scroller reverts a raw `scrollLeft`
 * write in the same frame, and `scroll-behavior: smooth` queues an animated
 * scroll that a rapid second write abandons mid-flight) — re-derived here as
 * a small local helper rather than imported, because `fx-draggable.js` does
 * not export its copy and is not to be modified.
 *
 * @param {HTMLElement} el     The scroller.
 * @param {number}      deltaX Amount to shift `scrollLeft` by.
 */
function shiftScrollInstantly( el, deltaX ) {
	const originalSnap = el.style.scrollSnapType;
	const originalBehaviour = el.style.scrollBehavior;
	el.style.scrollSnapType = 'none';
	el.style.scrollBehavior = 'auto';
	el.scrollLeft += deltaX;
	// Restored next frame, once the browser has committed the jump — restoring
	// synchronously risks scroll-snap re-engaging before the write paints.
	window.requestAnimationFrame( () => {
		el.style.scrollSnapType = originalSnap;
		el.style.scrollBehavior = originalBehaviour;
	} );
}

/**
 * Make every focusable descendant of a clone subtree unreachable by
 * keyboard, and strip any `id` so it cannot collide with the original's.
 *
 * Belt-and-braces alongside `inert`/`aria-hidden` on the clone's own root —
 * `inert` alone is sufficient in every browser this project supports, but
 * explicit `tabindex="-1"` costs nothing and protects a visitor on an older
 * assistive-tech/browser pairing that has not yet wired up `inert` fully.
 *
 * @param {HTMLElement} clone Root of one cloned item.
 */
function neutraliseClone( clone ) {
	clone.removeAttribute( 'id' );
	clone
		.querySelectorAll( '[id], a, button, input, select, textarea, [tabindex]' )
		.forEach( ( node ) => {
			node.removeAttribute( 'id' );
			node.setAttribute( 'tabindex', '-1' );
		} );
}

/**
 * Boot one loop-eligible scroller.
 *
 * @param {HTMLElement} el Element carrying `data-sgs-loop="1"`.
 * @return {Function|undefined} Cleanup, or undefined when this element does
 *                              not structurally qualify.
 */
export function initCarouselLoop( el ) {
	// Idempotency guard: a bfcache restore re-runs boot() (see the bottom of
	// this file) and must not clone an already-cloned track a second time.
	if ( 'true' === el.dataset.sgsLoopBooted ) {
		return undefined;
	}

	if ( ! isNativeHorizontalScroller( el ) ) {
		return undefined;
	}

	const originals = Array.from( el.children );
	// Fewer than two items has nothing meaningful to loop, and a single-item
	// clone-of-itself would produce a degenerate zero-width loop distance.
	if ( originals.length < 2 ) {
		return undefined;
	}

	el.dataset.sgsLoopBooted = 'true';

	const leadingClones = originals.map( ( item ) => item.cloneNode( true ) );
	const trailingClones = originals.map( ( item ) => item.cloneNode( true ) );

	leadingClones.forEach( ( clone ) => {
		clone.setAttribute( 'data-sgs-loop-clone', 'true' );
		clone.setAttribute( 'aria-hidden', 'true' );
		clone.inert = true;
		neutraliseClone( clone );
	} );
	trailingClones.forEach( ( clone ) => {
		clone.setAttribute( 'data-sgs-loop-clone', 'true' );
		clone.setAttribute( 'aria-hidden', 'true' );
		clone.inert = true;
		neutraliseClone( clone );
	} );

	// Insert leading clones before the first original, in original order —
	// then reposition scrollLeft in the SAME synchronous execution, before
	// the browser has a chance to paint the un-repositioned frame.
	const firstOriginal = originals[ 0 ];
	leadingClones.forEach( ( clone ) => el.insertBefore( clone, firstOriginal ) );
	trailingClones.forEach( ( clone ) => el.appendChild( clone ) );

	const groupRectAtStart = el.getBoundingClientRect();
	const firstOriginalRectAtStart = firstOriginal.getBoundingClientRect();
	el.scrollLeft += firstOriginalRectAtStart.left - groupRectAtStart.left;

	/**
	 * Distance, in scrollLeft units, from the first original item to its own
	 * clone in the trailing group — i.e. exactly one full pass through every
	 * original item, including gaps. Measured fresh on every call rather than
	 * cached once: a responsive column-count or gap change alters this
	 * mid-session, and re-measuring is cheap (three `getBoundingClientRect()`
	 * calls) against a scroll listener that is itself throttled below.
	 *
	 * @return {number} Loop width in px, or 0 if the trailing clones are gone
	 *                   (defensive — should not happen before teardown).
	 */
	function loopWidthNow() {
		if ( ! trailingClones.length || ! trailingClones[ 0 ].isConnected ) {
			return 0;
		}
		const firstRect = firstOriginal.getBoundingClientRect();
		const firstCloneRect = trailingClones[ 0 ].getBoundingClientRect();
		return firstCloneRect.left - firstRect.left;
	}

	/**
	 * The scrollLeft shift needed to bring the visitor back inside the
	 * originals band, or 0 when no correction is due.
	 *
	 * @return {number} Signed px delta.
	 */
	function pendingShift() {
		const loopWidth = loopWidthNow();
		if ( loopWidth <= 0 ) {
			return 0;
		}
		const groupRect = el.getBoundingClientRect();
		const firstRect = firstOriginal.getBoundingClientRect();
		// The scrollLeft value that would put the first original flush with
		// el's own left edge — i.e. "the start of the originals band". This
		// is a document-space CONSTANT (the first original's fixed content
		// position), reconstructed fresh from the live rects on every call.
		// ⚠ MUST be `+`, not `-`: `firstRect.left - groupRect.left` equals
		// `documentLeft - el.scrollLeft` (a screen-space delta shrinks as
		// scrollLeft grows), so recovering the constant `documentLeft` means
		// ADDING that delta back to the current scrollLeft. Verified by hand
		// -tracing concrete numbers (3 items, 320px pitch): at scrollLeft
		// 960 the delta is 0 -> 960+0=960; at scrollLeft 500 the delta is
		// 460 -> 500+460=960 — the same constant both times, as it must be.
		// The `-` this line originally shipped with produced
		// `2*scrollLeft - loopWidth`, a moving target that made every
		// boundary check wrong.
		const bandStart = el.scrollLeft + ( firstRect.left - groupRect.left );
		const EPSILON = 1;
		if ( el.scrollLeft < bandStart - EPSILON ) {
			return loopWidth;
		}
		if ( el.scrollLeft > bandStart + loopWidth + EPSILON ) {
			return -loopWidth;
		}
		return 0;
	}

	/**
	 * Apply a correction now, only when nothing else currently owns
	 * `scrollLeft` on this element.
	 *
	 * @return {boolean} True when a correction was applied.
	 */
	function correctBoundaryIfSafe() {
		// `fx-draggable.js`'s own documented contract (see this file's
		// docblock): scrollSnapType stays 'none' for the WHOLE gesture,
		// raw drag AND momentum coast, restored only once both finish. A
		// write here while that holds would be clobbered by drag's own next
		// tick, so this defers rather than fighting it.
		if ( 'none' === el.style.scrollSnapType ) {
			return false;
		}
		const shift = pendingShift();
		if ( 0 === shift ) {
			return true; // Nothing pending — not deferred, just no-op.
		}
		shiftScrollInstantly( el, shift );
		return true;
	}

	let settleTimer = null;
	let retryTimer = null;

	/**
	 * Keep retrying until a correction lands — used only while drag/momentum
	 * is holding `scrollSnapType` at `'none'`, so a visitor who releases mid
	 * -coast still gets corrected shortly after, rather than the correction
	 * being silently dropped for that gesture.
	 */
	function retryUntilSafe() {
		window.clearTimeout( retryTimer );
		if ( correctBoundaryIfSafe() ) {
			return;
		}
		retryTimer = window.setTimeout( retryUntilSafe, 150 );
	}

	const onScroll = () => {
		// Immediate attempt: when nothing else owns scrollLeft (loop-only, or
		// native touch/wheel scroll with drag off, or drag enabled but idle)
		// this corrects within the same event — effectively the same frame,
		// imperceptible. When drag/momentum currently owns it, this is a
		// deliberate no-op and the settle path below covers it.
		correctBoundaryIfSafe();

		// Settle path: fires ~120ms after the LAST scroll event of a whole
		// gesture (mirrors the debounce `sgs/gallery`'s own dot-sync already
		// uses), and re-checks/retries until a correction actually lands —
		// the only path that reliably covers a release mid-momentum-coast,
		// where the immediate attempt above legitimately deferred.
		window.clearTimeout( settleTimer );
		settleTimer = window.setTimeout( retryUntilSafe, 120 );
	};

	el.addEventListener( 'scroll', onScroll, { passive: true } );

	return () => {
		el.removeEventListener( 'scroll', onScroll );
		window.clearTimeout( settleTimer );
		window.clearTimeout( retryTimer );
		leadingClones.forEach( ( clone ) => clone.remove() );
		trailingClones.forEach( ( clone ) => clone.remove() );
		delete el.dataset.sgsLoopBooted;
	};
}

/** Live cleanups, so a bfcache restore can tear down before re-init. */
let cleanups = [];

/**
 * Attach the loop to every marked element on the page.
 *
 * Deliberately its OWN `querySelectorAll`, not the Tier G `bootEffect()` in
 * `gsap/provider.js` — that helper matches `[data-sgs-fx="<effect>"]`, and
 * `data-sgs-loop` is a genuinely separate grammar (see this file's docblock:
 * an element can carry BOTH `data-sgs-fx="draggable"` AND `data-sgs-loop="1"`
 * at once, which a single-value `data-sgs-fx` slot could never express).
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		const cleanup = initCarouselLoop( el );
		if ( cleanup ) {
			cleanups.push( cleanup );
		}
	} );
}

/**
 * Tear every attached loop down.
 */
function teardown() {
	cleanups.forEach( ( cleanup ) => cleanup() );
	cleanups = [];
}

boot();

/*
 * bfcache (§1.6, mirrors fx-cursor-field.js). A back-navigation restores the
 * page from memory without re-running module code; tearing down (removing
 * clones, resetting the boot flag) and re-booting on a persisted restore
 * keeps the DOM correct rather than accumulating a second set of clones.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
