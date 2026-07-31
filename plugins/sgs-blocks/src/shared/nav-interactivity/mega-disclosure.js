/**
 * SGS Mega disclosure — frontend interactivity for the desktop mega/dropdown panel.
 *
 * A SEPARATE Interactivity store from the drawer's `store('sgs/nav')` (CF-3,
 * BUILD-SPEC §0.5): the drawer is a full-screen MODAL engine (focus-trap,
 * scroll-lock, body-reparent, `showModal`); the mega is a POSITIONED DISCLOSURE
 * (anchored under its trigger, content-sized, NOT scroll-locked, NOT `inert`,
 * NOT top-layer). Sharing a store would couple the two and risk regressing the
 * live drawer, so this module registers its own `store('sgs/mega')` and shares
 * NONE of the drawer orchestration.
 *
 * This module is deliberately self-contained — it does NOT import from
 * `store.js`. `store.js:638` exports only `{ actions, FOCUSABLE_SELECTOR }`
 * (verified 2026-07-24); `getFocusable`/`prefersReducedMotion` are declared but
 * NOT exported. Importing even the one exported constant would pull store.js's
 * `store('sgs/nav')` registration into this block's bundle, re-coupling the two.
 * The three tiny pure helpers are therefore re-implemented locally, keeping the
 * drawer store byte-for-byte untouched (CF-3).
 *
 * Handles: hover-intent open (300ms, non-touch) / tap (touch) / keyboard
 * throughout; a bar+panel hover BRIDGE with a 170ms close-grace + cancel-on-
 * re-enter (CF-13 — the deterministic fallback core) PLUS a geometric safe
 * triangle (FR-36-4) layered in front of it: while the pointer is tracking
 * into the currently-open panel, hover-open on any OTHER trigger is deferred
 * rather than firing early just because the pointer's screen path happened to
 * cross that trigger's bounding box on the way. The triangle is additive —
 * whenever its geometry is unavailable (no panel open, no pointer samples yet)
 * behaviour falls straight through to the unchanged 170ms bridge; edge-overflow
 * reposition via CSS-var VALUES only (no inline `style=""` declaration,
 * Spec 32); single-open; ESC + focus-return; WCAG 1.4.13
 * (dismissible/hoverable/persistent).
 *
 * Markup contract (emitted by sgs/nav-menu render.php at U9), decoupled from BEM:
 *   - the disclosure ROOT carries `data-wp-interactive="sgs/mega"` + a context
 *     `{ isOpen, megaId, intentDelay, closeGrace }` and wraps BOTH the trigger
 *     and the panel (so moving the pointer trigger→panel never leaves the root —
 *     that IS the hover bridge);
 *   - the trigger button carries `[data-sgs-mega-trigger]` + `aria-expanded`;
 *   - the panel carries `[data-sgs-mega-panel]`.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/** Focusable-elements selector — inlined (see file header). */
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** True when the visitor asked the OS to reduce motion. Inlined (see file header). */
function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/** True on a device with a real hover-capable pointer (desktop) — gates hover-intent. */
function canHover() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
	);
}

/** Ordered focusable descendants of a container. Inlined (see file header). */
function getFocusable( container ) {
	if ( ! container ) {
		return [];
	}
	return Array.from( container.querySelectorAll( FOCUSABLE_SELECTOR ) ).filter(
		( el ) => el.offsetParent !== null || el === document.activeElement
	);
}

/**
 * Per-disclosure open-intent / close-grace timers, keyed by megaId. Kept at
 * module scope (not on the reactive context) because a timer handle is not
 * reactive state.
 *
 * @type {Map<string,{open:number|null,close:number|null}>}
 */
const timers = new Map();

/** Get (or create) the timer record for a disclosure. */
function timersFor( megaId ) {
	let rec = timers.get( megaId );
	if ( ! rec ) {
		rec = { open: null, close: null };
		timers.set( megaId, rec );
	}
	return rec;
}

/** Clear any pending open-intent timer for a disclosure. */
function clearOpenTimer( megaId ) {
	const rec = timersFor( megaId );
	if ( rec.open !== null ) {
		window.clearTimeout( rec.open );
		rec.open = null;
	}
}

