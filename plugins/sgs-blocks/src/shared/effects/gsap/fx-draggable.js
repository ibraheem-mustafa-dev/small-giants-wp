/**
 * Tier G effect — drag-to-scroll with Inertia momentum. Spec 38 FR-38-13.
 *
 * Upgrades a NATIVE horizontal-scroll carousel (the Tier V CSS scroll-snap
 * pattern already used across the codebase: `overflow-x: auto` +
 * `scroll-snap-type: x mandatory`) with desktop click-and-drag plus realistic
 * momentum on release. It is layered ON TOP of that CSS — never a replacement
 * for it (fail-open, §4.2: with JS blocked, or on a device this module
 * declines to touch, the element is already a fully working native scroller).
 *
 * ⛔ WHY THIS DOES NOT USE `Draggable` WITH `type: 'scroll'` (rewritten 2026-07-31)
 * That was the obvious recipe and it is the one this module originally used.
 * It is wrong for an SGS carousel, and the reason is in GSAP's own source —
 * `node_modules/gsap/Draggable.js:536`:
 *
 *   "The ScrollProxy class wraps an element's contents into another div
 *    (we call it 'content') …"
 *
 * `type: 'scroll'` therefore RE-PARENTS every child of the scroller into a
 * plain `<div>` it creates. An SGS carousel track is simultaneously the
 * scroller AND the layout container — `.sgs-gallery__grid` is the
 * `display: grid` element whose children are the slides. Move those children
 * into an intermediate div and they stop being grid items: measured live on
 * the Wave C canary, the eight-slide track collapsed to ONE 389px-wide,
 * 3115px-tall column. The module's own "layered on top, never a replacement"
 * promise was false as written — it silently restructured the DOM it claimed
 * only to enhance.
 *
 * So this module now drives `scrollLeft` DIRECTLY from pointer events and uses
 * InertiaPlugin purely as a physics solver for the release. Nothing is
 * re-parented, no wrapper is created, no element is transformed: the only
 * thing ever written is the `scrollLeft` the element already had, plus a
 * `cursor`. That is what "layered on top" has to mean for it to be true.
 *
 * ROSTER MECHANISM (R-31-1 — DB-first, no hardcoded dicts): the roster is
 * DERIVED, not declared. `scripts/generate-fx-qualifying-blocks.py` grants a
 * block the `track` provision when its OWN stylesheet declares
 * `overflow-x: auto|scroll` in a rule a desktop-width viewport can reach —
 * the same structural fact this file measures at runtime. A block then renders
 * `data-sgs-fx="draggable"` on its scrollable element when the operator turns
 * the block's own inspector toggle on. (`supports.sgs.fx.draggable` survives as
 * an additive opt-in override for a scroller the file scan cannot see — built
 * by JS, or inherited from a parent stylesheet — but it is no longer the only
 * route in, which is what made adoption manual for a universal mechanism.)
 *
 * This file never names a block. It only ever asks the DOM "is this element a
 * genuine native horizontal scroller?" (`isNativeHorizontalScroller`). That is
 * a STRUCTURAL question, not a per-block branch, so the same code powers every
 * roster block of that shape, with zero changes here.
 *
 * ⚠ THIS MODULE DOES NOTHING ON A TRANSFORM-DRIVEN TRACK — and a block must
 * therefore never join the roster on one. `overflow: hidden` plus a
 * `transform`/`translateX` mechanism is a DIFFERENT mechanism that this module
 * has no business touching, and re-deriving such a block's own wrap-around
 * maths inside a block-agnostic module is exactly the per-block hyperfocus
 * R-31-9 forbids. So `isNativeHorizontalScroller` finds nothing to attach to
 * and `initDraggable` returns `undefined`.
 *
 * That is a safe no-op but NOT a free one, which is the historical lesson
 * worth keeping: `sgs/testimonial-slider` declared the roster capability and
 * emitted the marker for exactly this shape of track. `SGS_Motion_Registry`
 * sniffs rendered markup for `data-sgs-fx` and enqueues that effect's whole
 * plugin set, so the inert declaration shipped GSAP core + InertiaPlugin +
 * this module (~35KB gzip) on every page carrying that block, to run a
 * function that returned `undefined`. Both the declaration and the emit were
 * removed on 2026-07-31; that block's drag momentum is block-private and lives
 * in ITS OWN `view.js` behind its own `data-sgs-slider-momentum` marker,
 * deliberately outside the `data-sgs-fx` grammar so the registry never sees
 * it. Before adding a block to this roster, confirm the element that carries
 * the marker genuinely scrolls — a marker on a non-scroller costs real bytes
 * and buys nothing.
 *
 * REDUCED MOTION (§10) — READ BEFORE EDITING THIS FILE'S GATES:
 * Dragging is USER-DRIVEN input, not autonomous motion, so §10 classifies this
 * effect as SIMPLIFY, never suppress: a visitor with reduced motion set must
 * still be able to drag the carousel — only the MOMENTUM (the physics that
 * keeps it moving after the pointer lifts) is switched off, and release stops
 * instantly. Concretely, the drag listeners are bound UNCONDITIONALLY, outside
 * any motion gate; wrapping the whole thing in `withMotionAllowed` would have
 * been wrong, because its callback never runs at all under reduced motion and
 * drag would vanish entirely for exactly the visitors who most need an
 * alternative to precise scroll gestures. Only the momentum LAYER sits inside
 * `withMotionAllowed`, and GSAP's matchMedia machinery re-runs / reverts it
 * live when the OS preference changes mid-session, with no polling.
 *
 * TOUCH DISCIPLINE (§3.3): the whole module is gated behind `(pointer: fine)`,
 * so a touch visitor keeps the browser's own native momentum scrolling,
 * completely untouched — and we never pay for listeners nobody will use.
 * `touch-action` is never written, and `preventDefault()` is never called on a
 * touch-originated event.
 *
 * KEYBOARD (§3.3, mandatory): this module never sets `tabindex`, never moves
 * focus, never reorders DOM, and never removes existing focusable children.
 * Drag is a strictly ADDITIONAL pointer path layered onto whatever keyboard
 * equivalent the block already renders (`sgs/gallery`'s carousel arrows, dots
 * and focusable items are all exactly where they were).
 *
 * @package SGS\Blocks
 */

