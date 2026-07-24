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
 * re-enter (CF-13 — the deterministic core; a true geometric safe-triangle is a
 * declared DEFERRED enhancement, FR-36-4); edge-overflow reposition via CSS-var
 * VALUES only (no inline `style=""` declaration, Spec 32); single-open;
 * ESC + focus-return; WCAG 1.4.13 (dismissible/hoverable/persistent).
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
 * Reposition a panel that overflows the right viewport edge — expressed purely
 * as CSS custom-property VALUES (`--sgs-mm-overflow-left/-right`), never a
 * direct `.style.left/.style.right` assignment (Spec 32 no-inline). style.css
 * reads this pair, so clearing the vars restores the default alignment.
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
	window.requestAnimationFrame( () => {
		const rect = panel.getBoundingClientRect();
		if ( rect.right - window.innerWidth > 0 ) {
			panel.style.setProperty( '--sgs-mm-overflow-left', 'auto' );
			panel.style.setProperty( '--sgs-mm-overflow-right', '0' );
		}
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
			repositionPanel( rootFor( ref ) );
		},

		/** Close this disclosure (does not move focus). */
		close() {
			const ctx = getContext();
			ctx.isOpen = false;
			if ( state.openMegaId === ctx.megaId ) {
				state.openMegaId = null;
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
				}
			} else {
				ctx.isOpen = true;
				state.openMegaId = ctx.megaId;
				repositionPanel( root );
				focusFirstInPanel( root );
			}
		},

		/**
		 * Pointer entered the bridge (trigger OR panel). Cancel any pending
		 * close, and on a hover-capable device schedule an intent-delayed open.
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
			const rec = timersFor( ctx.megaId );
			const delay = Number.isFinite( ctx.intentDelay ) ? ctx.intentDelay : 300;
			rec.open = window.setTimeout( () => {
				rec.open = null;
				ctx.isOpen = true;
				state.openMegaId = ctx.megaId;
				repositionPanel( root );
			}, delay );
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
					repositionPanel( root );
				}
				focusFirstInPanel( root );
				return;
			}

			if ( key === 'Escape' || key === 'Esc' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMegaId = null;
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
					// Let focus continue naturally to the next/previous element
					// outside the panel; only sync the disclosure state.
				}
			}
		},
	},
	callbacks: {
		/** Single-open: if another disclosure opened, close this one. */
		watchOpenState() {
			const ctx = getContext();
			if (
				state.openMegaId &&
				state.openMegaId !== ctx.megaId &&
				ctx.isOpen
			) {
				ctx.isOpen = false;
				clearOpenTimer( ctx.megaId );
				clearCloseTimer( ctx.megaId );
			}
		},
	},
} );