/** Clear any pending close-grace timer for a disclosure. */
function clearCloseTimer( megaId ) {
	const rec = timersFor( megaId );
	if ( rec.close !== null ) {
		window.clearTimeout( rec.close );
		rec.close = null;
	}
}

/** The disclosure ROOT for the currently-directed element. */
function rootFor( ref ) {
	return ref.closest( '[data-wp-interactive="sgs/mega"]' ) || ref;
}

/**
 * Safe-triangle state (FR-36-4). Kept at module scope, mirroring the
 * `timers` Map above — none of it is reactive state, so it does not belong
 * on the Interactivity context.
 *
 * `activePanelRect` is a snapshot of the currently-open panel's bounding box,
 * refreshed by `repositionPanel()` every time a disclosure opens (reusing
 * that existing measurement rather than taking a second one). `triangleLast`/
 * `triangleCurrent` are the two most recent pointer samples, rAF-throttled so
 * a fast-moving mouse cannot spam this module with dozens of samples a
 * second.
 */
let activePanelRect = null;
let triangleLast = null;
let triangleCurrent = null;
let triangleRaf = null;
let triangleMoveHandler = null;

/** How often a suppressed hover-open re-polls the triangle geometry. */
const TRIANGLE_RECHECK_MS = 60;

/**
 * rAF-throttled `mousemove` sampler — keeps only the last two points.
 *
 * @param {MouseEvent} event The document-level mousemove event.
 */
function onTriangleMove( event ) {
	if ( triangleRaf !== null ) {
		return;
	}
	const point = { x: event.clientX, y: event.clientY };
	triangleRaf = window.requestAnimationFrame( () => {
		triangleRaf = null;
		triangleLast = triangleCurrent;
		triangleCurrent = point;
	} );
}

/**
 * Attach/detach the document-level pointer sampler, gated strictly on
 * whether ANY disclosure is open. Idempotent — safe to call after every
 * `state.openMegaId` mutation so the listener never outlives an open panel
 * (a leaked document-level `mousemove` would be a defect, not a feature).
 */
function syncTriangleWatcher() {
	if ( state.openMegaId && ! triangleMoveHandler ) {
		triangleMoveHandler = onTriangleMove;
		document.addEventListener( 'mousemove', triangleMoveHandler, {
			passive: true,
		} );
	} else if ( ! state.openMegaId && triangleMoveHandler ) {
		document.removeEventListener( 'mousemove', triangleMoveHandler );
		triangleMoveHandler = null;
		if ( triangleRaf !== null ) {
			window.cancelAnimationFrame( triangleRaf );
			triangleRaf = null;
		}
		triangleLast = null;
		triangleCurrent = null;
		activePanelRect = null;
	}
}

/**
 * Signed area helper for the point-in-triangle test below.
 *
 * @param {{x:number,y:number}} p1 First point.
 * @param {{x:number,y:number}} p2 Second point.
 * @param {{x:number,y:number}} p3 Third point.
 */
function triangleSign( p1, p2, p3 ) {
	return (
		( p1.x - p3.x ) * ( p2.y - p3.y ) - ( p2.x - p3.x ) * ( p1.y - p3.y )
	);
}

/**
 * True when point `pt` falls inside triangle `a`-`b`-`c`.
 *
 * @param {{x:number,y:number}} pt The point to test.
 * @param {{x:number,y:number}} a  Triangle vertex one.
 * @param {{x:number,y:number}} b  Triangle vertex two.
 * @param {{x:number,y:number}} c  Triangle vertex three.
 */
function pointInTriangle( pt, a, b, c ) {
	const d1 = triangleSign( pt, a, b );
	const d2 = triangleSign( pt, b, c );
	const d3 = triangleSign( pt, c, a );
	const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
	const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
	return ! ( hasNeg && hasPos );
}

/**
 * True when the pointer's last two samples are heading INTO the currently-
 * open OTHER panel — i.e. the trajectory from `triangleLast` to
 * `triangleCurrent` falls inside the triangle formed with that panel's two
 * top corners (the edge nearest the trigger bar, since panels are anchored
 * below it). False whenever any input is unavailable, which is exactly the
 * "geometry cannot be computed" fallback case — the caller then behaves
 * identically to the pre-existing 170ms bridge.
 *
 * @param {Object} ctx The calling disclosure's Interactivity context.
 */