import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { tierG, withMotionAllowed, bootEffect } from '@sgs/motion-provider';

/** Pointer travel (px) past which the gesture counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;

/**
 * Read the optional momentum opt-out. `data-sgs-fx-momentum="false"` is only
 * emitted by render.php when the operator explicitly turned the "Momentum"
 * inspector toggle off (default on) — mirroring the rest of the
 * `data-sgs-fx-*` grammar's "only emit params the client actually set"
 * convention, so an absent attribute always means "use the default", never
 * "unset = off".
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {boolean} False only when the operator explicitly disabled it.
 */
function momentumRequested( el ) {
	return 'false' !== el.getAttribute( 'data-sgs-fx-momentum' );
}

/**
 * Does this element structurally qualify as a native horizontal scroller?
 *
 * Deliberately a COMPUTED-STYLE + MEASURED-OVERFLOW check, not a class-name or
 * block check — see the file docblock. `overflow-x: auto|scroll` is what makes
 * `scrollLeft` a real, visible property; anything else (e.g. `overflow: hidden`
 * driving a `transform`) is a different mechanism this module has no business
 * touching. The overflow measurement matters too: a track short enough to fit
 * has nothing to drag, and binding listeners to it would give a grab cursor
 * that does nothing.
 *
 * @param {HTMLElement} el Element carrying `data-sgs-fx="draggable"`.
 * @return {boolean} True when `el` itself natively scrolls horizontally.
 */
function isNativeHorizontalScroller( el ) {
	const overflowX = getComputedStyle( el ).overflowX;
	if ( 'auto' !== overflowX && 'scroll' !== overflowX ) {
		return false;
	}
	return el.scrollWidth > el.clientWidth;
}

/**
 * Suspend / restore CSS scroll snapping for the duration of a gesture.
 *
 * ⚠ LOAD-BEARING, and non-obvious enough that removing it looks harmless.
 * The Tier V carousel pattern this module enhances sets
 * `scroll-snap-type: x mandatory`. Under MANDATORY snapping Chrome re-snaps a
 * PROGRAMMATIC `scrollLeft` write immediately, in the same frame — measured on
 * the Wave C canary: `el.scrollLeft = 200` read back as **0**, and read back as
 * **200** with snapping switched off. So every write this module makes during a
 * drag was being reverted before it could paint, and drag-to-scroll did nothing
 * at all while every other signal (grab cursor, listeners firing, a genuinely
 * overflowing track) said it was working.
 *
 * Snapping is restored the moment the gesture — including any momentum coast —
 * finishes, so the carousel still settles onto a slide boundary. That restore
 * is the feature, not a concession: coast-then-snap is the intended feel.
 *
 * This writes an inline style, which Spec 32 restricts. It is in scope: FR-38-2
 * bans inline style in SSR MARKUP, and permits JS-applied transient state (the
 * same basis on which this module already writes `cursor`). Nothing here
 * reaches server-rendered output.
 *
 * @param {HTMLElement} el The native-scroll element.
 * @return {{suspend: Function, restore: Function}} Snap control.
 */