function isHeadingIntoOpenPanel( ctx ) {
	if ( ! state.openMegaId || state.openMegaId === ctx.megaId ) {
		return false;
	}
	if ( ! activePanelRect || ! triangleLast || ! triangleCurrent ) {
		return false;
	}
	const topLeft = { x: activePanelRect.left, y: activePanelRect.top };
	const topRight = { x: activePanelRect.right, y: activePanelRect.top };
	return pointInTriangle( triangleCurrent, triangleLast, topLeft, topRight );
}

/**
 * Schedule (or re-poll) an intent-delayed open, gated by the safe triangle.
 * Reuses the SAME `rec.open` timer record the pre-existing bridge already
 * used — never a third timer channel. When the geometry says the pointer is
 * heading into another already-open panel, the open is deferred and re-
 * checked every `TRIANGLE_RECHECK_MS`; the moment that stops being true (or
 * no panel is open / no samples exist yet) this opens on the very next tick,
 * so the worst case beyond the declared `delay` is one short poll interval.
 *
 * @param {Object}      ctx   The disclosure's Interactivity context.
 * @param {HTMLElement} root  The disclosure root.
 * @param {number}      delay Milliseconds until the next check/open.
 */
function scheduleIntentOpen( ctx, root, delay ) {
	const rec = timersFor( ctx.megaId );
	rec.open = window.setTimeout( () => {
		rec.open = null;
		if ( isHeadingIntoOpenPanel( ctx ) ) {
			scheduleIntentOpen( ctx, root, TRIANGLE_RECHECK_MS );
			return;
		}
		ctx.isOpen = true;
		state.openMegaId = ctx.megaId;
		syncTriangleWatcher();
		repositionPanel( root );
	}, delay );
}

/**
 * Reposition a panel that overflows the right viewport edge — expressed purely
 * as CSS custom-property VALUES (`--sgs-mm-overflow-left/-right`), never a
 * direct `.style.left/.style.right` assignment (Spec 32 no-inline). style.css
 * reads this pair, so clearing the vars restores the default alignment.
 *
 * TWO KINDS, ONE FUNCTION (2026-07-31). A MEGA panel centres on the viewport;
 * a DROPDOWN aligns to its own trigger. The kind is read from the disclosure
 * root's `data-sgs-nav-disclosure` attribute rather than passed in as an
 * argument, and that is deliberate: this function is called from FIVE separate
 * open paths, and a parameter would have to be set correctly at every one of
 * them or three would centre while two did not. Reading it from the DOM makes
 * the five call sites byte-identical to before and removes the divergence risk
 * entirely — the element itself carries what it is.
 *
 * `activePanelRect` is captured BEFORE either branch and re-captured after the
 * geometry write, on both paths. The safe-triangle (FR-36-4) depends on that
 * snapshot, so a branch that skipped it would silently disable hover-intent
 * rather than fail visibly.
 *
 * @param {HTMLElement} root The disclosure root.
 */
function repositionPanel( root ) {
	const panel = root.querySelector( '[data-sgs-mega-panel]' );
	if ( ! panel ) {
		return;
	}
	panel.style.removeProperty( '--sgs-mm-overflow-left' );
	panel.style.removeProperty( '--sgs-mm-overflow-right' );
	panel.style.removeProperty( '--sgs-mm-tx' );
	window.requestAnimationFrame( () => {
		/*
		 * Centre the panel on the BAR, clamped to the viewport (2026-07-28,
		 * Bean-caught fix). The CSS `left:50% / translateX(-50%)` default
		 * CANNOT do this: every `.sgs-nav-menu__item` is position:relative
		 * (style.css — required so links paint above the indicator pill), so
		 * the wrap's containing block is the ~100px MENU ITEM, the centred
		 * rect always overflows, and the old edge-pin glued the panel to the
		 * item's own left/right edge — visibly off-centre on both live
		 * screenshots. The panel can only ever OPEN with JS (the store flips
		 * aria-expanded), so JS owns the geometry: centre on the bar, clamp
		 * with the draft's 28px gutters, and express the result purely as
		 * CSS-var VALUES relative to the wrap's offsetParent (Spec 32 —
		 * never a direct style.left write).
		 */
		const rect = panel.getBoundingClientRect();
		// Safe-triangle (FR-36-4): reuse this existing measurement as the
		// snapshot other triggers check their pointer trajectory against —
		// no second layout read.
		activePanelRect = rect;
		const parent = panel.offsetParent;
		if ( ! parent ) {
			return;
		}
		const parentRect = parent.getBoundingClientRect();
		const gutter = 28;
		const width = rect.width;

		if ( root.dataset.sgsNavDisclosure === 'dropdown' ) {
			/*
			 * DROPDOWN geometry — aligned to its own TRIGGER, not the viewport.
			 * Fitts's Law: the most-clicked entry should sit nearest the launch
			 * point, so `start` is the default and matches what Bootstrap,
			 * Elementor, GenerateBlocks and Kadence all ship for nav bars.
			 * (Mega panels stay viewport-centred — a deliberate, different
			 * choice for a full-width band, not evidence about dropdowns.)
			 */
			/*
			 * Anchor on the whole MENU ITEM (the disclosure root, which wraps
			 * the link and the toggle together), NOT on `[data-sgs-mega-trigger]`.
			 *
			 * Measured live 2026-07-31: anchoring on the trigger put the panel
			 * 89px right of the item (panel.left 362 vs item.left 273), because
			 * when a parent has its own URL the trigger is the small caret
			 * BUTTON sitting after the link, not the item itself. Visually a
			 * dropdown belongs under its menu entry, which is what every
			 * comparable builder does. Caught only by opening it on a real page
			 * — the markup and every offline check were already green.
			 */
			const anchor = root.getBoundingClientRect();
			const align = root.dataset.sgsNavSubmenuAlign || 'start';
			let desired;
			if ( 'center' === align ) {
				desired = anchor.left + ( anchor.width - width ) / 2;
			} else if ( 'end' === align ) {
				desired = anchor.right - width;
			} else {
				desired = anchor.left;
			}
			/*
			 * Collision handling is ALWAYS ON and structural — never a client
			 * toggle. The operator's alignment is a preference; the framework
			 * overrides it only where the panel would actually be clipped, which
			 * is exactly the right-most "Contact"/"Book Now" case. Same name in
			 * every library: Floating UI flip()+shift(), Radix avoidCollisions
			 * (default true), Popper under Bootstrap. Note Bootstrap disables
			 * Popper INSIDE navbars — we deliberately do not; WordPress core's
			 * Navigation block has no auto-flip either, which is a real gap.
			 */
			const maxLeft = window.innerWidth - gutter - width;
			desired = Math.min( desired, maxLeft );
			desired = Math.max( desired, gutter );
			panel.style.setProperty( '--sgs-mm-tx', '0px' );
			panel.style.setProperty(
				'--sgs-mm-overflow-left',
				`${ ( desired - parentRect.left ).toFixed( 2 ) }px`
			);
			activePanelRect = panel.getBoundingClientRect();
			return;
		}
		/*
		 * Centre on the VIEWPORT, not the bar (Bean's eye, round 2): the bar
		 * shrink-wraps its items and sits wherever the header row puts it, so
		 * bar-centred still produced lopsided side-space (28px vs 292px,
		 * measured, mirrored between the header nav and a page nav). The
		 * drafts centre their 1120px band on the header CONTAINER — visually
		 * the viewport — giving symmetric space; the width clamp
		 * (min(1120px, 100vw − 2×28px)) guarantees the panel still spans
		 * beneath every trigger on the bar.
		 */
		const desired = Math.max( ( window.innerWidth - width ) / 2, gutter );
		panel.style.setProperty( '--sgs-mm-tx', '0px' );
		panel.style.setProperty(
			'--sgs-mm-overflow-left',
			`${ ( desired - parentRect.left ).toFixed( 2 ) }px`
		);
		// Re-snapshot for the safe-triangle now the panel has moved.
		activePanelRect = panel.getBoundingClientRect();
	} );
}