function snapControl( el ) {
	const original = el.style.scrollSnapType;
	return {
		suspend() {
			el.style.scrollSnapType = 'none';
		},
		restore() {
			el.style.scrollSnapType = original;
		},
	};
}

/**
 * Bind pointer drag-to-scroll. Writes ONLY `scrollLeft`, `cursor` and the
 * transient snap suspension above.
 *
 * @param {HTMLElement} el       The native-scroll element.
 * @param {Object}      hooks    `{ onStart, onMove, onRelease }` — the momentum
 *                               layer's hooks, or no-ops when it is inactive.
 * @return {Function} Unbind.
 */
function bindDrag( el, hooks ) {
	const snap = snapControl( el );
	let dragging = false;
	let moved = false;
	let startX = 0;
	let startScroll = 0;
	let activePointer = null;

	const previousCursor = el.style.cursor;
	el.style.cursor = 'grab';

	const onPointerDown = ( event ) => {
		// Primary button only, and never hijack a gesture that began on a
		// control the visitor was aiming at (a link, the arrows, a dot).
		if ( 0 !== event.button ) {
			return;
		}
		dragging = true;
		moved = false;
		activePointer = event.pointerId;
		startX = event.clientX;
		startScroll = el.scrollLeft;
		el.style.cursor = 'grabbing';
		snap.suspend();
		hooks.onStart( el.scrollLeft );
	};

	const onPointerMove = ( event ) => {
		if ( ! dragging || event.pointerId !== activePointer ) {
			return;
		}
		const delta = event.clientX - startX;
		if ( ! moved && Math.abs( delta ) < DRAG_THRESHOLD ) {
			return;
		}
		if ( ! moved ) {
			moved = true;
			// Only capture once we KNOW this is a drag, so a plain click on a
			// slide still reaches the slide.
			el.setPointerCapture( activePointer );
		}
		el.scrollLeft = startScroll - delta;
		hooks.onMove( el.scrollLeft );
		// Safe: by this point the gesture is a confirmed drag from a FINE
		// pointer (the module never binds on touch), so this suppresses text
		// selection rather than any scrolling behaviour a visitor wanted.
		event.preventDefault();
	};

	const endDrag = ( event ) => {
		if ( ! dragging || ( event && event.pointerId !== activePointer ) ) {
			return;
		}
		dragging = false;
		el.style.cursor = 'grab';
		if ( null !== activePointer && el.hasPointerCapture?.( activePointer ) ) {
			el.releasePointerCapture( activePointer );
		}
		activePointer = null;
		if ( moved ) {
			// The momentum layer owns the restore, because snapping must stay
			// off for the whole coast — restoring here would snap the carousel
			// back the instant the pointer lifted and eat the throw entirely.
			hooks.onRelease( el.scrollLeft, snap.restore );
		} else {
			snap.restore();
		}
	};

	/*
	 * ⚠ THE ONE THAT MAKES THIS WORK AT ALL, and the least obvious line in the
	 * file. Carousel slides are `<img>` elements, and an `<img>` is natively
	 * draggable in every browser: pressing on one and moving starts the HTML5
	 * drag-and-drop gesture, which CANCELS the pointer-event stream. Traced
	 * live on the Wave C canary — the event log read
	 * `pointerdown → pointermove (scrollLeft 0→30) → dragstart`, and then
	 * nothing: exactly one move landed, the track shifted 30px, and the whole
	 * gesture died. Everything else looked healthy (grab cursor, listeners
	 * bound, a genuinely overflowing track), so the symptom read as "drag does
	 * not work" rather than "the browser took the gesture away".
	 *
	 * Suppressed only while a drag of ours is in progress, so ordinary
	 * drag-and-drop elsewhere on the page is untouched.
	 */
	const onDragStart = ( event ) => {
		if ( dragging ) {
			event.preventDefault();
		}
	};

	// A drag that began here but was suppressed mid-gesture (a click on a link
	// inside the track) must not also navigate.
	const onClickCapture = ( event ) => {
		if ( moved ) {
			event.preventDefault();
			event.stopPropagation();
			moved = false;
		}
	};

	el.addEventListener( 'dragstart', onDragStart );
	el.addEventListener( 'pointerdown', onPointerDown );
	el.addEventListener( 'pointermove', onPointerMove );
	el.addEventListener( 'pointerup', endDrag );
	el.addEventListener( 'pointercancel', endDrag );
	el.addEventListener( 'click', onClickCapture, true );

	return () => {
		// Guarantees snapping is never left suspended if the effect is torn
		// down mid-gesture (bfcache restore, reduced-motion revert).
		snap.restore();
		el.removeEventListener( 'dragstart', onDragStart );
		el.removeEventListener( 'pointerdown', onPointerDown );
		el.removeEventListener( 'pointermove', onPointerMove );
		el.removeEventListener( 'pointerup', endDrag );
		el.removeEventListener( 'pointercancel', endDrag );
		el.removeEventListener( 'click', onClickCapture, true );
		el.style.cursor = previousCursor;
	};
}