/** Move keyboard focus to the first focusable element inside the open panel. */
function focusFirstInPanel( root ) {
	const panel = root.querySelector( '[data-sgs-mega-panel]' );
	if ( ! panel ) {
		return;
	}
	window.requestAnimationFrame( () => {
		const first = panel.querySelector( FOCUSABLE_SELECTOR );
		if ( first ) {
			first.focus( { preventScroll: prefersReducedMotion() } );
		}
	} );
}

/** Return focus to the disclosure's trigger button. */
function focusTrigger( root ) {
	const trigger = root.querySelector( '[data-sgs-mega-trigger]' );
	if ( trigger ) {
		trigger.focus( { preventScroll: prefersReducedMotion() } );
	}
}

const { state } = store( 'sgs/mega', {
	state: {
		/** The megaId of the single currently-open disclosure, or null. */
		openMegaId: null,
	},
	actions: {
		/** Open this disclosure now (shared by hover-intent, tap and keyboard). */
		open() {
			const ctx = getContext();
			const { ref } = getElement();
			ctx.isOpen = true;
			state.openMegaId = ctx.megaId;
			syncTriangleWatcher();
			repositionPanel( rootFor( ref ) );
		},

		/** Close this disclosure (does not move focus). */
		close() {
			const ctx = getContext();
			ctx.isOpen = false;
			if ( state.openMegaId === ctx.megaId ) {
				state.openMegaId = null;
				syncTriangleWatcher();
			}
		},

		/** Toggle on click/tap. On touch (no hover) this is the sole open path. */
		toggle( event ) {
			if ( event ) {
				event.preventDefault();
			}
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );
			clearOpenTimer( ctx.megaId );
			clearCloseTimer( ctx.megaId );
			if ( ctx.isOpen ) {
				ctx.isOpen = false;
				if ( state.openMegaId === ctx.megaId ) {
					state.openMegaId = null;
					syncTriangleWatcher();
				}
			} else {
				ctx.isOpen = true;
				state.openMegaId = ctx.megaId;
				syncTriangleWatcher();
				repositionPanel( root );
				focusFirstInPanel( root );
			}
		},

		/**
		 * Pointer entered the bridge (trigger OR panel). Cancel any pending
		 * close, and on a hover-capable device schedule an intent-delayed open —
		 * gated by the safe triangle (FR-36-4): if another panel is already
		 * open AND the pointer is currently tracking into it, the open is
		 * deferred and re-polled rather than firing early.
		 */
		enterBridge() {
			const ctx = getContext();
			clearCloseTimer( ctx.megaId );
			if ( ! canHover() || ctx.isOpen ) {
				return;
			}
			const { ref } = getElement();
			const root = rootFor( ref );
			clearOpenTimer( ctx.megaId );
			const delay = Number.isFinite( ctx.intentDelay ) ? ctx.intentDelay : 300;
			scheduleIntentOpen( ctx, root, delay );
		},

		/**
		 * Pointer left the bridge. Cancel any pending open, and schedule a
		 * grace-delayed close so a diagonal trigger→panel path does not slam it
		 * shut (CF-13 — the deterministic 170ms bridge).
		 */
		leaveBridge() {
			const ctx = getContext();
			if ( ! canHover() ) {
				return;
			}
			clearOpenTimer( ctx.megaId );
			const rec = timersFor( ctx.megaId );
			clearCloseTimer( ctx.megaId );
			const grace = Number.isFinite( ctx.closeGrace ) ? ctx.closeGrace : 170;
			rec.close = window.setTimeout( () => {
				rec.close = null;
				ctx.isOpen = false;
				if ( state.openMegaId === ctx.megaId ) {
					state.openMegaId = null;
					syncTriangleWatcher();
				}
			}, grace );
		},

		/** Keyboard on the trigger: Enter/Space toggle, ArrowDown/Down opens. */
		triggerKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );
			const key = event.key;

			if ( key === 'Enter' || key === ' ' || key === 'Spacebar' ) {
				event.preventDefault();
				clearOpenTimer( ctx.megaId );
				clearCloseTimer( ctx.megaId );
				ctx.isOpen = ! ctx.isOpen;
				state.openMegaId = ctx.isOpen ? ctx.megaId : null;
				syncTriangleWatcher();
				if ( ctx.isOpen ) {
					repositionPanel( root );
					focusFirstInPanel( root );
				}
				return;
			}

			if ( key === 'ArrowDown' || key === 'Down' ) {
				event.preventDefault();
				if ( ! ctx.isOpen ) {
					ctx.isOpen = true;
					state.openMegaId = ctx.megaId;
					syncTriangleWatcher();
					repositionPanel( root );
				}
				focusFirstInPanel( root );
				return;
			}

			if ( key === 'Escape' || key === 'Esc' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMegaId = null;
				syncTriangleWatcher();
			}
		},

		/**
		 * Keyboard inside the panel: Escape closes + returns focus; Tab off the
		 * last (or Shift+Tab off the first) focusable closes and returns focus,
		 * so the disclosure never traps (FR-36-10 — NOT a modal).
		 */
		panelKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );

			if ( event.key === 'Escape' || event.key === 'Esc' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMegaId = null;
				syncTriangleWatcher();
				focusTrigger( root );
				return;
			}

			if ( event.key === 'Tab' ) {
				const panel = root.querySelector( '[data-sgs-mega-panel]' );
				const focusables = getFocusable( panel );
				if ( ! focusables.length ) {
					return;
				}
				const isLast = event.target === focusables[ focusables.length - 1 ];
				const isFirst = event.target === focusables[ 0 ];
				if ( ( ! event.shiftKey && isLast ) || ( event.shiftKey && isFirst ) ) {
					ctx.isOpen = false;
					state.openMegaId = null;
					syncTriangleWatcher();
					// Let focus continue naturally to the next/previous element
					// outside the panel; only sync the disclosure state.
				}
			}
		},
	},
	callbacks: {
		/**
		 * Single-open: closes this disclosure whenever its own `isOpen`
		 * disagrees with the shared `state.openMegaId` — originally just
		 * "another disclosure opened", now also covers "nothing is open any
		 * more" (`state.openMegaId === null`), which is exactly the state the
		 * `pageshow`/bfcache reset below produces.
		 */
		watchOpenState() {
			const ctx = getContext();
			if ( ctx.isOpen && state.openMegaId !== ctx.megaId ) {
				ctx.isOpen = false;
				clearOpenTimer( ctx.megaId );
				clearCloseTimer( ctx.megaId );
			}
		},
	},
} );