/**
 * Boot one draggable element.
 *
 * @param {HTMLElement} el Element carrying `data-sgs-fx="draggable"`.
 * @return {Function|undefined} Cleanup, or undefined when this element does not
 *                              structurally qualify.
 */
export function initDraggable( el ) {
	if ( ! window.matchMedia( '(pointer: fine)' ).matches ) {
		// Touch-only device: the CSS scroll-snap fallback is already the
		// correct, complete experience. Nothing to upgrade.
		return undefined;
	}

	if ( ! isNativeHorizontalScroller( el ) ) {
		return undefined;
	}

	// The tracker object is what InertiaPlugin measures velocity on. It exists
	// even when momentum is off so `bindDrag` has one stable hook shape.
	const tracker = { x: el.scrollLeft };
	let momentum = null;

	const hooks = {
		onStart: ( value ) => {
			tracker.x = value;
			momentum?.stop();
		},
		onMove: ( value ) => {
			tracker.x = value;
		},
		onRelease: ( value, restoreSnap ) => {
			if ( momentum ) {
				momentum.throw( value, restoreSnap );
			} else {
				// No momentum layer (reduced motion, or the operator turned it
				// off): the gesture is over the instant the pointer lifts, so
				// snapping comes straight back and the carousel settles onto
				// the nearest slide — §10's "snap is instant".
				restoreSnap();
			}
		},
	};

	// BASE — bound unconditionally, regardless of motion preference. This is
	// what makes drag itself survive reduced motion (§10 SIMPLIFY).
	const unbindDrag = bindDrag( el, hooks );

	// MOMENTUM LAYER — the only genuinely optional "motion flavour"; drag
	// capability itself is above. Under reduced motion this callback never runs
	// and `momentum` stays null, so release simply stops where the pointer left
	// it. GSAP's matchMedia reverts/re-runs it live on a mid-session change.
	const revertMomentum = momentumRequested( el )
		? withMotionAllowed( ( gsap ) => {
				InertiaPlugin.track( tracker, 'x' );
				let tween = null;

				momentum = {
					stop() {
						tween?.kill();
						tween = null;
					},
					throw( from, restoreSnap ) {
						const max = el.scrollWidth - el.clientWidth;
						tracker.x = from;
						tween = gsap.to( tracker, {
							inertia: {
								x: {
									velocity:
										InertiaPlugin.getVelocity( tracker, 'x' ),
									min: 0,
									max,
								},
							},
							onUpdate: () => {
								el.scrollLeft = tracker.x;
							},
							// Snapping comes back only once the coast has
							// finished, so the carousel glides and THEN settles
							// onto a slide boundary. Also runs on `onInterrupt`
							// so a new grab mid-coast cannot strand it off.
							onComplete: restoreSnap,
							onInterrupt: restoreSnap,
						} );
					},
				};

				return () => {
					tween?.kill();
					InertiaPlugin.untrack( tracker, 'x' );
					momentum = null;
				};
		  } )
		: undefined;

	return () => {
		if ( revertMomentum ) {
			revertMomentum();
		}
		unbindDrag();
	};
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( InertiaPlugin );

bootEffect( 'draggable', initDraggable );