/**
 * bfcache (`pageshow`) reset — registered ONCE at module scope, never per
 * disclosure instance (a page can host several nav instances; N duplicate
 * listeners would be a leak).
 *
 * The back/forward cache restores the JS heap EXACTLY as it was frozen
 * (web.dev bfcache docs; real breakage recorded in Hyvä's Magento docs), so a
 * mega panel left open when the visitor navigated away would come back open
 * on Back/Forward — nothing errors, it just looks broken. A normal load
 * fires `pageshow` with `event.persisted === false`, so this is a strict
 * no-op on every ordinary page load.
 *
 * Reuses the SAME teardown primitives every other close path already uses
 * (`clearOpenTimer`/`clearCloseTimer`/`syncTriangleWatcher`) rather than a
 * second, parallel cleanup routine. Resetting `state.openMegaId` to null then
 * lets the existing `watchOpenState` callback above close each disclosure's
 * own `ctx.isOpen` on its next reactive tick — exactly the mechanism it
 * already uses when a different disclosure takes over as the open one.
 */
if ( typeof window !== 'undefined' ) {
	window.addEventListener( 'pageshow', ( event ) => {
		if ( ! event.persisted ) {
			return;
		}
		timers.forEach( ( rec, megaId ) => {
			clearOpenTimer( megaId );
			clearCloseTimer( megaId );
		} );
		if ( triangleRaf !== null ) {
			window.cancelAnimationFrame( triangleRaf );
			triangleRaf = null;
		}
		triangleLast = null;
		triangleCurrent = null;
		activePanelRect = null;
		state.openMegaId = null;
		syncTriangleWatcher();
	} );
}
